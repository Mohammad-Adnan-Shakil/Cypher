"""
FastAPI backend for the Cypher dashboard. Read-only per the original
spec ("no auth needed, it's personal/local") -- these endpoints serve
data to the frontend, they don't mutate anything. Approve/skip actions
still happen via Telegram, not this API.
"""
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from db.models import get_session, Opportunity, Founder, Outreach, TechUpdate, Hackathon, CypherMemory
from tools.scoring import classify_opportunity_category
import httpx

app = FastAPI(title="Cypher Dashboard API")

@app.get("/")
def root():
    return {"service": "Cypher API", "status": "ok", "docs": "/docs"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cypher-navy.vercel.app", "http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/opportunities")
def get_opportunities():
    """All opportunities, most recent first -- feeds the Kanban board."""
    with get_session() as session:
        opps = session.execute(
            select(Opportunity).order_by(Opportunity.found_at.desc())
        ).scalars().all()
        return [
            {
                "id": o.id, "company": o.company, "role_type": o.role_type,
                "url": o.url, "fit_score": o.fit_score, "fit_reasoning": o.fit_reasoning,
                "status": o.status, "user_feedback": o.user_feedback,
                "found_at": o.found_at.isoformat() if o.found_at else None,
            }
            for o in opps
        ]


@app.get("/api/outreach")
def get_outreach():
    """All outreach records with joined founder/opportunity info -- feeds the Outreach Tracker table."""
    with get_session() as session:
        rows = session.execute(select(Outreach).order_by(Outreach.email_sent_at.desc().nullslast())).scalars().all()
        result = []
        for o in rows:
            founder = session.get(Founder, o.founder_id) if o.founder_id else None
            opp = session.get(Opportunity, o.opportunity_id) if o.opportunity_id else None
            days_since_sent = None
            if o.email_sent_at:
                days_since_sent = (datetime.now(timezone.utc) - o.email_sent_at).days
            result.append({
                "id": o.id,
                "company": opp.company if opp else None,
                "founder_name": founder.name if founder else None,
                "email_to": o.email_to,
                "email_sent_at": o.email_sent_at.isoformat() if o.email_sent_at else None,
                "reply_received": o.reply_received,
                "reply_content": o.reply_content,
                "outcome": o.outcome,
                "days_since_sent": days_since_sent,
                "stale": days_since_sent is not None and days_since_sent > 7 and not o.reply_received,
            })
        return result


@app.get("/api/hackathons")
def get_hackathons():
    """All persisted hackathons, most recent first."""
    with get_session() as session:
        rows = session.execute(select(Hackathon).order_by(Hackathon.found_at.desc())).scalars().all()
        return [
            {
                "id": h.id, "title": h.title, "url": h.url,
                "relevance_score": h.relevance_score, "deadline": h.deadline,
                "eligibility_reason": h.eligibility_reason, "status": h.status,
                "found_at": h.found_at.isoformat() if h.found_at else None,
            }
            for h in rows
        ]


@app.get("/api/tech-updates")
def get_tech_updates():
    """All tech pulse items, most recent first."""
    with get_session() as session:
        rows = session.execute(select(TechUpdate).order_by(TechUpdate.found_at.desc())).scalars().all()
        return [
            {
                "id": t.id, "title": t.title, "url": t.url, "summary": t.summary,
                "relevance_score": t.relevance_score,
                "found_at": t.found_at.isoformat() if t.found_at else None,
            }
            for t in rows
        ]


@app.get("/api/memory")
def get_memory():
    """cypher_memory singleton -- feeds the Memory View page."""
    with get_session() as session:
        mem = session.execute(select(CypherMemory)).scalar_one_or_none()
        if mem is None:
            return {"preference_patterns": {}, "learned_weights": {}, "reply_rate_by_type": {}}
        return {
            "preference_patterns": mem.preference_patterns,
            "learned_weights": mem.learned_weights,
            "reply_rate_by_type": mem.reply_rate_by_type,
            "last_updated": mem.last_updated.isoformat() if mem.last_updated else None,
        }


@app.get("/api/stats")
def get_stats():
    """Aggregate stats -- feeds the Stats Dashboard page."""
    with get_session() as session:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        total_opps = session.execute(select(func.count(Opportunity.id))).scalar()
        opps_week = session.execute(
            select(func.count(Opportunity.id)).where(Opportunity.found_at >= seven_days_ago)
        ).scalar()
        opps_month = session.execute(
            select(func.count(Opportunity.id)).where(Opportunity.found_at >= thirty_days_ago)
        ).scalar()

        emails_sent = session.execute(
            select(func.count(Outreach.id)).where(Outreach.email_sent_at.isnot(None))
        ).scalar()
        emails_replied = session.execute(
            select(func.count(Outreach.id)).where(Outreach.reply_received == True)
        ).scalar()
        reply_rate = round((emails_replied / emails_sent * 100), 1) if emails_sent else 0.0

        avg_fit_score = session.execute(
            select(func.avg(Opportunity.fit_score)).where(Opportunity.fit_score.isnot(None))
        ).scalar()

        by_source = session.execute(
            select(Opportunity.source, func.count(Opportunity.id)).group_by(Opportunity.source)
        ).all()

        return {
            "total_opportunities": total_opps or 0,
            "opportunities_this_week": opps_week or 0,
            "opportunities_this_month": opps_month or 0,
            "emails_sent": emails_sent or 0,
            "emails_replied": emails_replied or 0,
            "reply_rate_percent": reply_rate,
            "average_fit_score": round(float(avg_fit_score), 2) if avg_fit_score else None,
            "opportunities_by_source": {source: count for source, count in by_source},
        }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


TELEGRAM_API = f"https://api.telegram.org/bot{__import__('config').settings.telegram_bot_token}"


def _send_telegram_message(text: str):
    httpx.post(f"{TELEGRAM_API}/sendMessage", json={
        "chat_id": __import__('config').settings.telegram_chat_id,
        "text": text,
    }, timeout=15)


@app.post("/telegram/webhook")
async def telegram_webhook(request: dict):
    import re

    message = request.get("message", {})
    text = (message.get("text") or "").strip()

    match = re.match(r"^(send|skip)\s+(\d+)$", text, re.IGNORECASE)
    if not match:
        return {"ok": True}

    action, index_str = match.groups()
    index = int(index_str)

    with get_session() as session:
        opps = session.execute(
            select(Opportunity).order_by(Opportunity.found_at.desc())
        ).scalars().all()

        if index < 1 or index > len(opps):
            _send_telegram_message(f"No opportunity #{index} in the last digest.")
            return {"ok": True}

        opp = opps[index - 1]

        if action.lower() == "send":
            opp.user_feedback = "approved"
            outreach = session.query(Outreach).filter(Outreach.opportunity_id == opp.id).first()
            founder = session.query(Founder).filter(Founder.opportunity_id == opp.id).first()

            category = classify_opportunity_category(opp.company or "", opp.role_type or "", opp.description or "")

            if outreach is None:
                opp.status = "drafted"
                _send_telegram_message(f"#{index} approved, but no draft found to send.")
            elif not founder or not founder.email:
                opp.status = "drafted"
                _send_telegram_message(
                    f"#{index} ({opp.company}) approved, but no verified email address "
                    f"on file for the founder — can't send automatically."
                )
            else:
                from tools.gmail import send_email
                try:
                    result = send_email(to=founder.email, subject=f"Re: {opp.role_type or 'your posting'}", body=outreach.email_draft)
                    outreach.gmail_thread_id = result["thread_id"]
                    outreach.email_sent_at = datetime.now(timezone.utc)
                    outreach.email_to = founder.email
                    opp.status = "sent"
                    _send_telegram_message(f"#{index} ({opp.company}) sent to {founder.email}.")
                except Exception as e:
                    opp.status = "drafted"
                    _send_telegram_message(f"#{index} approve recorded, but send failed: {e}")
        else:
            opp.status = "ignored"
            opp.user_feedback = "skipped"
            category = classify_opportunity_category(opp.company or "", opp.role_type or "", opp.description or "")
            _send_telegram_message(f"Got it — #{index} ({opp.company}) marked as skipped.")

        session.commit()

    from db.memory import update_feedback_pattern
    update_feedback_pattern(category, "approved" if action.lower() == "send" else "skipped")

    return {"ok": True}