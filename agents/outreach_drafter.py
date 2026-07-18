"""
Outreach Drafter — for a researched Opportunity + its Founder, drafts
a personalized email and saves it to the outreach table.
"""
from db.models import get_session, Opportunity, Founder, Outreach
from tools.drafting import draft_email, validate_email


def draft_outreach(opportunity_id: int) -> dict:
    """
    Runs the full drafting pipeline for one opportunity.
    Requires the opportunity to already have a linked Founder
    (i.e. research_founder() must have run first).
    """
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if opp is None:
            return {"error": f"No opportunity with id={opportunity_id}"}

        founder = (
            session.query(Founder)
            .filter(Founder.opportunity_id == opportunity_id)
            .first()
        )
        if founder is None:
            return {"error": f"No founder researched yet for opportunity_id={opportunity_id}"}

        company = opp.company or "the company"
        founder_name = founder.name
        role_type = opp.role_type
        description = opp.description or ""
        research_notes = founder.recent_activity or ""

    email_text = draft_email(
        company=company,
        founder_name=founder_name,
        role_type=role_type,
        opportunity_description=description,
        company_research=research_notes,
    )
    validation = validate_email(email_text)

    with get_session() as session:
        outreach = Outreach(
            opportunity_id=opportunity_id,
            founder_id=founder.id,
            email_draft=email_text,
            email_to=None,  # real email address not resolved yet — Phase 6 territory
            outcome="no_reply",
        )
        session.add(outreach)
        session.commit()
        session.refresh(outreach)
        outreach_id = outreach.id

        opp = session.get(Opportunity, opportunity_id)
        opp.status = "drafted"
        session.commit()

    return {
        "outreach_id": outreach_id,
        "looks_generic": validation["looks_generic"],
        "word_count": validation["word_count"],
    }