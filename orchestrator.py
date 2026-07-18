"""
Main orchestrator — runs the full daily Cypher pipeline as a LangGraph
sequential graph.

Sequence: Scout -> auto-research/draft (score >= AUTO_DRAFT_THRESHOLD)
-> Tech Pulse -> Hackathon Scout -> compile & send one morning brief.

NOTE: Reply Tracker (checking overnight replies) is NOT wired in here
yet — check_email_inbox()/classify_reply() exist as tools but there's
no automated "do something when a reply arrives" logic built. This
graph covers discovery + drafting + notification only.
"""
from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from agents.opportunity_scout import run_scout, run_hackathon_scout
from agents.founder_researcher import research_founder
from agents.outreach_drafter import draft_outreach
from agents.tech_pulse import run_tech_pulse
from delivery.telegram_bot import send_morning_brief
from db.models import get_session, Opportunity, TechUpdate
from sqlalchemy import select

AUTO_DRAFT_THRESHOLD = 8


class CypherState(TypedDict):
    scout_summary: dict
    hackathons: list
    tech_pulse_summary: dict
    drafted_ids: list


def node_scout(state: CypherState) -> dict:
    summary = run_scout(limit=15, min_fit_score=6)  # capped for testing
    print(f"[Scout] scraped={summary['scraped']} inserted={summary['inserted']}")
    return {"scout_summary": summary}


def node_auto_research_and_draft(state: CypherState) -> dict:
    """
    For any NEW opportunity scoring >= AUTO_DRAFT_THRESHOLD, automatically
    runs research_founder() then draft_outreach() so a draft is ready
    for review same-day, without manual triggering.
    """
    with get_session() as session:
        high_scorers = session.execute(
            select(Opportunity).where(
                Opportunity.status == "new",
                Opportunity.fit_score >= AUTO_DRAFT_THRESHOLD,
            )
        ).scalars().all()
        ids = [o.id for o in high_scorers]

    drafted = []
    for opp_id in ids:
        try:
            research_founder(opp_id)
            draft_outreach(opp_id)
            drafted.append(opp_id)
        except Exception as e:
            print(f"[AutoDraft] failed for opportunity {opp_id}: {e}")

    print(f"[AutoDraft] {len(drafted)}/{len(ids)} opportunities researched+drafted")
    return {"drafted_ids": drafted}


def node_tech_pulse(state: CypherState) -> dict:
    summary = run_tech_pulse(hn_limit=10, news_limit=5)
    print(f"[TechPulse] raw={summary['raw_items']} saved={summary['saved']}")
    return {"tech_pulse_summary": summary}


def node_hackathons(state: CypherState) -> dict:
    result = run_hackathon_scout(limit=8, min_relevance=5)
    print(f"[Hackathons] found={result['total_found']} eligible={result['eligible_count']}")
    return {"hackathons": result["hackathons"]}


def node_compile_and_send(state: CypherState) -> dict:
    with get_session() as session:
        # Only today's NEW opportunities go in the brief -- not the
        # entire historical table, which would grow unbounded over time
        opps = session.execute(
            select(Opportunity).where(Opportunity.status.in_(["new", "researched", "drafted"]))
        ).scalars().all()
        tech = session.execute(select(TechUpdate)).scalars().all()

    success = send_morning_brief(opps, tech, state.get("hackathons", []))
    print(f"[Digest] sent={success}")
    return {}


def build_graph():
    graph = StateGraph(CypherState)
    graph.add_node("scout", node_scout)
    graph.add_node("auto_draft", node_auto_research_and_draft)
    graph.add_node("tech_pulse", node_tech_pulse)
    graph.add_node("hackathons", node_hackathons)
    graph.add_node("compile_and_send", node_compile_and_send)

    graph.add_edge(START, "scout")
    graph.add_edge("scout", "auto_draft")
    graph.add_edge("auto_draft", "tech_pulse")
    graph.add_edge("tech_pulse", "hackathons")
    graph.add_edge("hackathons", "compile_and_send")
    graph.add_edge("compile_and_send", END)

    return graph.compile()


def run_daily_pipeline():
    app = build_graph()
    initial_state: CypherState = {
        "scout_summary": {}, "hackathons": [], "tech_pulse_summary": {}, "drafted_ids": [],
    }
    final_state = app.invoke(initial_state)
    print("\n--- Pipeline complete ---")
    return final_state