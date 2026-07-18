"""
Cypher's brain — SQLAlchemy 2.0 models for all 5 tables.

SCHEMA IS FIXED as of Step 3. Do not alter table structure mid-build —
if a later phase needs a new field, add it via Alembic migration, not
by editing these classes directly once agents depend on them.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    create_engine,
    ForeignKey,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)

from config import settings


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Opportunity(Base):
    __tablename__ = "opportunities"
    __table_args__ = (
        UniqueConstraint("url", name="uq_opportunities_url"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String(500))
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    fit_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fit_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="new")
    user_feedback: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    founders: Mapped[list["Founder"]] = relationship(back_populates="opportunity")
    outreach: Mapped[list["Outreach"]] = relationship(back_populates="opportunity")


class Founder(Base):
    __tablename__ = "founders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("opportunities.id"))

    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    email_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    company_stage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    funding_amount: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tech_stack: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recent_activity: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    researched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    opportunity: Mapped["Opportunity"] = relationship(back_populates="founders")
    outreach: Mapped[list["Outreach"]] = relationship(back_populates="founder")


class Outreach(Base):
    __tablename__ = "outreach"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("opportunities.id"))
    founder_id: Mapped[int] = mapped_column(ForeignKey("founders.id"))

    email_draft: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    email_to: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    gmail_thread_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    reply_received: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reply_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    outcome: Mapped[Optional[str]] = mapped_column(String(30), default="no_reply")

    opportunity: Mapped["Opportunity"] = relationship(back_populates="outreach")
    founder: Mapped["Founder"] = relationship(back_populates="outreach")


class TechUpdate(Base):
    __tablename__ = "tech_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(300))
    url: Mapped[str] = mapped_column(String(500))
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    relevance_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CypherMemory(Base):
    __tablename__ = "cypher_memory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    preference_patterns: Mapped[dict] = mapped_column(JSON, default=dict)
    learned_weights: Mapped[dict] = mapped_column(JSON, default=dict)
    reply_rate_by_type: Mapped[dict] = mapped_column(JSON, default=dict)

    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    """Create all tables if they don't exist. Safe to call repeatedly."""
    Base.metadata.create_all(engine)


def get_session():
    """Returns a new Session — use as: with get_session() as s: ..."""
    return SessionLocal()