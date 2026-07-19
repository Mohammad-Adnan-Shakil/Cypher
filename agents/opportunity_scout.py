"""
Opportunity Scout — orchestrates scrape -> dedup -> score -> persist
for job postings, plus a separate hackathon discovery pipeline.
"""
from db.models import get_session, Opportunity
from db.memory import is_duplicate
from tools.scrapers import search_hackernews_jobs
from tools.scoring import score_opportunities_batch, classify_hackathons_batch
from tools.search import search_hackathons

STACK_CONTEXT = "Python, FastAPI, AWS Lambda, PostgreSQL, LangGraph, Google ADK, XGBoost, React, Spring Boot"


def run_scout(limit: int | None = None, min_fit_score: int = 6) -> dict:
    """
    Runs the full Scout pipeline once: scrape -> dedup -> batch-score -> persist.

    limit: cap on how many scraped postings to process (None = all).
    min_fit_score: only postings scoring >= this get inserted into DB.
    """
    postings = search_hackernews_jobs()
    if limit is not None:
        postings = postings[:limit]

    summary = {
        "scraped": len(postings),
        "skipped_duplicate": 0,
        "scored_below_threshold": 0,
        "scoring_errors": 0,
        "inserted": 0,
        "inserted_opportunities": [],
    }

    # Dedup BEFORE scoring -- no point spending tokens scoring postings
    # we're going to throw away anyway
    new_postings = []
    for posting in postings:
        if is_duplicate(posting["url"]):
            summary["skipped_duplicate"] += 1
        else:
            new_postings.append(posting)

    if not new_postings:
        return summary

    score_results = score_opportunities_batch(new_postings, batch_size=15)

    with get_session() as session:
        for posting, score_result in zip(new_postings, score_results):
            if score_result["fit_score"] is None:
                summary["scoring_errors"] += 1
                continue

            if score_result["fit_score"] < min_fit_score:
                summary["scored_below_threshold"] += 1
                continue

            opp = Opportunity(
                source=posting["source"],
                title=posting["title"],
                company=posting["company"],
                role_type=posting["role_type"],
                description=posting["description"],
                url=posting["url"],
                found_at=posting["found_at"],
                fit_score=score_result["fit_score"],
                fit_reasoning=score_result["fit_reasoning"],
                status="new",
            )
            session.add(opp)
            summary["inserted"] += 1
            summary["inserted_opportunities"].append(
                f"[{score_result['fit_score']}] {posting['company']} — {posting['role_type']}"
            )

        session.commit()

    return summary


def run_hackathon_scout(limit: int = 8, min_relevance: int = 5) -> dict:
    """
    Finds currently-open hackathons matching Adnan's location/stack rules.
    Uses batched classification -- one Groq call for all candidates
    instead of one per candidate (fixes TPM limit hit during first
    real GitHub Actions run, see classify_hackathons_batch()).
    """
    results = search_hackathons(max_results=limit)

    candidates = [
        {"title": r["title"], "content": r.get("raw_content") or r.get("content", "")}
        for r in results
    ]
    verdicts = classify_hackathons_batch(candidates, STACK_CONTEXT)

    eligible = []
    for r, verdict in zip(results, verdicts):
        if verdict["eligible"] and verdict["stack_relevance_score"] >= min_relevance:
            eligible.append({
                "title": r["title"],
                "url": r["url"],
                "relevance_score": verdict["stack_relevance_score"],
                "deadline": verdict["deadline_found"],
            })

    eligible.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {"total_found": len(results), "eligible_count": len(eligible), "hackathons": eligible}