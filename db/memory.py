"""
Helpers for reading/writing cypher_memory (the feedback loop) and
checking for duplicate opportunities before insert.

Agents import from here rather than touching CypherMemory/Opportunity
rows directly — keeps "how memory updates" logic in one place.
"""
import copy

from sqlalchemy import select

from db.models import get_session, CypherMemory, Opportunity


def get_memory() -> CypherMemory:
    """
    Returns the single CypherMemory row, creating it with empty
    defaults on first call. There is only ever one row in this table —
    it's a singleton representing Cypher's current learned state.
    """
    with get_session() as session:
        memory = session.execute(select(CypherMemory)).scalar_one_or_none()
        if memory is None:
            memory = CypherMemory(
                preference_patterns={},
                learned_weights={},
                reply_rate_by_type={},
            )
            session.add(memory)
            session.commit()
            session.refresh(memory)
        return memory


def update_feedback_pattern(category: str, decision: str) -> None:
    """
    Called when the user approves/skips/ignores on Telegram.
    category: e.g. "bengaluru_ai_startup_under_20"
    decision: "approved" | "skipped" | "ignored"
    """
    with get_session() as session:
        memory = session.execute(select(CypherMemory)).scalar_one_or_none()
        if memory is None:
            memory = CypherMemory(preference_patterns={}, learned_weights={}, reply_rate_by_type={})
            session.add(memory)

        # NOTE: must be a deep copy, not dict(). A shallow copy shares
        # the nested bucket dict with the object SQLAlchemy is already
        # tracking — mutating it in place before reassignment makes
        # old/new look identical to dirty-checking, so the UPDATE
        # silently never fires and your approvals stop counting past 1.
        patterns = copy.deepcopy(memory.preference_patterns or {})
        bucket = patterns.setdefault(category, {"approved": 0, "skipped": 0, "ignored": 0})
        bucket[decision] = bucket.get(decision, 0) + 1
        memory.preference_patterns = patterns

        session.commit()


def is_duplicate(url: str) -> bool:
    """
    Dedup check for Opportunity Scout (used by check_duplicate() tool, Step 7).
    Checks by exact URL match — the DB-level UniqueConstraint on
    opportunities.url is the hard backstop if this is ever bypassed.
    """
    with get_session() as session:
        existing = session.execute(
            select(Opportunity.id).where(Opportunity.url == url)
        ).scalar_one_or_none()
        return existing is not None