"""
Reply Tracker — checks all sent outreach threads for replies,
classifies them, updates the DB, and alerts via Telegram.
"""
from db.models import get_session, Outreach
from tools.gmail import check_thread_for_reply, classify_reply
from delivery.telegram_bot import send_message
from sqlalchemy import select
from datetime import datetime, timezone


def run_reply_tracker() -> dict:
    """
    Checks every Outreach row that has a gmail_thread_id and hasn't
    already been marked as replied. For any new reply found,
    classifies it, updates the DB, and sends a Telegram alert.
    """
    with get_session() as session:
        pending = session.execute(
            select(Outreach).where(
                Outreach.gmail_thread_id.isnot(None),
                Outreach.reply_received == False,
            )
        ).scalars().all()
        # capture what we need before the session closes
        pending_data = [(o.id, o.gmail_thread_id) for o in pending]

    summary = {"checked": len(pending_data), "new_replies": 0}

    for outreach_id, thread_id in pending_data:
        reply = check_thread_for_reply(thread_id)
        if reply is None:
            continue  # no reply yet

        classification = classify_reply(reply["content"])

        with get_session() as session:
            outreach = session.get(Outreach, outreach_id)
            outreach.reply_received = True
            outreach.reply_content = reply["content"][:2000]
            outreach.reply_at = datetime.now(timezone.utc)

            outcome_map = {
                "positive": "positive",
                "negative": "negative",
                "meeting_request": "meeting_booked",
            }
            outreach.outcome = outcome_map.get(classification.get("classification"), "positive")
            company = outreach.opportunity.company if outreach.opportunity else "Unknown"
            session.commit()

        summary["new_replies"] += 1
        send_message(
            f"Reply received! {company}\n"
            f"From: {reply['from']}\n"
            f"Classification: {classification.get('classification')}\n\n"
            f"{reply['content'][:500]}"
        )

    return summary