"""
Tech Pulse — pulls HN top stories + AI/India startup news, filters
for relevance to Adnan's stack, saves to tech_updates table.
"""
from datetime import datetime, timezone

from db.models import get_session, TechUpdate
from tools.scrapers import fetch_hackernews_top
from tools.search import search_ai_news, search_india_startup_news
from tools.scoring import summarize_and_filter

STACK_CONTEXT = "Python, FastAPI, AWS Lambda, PostgreSQL, LangGraph, Google ADK, XGBoost, React, Spring Boot"


def run_tech_pulse(hn_limit: int = 10, news_limit: int = 5) -> dict:
    """
    Runs the full Tech Pulse pipeline once. Returns summary dict,
    persists filtered items to tech_updates table.
    """
    hn_stories = fetch_hackernews_top(limit=hn_limit)
    ai_news = search_ai_news(max_results=news_limit)
    india_news = search_india_startup_news(max_results=news_limit)

    # Tag source before merging, since summarize_and_filter() doesn't
    # track where an item came from
    for item in hn_stories:
        item["_source"] = "hackernews"
    for item in ai_news:
        item["_source"] = "ai_news"
    for item in india_news:
        item["_source"] = "india_startup_news"

    all_items = hn_stories + ai_news + india_news
    filtered = summarize_and_filter(all_items, STACK_CONTEXT)

    # Re-attach source (summarize_and_filter returns new dicts without it)
    # by matching on title, since that's preserved through the pipeline
    source_by_title = {item["title"]: item.get("_source", "unknown") for item in all_items}

    summary = {"raw_items": len(all_items), "saved": 0}

    with get_session() as session:
        for f in filtered:
            update = TechUpdate(
                source=source_by_title.get(f["title"], "unknown"),
                title=f["title"][:300],
                url=f["url"][:500],
                summary=f["summary"],
                relevance_score=f["relevance_score"],
                found_at=datetime.now(timezone.utc),
            )
            session.add(update)
            summary["saved"] += 1
        session.commit()

    return summary