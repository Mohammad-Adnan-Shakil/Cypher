"""
Telegram delivery — sends Cypher's daily digest and alerts.

NOTE: This module only SENDS messages. Listening for your replies
("send 1", "skip 2") is a separate piece (Step 12/13) that needs a
running listener process, not just an HTTP POST — building that next
once basic sending is confirmed working.
"""
import httpx

from config import settings

TELEGRAM_API = f"https://api.telegram.org/bot{settings.telegram_bot_token}"


def send_message(text: str) -> bool:
    """
    Sends a raw text message to your configured chat.
    Returns True on success, False on failure (logs the error either way).
    """
    resp = httpx.post(
        f"{TELEGRAM_API}/sendMessage",
        json={
            "chat_id": settings.telegram_chat_id,
            "text": text,
        },
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"Telegram send failed: {resp.status_code} | {resp.text}")
        return False
    return True


def format_digest(opportunities: list) -> str:
    """
    Formats a list of Opportunity ORM objects (or dicts with the same
    fields) into a readable Telegram digest message.
    """
    if not opportunities:
        return "CYPHER DAILY DIGEST\n\nNo new opportunities today."

    lines = ["CYPHER DAILY DIGEST\n"]
    for i, opp in enumerate(opportunities, start=1):
        lines.append(
            f"{i}. [{opp.fit_score}/10] {opp.company or 'Unknown'}\n"
            f"_{opp.role_type or 'Role unclear'}_\n"
            f"{opp.fit_reasoning}\n"
            f"{opp.url}\n"
        )

    lines.append("\nReply `send <number>` to approve outreach, or `skip <number>` to pass.")
    return "\n".join(lines)


def send_digest(opportunities: list) -> bool:
    """Formats and sends today's opportunity digest."""
    message = format_digest(opportunities)
    return send_message(message)


"""
Below: the listener half of this module. Sending (above) is a single
HTTP POST. Listening requires a running process that polls Telegram
for new messages — this is what Step 22 (orchestrator) will eventually
run continuously; for now we test it as a standalone script that runs
until you Ctrl+C.
"""
import re

from telegram import Update
from telegram.ext import Application, MessageHandler, ContextTypes, filters

from db.models import get_session, Opportunity
from db.memory import update_feedback_pattern

REPLY_PATTERN = re.compile(r"^(send|skip)\s+(\d+)$", re.IGNORECASE)


async def handle_reply(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles 'send <n>' / 'skip <n>' replies. <n> is the 1-indexed
    position from the last digest, NOT the DB id — matches what the
    digest message actually shows the user.
    """
    text = (update.message.text or "").strip()
    match = REPLY_PATTERN.match(text)

    if not match:
        await update.message.reply_text(
            "Didn't recognize that. Reply like: `send 1` or `skip 1`"
        )
        return

    action, index_str = match.groups()
    index = int(index_str)

    with get_session() as session:
        # Same ordering as format_digest() used (most recent first) —
        # if this ever drifts out of sync with format_digest()'s query,
        # "send 1" could approve the wrong row. Keep these consistent.
        opps = session.execute(
            __import__("sqlalchemy").select(Opportunity).order_by(Opportunity.found_at.desc())
        ).scalars().all()

        if index < 1 or index > len(opps):
            await update.message.reply_text(f"No opportunity #{index} in the last digest.")
            return

        opp = opps[index - 1]

        if action.lower() == "send":
            opp.user_feedback = "approved"

            from db.models import Outreach, Founder
            outreach = session.query(Outreach).filter(Outreach.opportunity_id == opp.id).first()
            founder = session.query(Founder).filter(Founder.opportunity_id == opp.id).first()

            if outreach is None:
                await update.message.reply_text(f"#{index} approved, but no draft found to send.")
                opp.status = "drafted"
            elif not founder or not founder.email:
                # No real email on file — mark ready but don't send.
                # This is the honest state given Step 11's limitation:
                # we only ever GUESS email formats, never verify a real address.
                opp.status = "drafted"
                await update.message.reply_text(
                    f"#{index} ({opp.company}) approved, but no verified email address "
                    f"on file for the founder — can't send automatically. "
                    f"Marked as drafted; send manually if you have their real email."
                )
            else:
                from tools.gmail import send_email
                from datetime import datetime, timezone

                try:
                    result = send_email(
                        to=founder.email,
                        subject=f"Re: {opp.role_type or 'your posting'}",
                        body=outreach.email_draft,
                    )
                    outreach.gmail_thread_id = result["thread_id"]
                    outreach.email_sent_at = datetime.now(timezone.utc)
                    outreach.email_to = founder.email
                    opp.status = "sent"
                    await update.message.reply_text(f"#{index} ({opp.company}) sent to {founder.email}.")
                except Exception as e:
                    opp.status = "drafted"
                    await update.message.reply_text(f"#{index} approve recorded, but send failed: {e}")
        else:
            opp.status = "ignored"
            opp.user_feedback = "skipped"

        category = opp.role_type or "uncategorized"
        session.commit()

    update_feedback_pattern(category, "approved" if action.lower() == "send" else "skipped")

    await update.message.reply_text(
        f"Got it — #{index} ({opp.company}) marked as {'approved' if action.lower() == 'send' else 'skipped'}."
    )


def run_listener() -> None:
    """Starts polling for replies. Blocks until Ctrl+C."""
    app = Application.builder().token(__import__("config").settings.telegram_bot_token).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_reply))
    print("Listening for Telegram replies... (Ctrl+C to stop)")
    app.run_polling()


def format_draft_review(opportunity, outreach) -> str:
    """
    Formats a single drafted email for review before sending.
    Separate from format_digest() since this shows the FULL email
    body, not a summary — you need to actually read it before approving.
    """
    return (
        f"DRAFT READY FOR REVIEW\n\n"
        f"{opportunity.company} — {opportunity.role_type or 'role unclear'}\n"
        f"Fit score: {opportunity.fit_score}/10\n\n"
        f"---\n"
        f"{outreach.email_draft}\n"
        f"---\n\n"
        f"Reply `approve {opportunity.id}` to mark ready-to-send, "
        f"or `reject {opportunity.id}` to discard this draft."
    )


def send_draft_review(opportunity, outreach) -> bool:
    """Sends a single draft for review."""
    message = format_draft_review(opportunity, outreach)
    return send_message(message)

def format_tech_pulse(tech_updates: list) -> str:
    """Formats tech_updates (from run_tech_pulse) for Telegram."""
    if not tech_updates:
        return ""
    lines = ["TECH PULSE\n"]
    for u in tech_updates:
        lines.append(f"[{u.relevance_score}/10] {u.title}\n{u.summary}\n{u.url}\n")
    return "\n".join(lines)


def format_hackathons(hackathons: list) -> str:
    """Formats hackathon dicts (from run_hackathon_scout) for Telegram."""
    if not hackathons:
        return ""
    lines = ["HACKATHONS\n"]
    for h in hackathons:
        lines.append(f"[{h['relevance_score']}/10] {h['title']}\ndeadline: {h['deadline']}\n{h['url']}\n")
    return "\n".join(lines)


def send_morning_brief(opportunities: list, tech_updates: list, hackathons: list) -> bool:
    """
    Sends one compiled message combining all three categories —
    this is the actual "Today's Brief" your spec describes, versus
    the separate pings we've been testing individually.
    """
    sections = [format_digest(opportunities)]

    tech_section = format_tech_pulse(tech_updates)
    if tech_section:
        sections.append(tech_section)

    hack_section = format_hackathons(hackathons)
    if hack_section:
        sections.append(hack_section)

    full_message = "\n\n".join(sections)
    return send_message(full_message)