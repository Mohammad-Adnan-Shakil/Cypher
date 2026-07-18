"""
Founder Researcher — for a given Opportunity, finds the founder,
researches the company, guesses email format, and saves a Founder
record linked back to that opportunity.
"""
from db.models import get_session, Founder, Opportunity
from tools.search import find_founder, get_company_info, find_email_format


def research_founder(opportunity_id: int) -> dict:
    """
    Runs the full research pipeline for one opportunity.
    Returns a summary dict; also persists a Founder row to DB.
    """
    with get_session() as session:
        opp = session.get(Opportunity, opportunity_id)
        if opp is None:
            return {"error": f"No opportunity with id={opportunity_id}"}

        company = opp.company or "unknown company"

    founder_result = find_founder(company)
    company_info = get_company_info(company)

    # Best-effort domain guess for email format — real domain lookup
    # would need a company-info API; this is a placeholder heuristic
    # until Phase 5 needs something more precise.
    guessed_domain = f"{company.lower().replace(' ', '')}.com"
    email_guess = find_email_format(guessed_domain)

    with get_session() as session:
        founder = Founder(
            opportunity_id=opportunity_id,
            name=founder_result["name"] if founder_result else None,
            linkedin_url=founder_result["linkedin_url"] if founder_result else None,
            email=None,  # we only have a format guess, not an actual address yet
            email_confidence=email_guess["confidence"],
            company_stage=None,  # left for manual read of raw_findings for now
            tech_stack=None,
            recent_activity=company_info["raw_findings"][:2000],
        )
        session.add(founder)
        session.commit()
        session.refresh(founder)

        # Update opportunity status now that research is done
        opp = session.get(Opportunity, opportunity_id)
        opp.status = "researched"
        session.commit()

        founder_id = founder.id

    return {
        "founder_id": founder_id,
        "founder_name": founder_result["name"] if founder_result else None,
        "linkedin_url": founder_result["linkedin_url"] if founder_result else None,
        "email_confidence": email_guess["confidence"],
    }