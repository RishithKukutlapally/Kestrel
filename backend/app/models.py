"""ORM models.

The document tracker tables (applications, document_items, reminders, analyst_requests)
hold current state. Every change to them is written in the same transaction as an
immutable row in `events`, which is the source for the timeline, queue ageing and
metrics. There is deliberately no credit data anywhere in this schema: no loan
amounts, limits, scores, turnover, account numbers, PAN, Aadhaar or GSTIN.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class UTCDateTime(TypeDecorator[datetime]):
    """Timezone-aware UTC datetimes on both SQLite (which drops tzinfo) and Postgres."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime not allowed")
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


ROLES = ("rm", "coordinator", "analyst", "credit_manager", "cro", "agent_owner", "finance")


class Staff(Base):
    """Fictitious staff members. Each has their own sign-in (username + hashed password)."""

    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(120))
    username: Mapped[str | None] = mapped_column(String(40), nullable=True)
    __table_args__ = (UniqueConstraint("username", name="uq_staff_username"),)
    password_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)


class ChecklistRule(Base):
    """Versioned rule table, owned by Credit. Generates required documents per application."""

    __tablename__ = "checklist_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version: Mapped[int] = mapped_column(Integer)
    product: Mapped[str] = mapped_column(String(64))
    applicant_type: Mapped[str] = mapped_column(String(64))  # "*" = any
    loan_band: Mapped[str] = mapped_column(String(32), default="*")  # "*" = any
    category: Mapped[str] = mapped_column(String(80))
    category_order: Mapped[int] = mapped_column(Integer)
    doc_name: Mapped[str] = mapped_column(String(200))
    owner: Mapped[str] = mapped_column(String(32))  # "Client" | "Kestrel Ops"
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Application(Base):
    """Read-only copy of the LOS application (stands in for the LOS in this prototype)."""

    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)  # KF-2026-XXXX
    client_name: Mapped[str] = mapped_column(String(160))
    city: Mapped[str] = mapped_column(String(80))
    product: Mapped[str] = mapped_column(String(64))
    applicant_type: Mapped[str] = mapped_column(String(64))
    # Only the band that selects the checklist; never an amount.
    loan_band: Mapped[str] = mapped_column(String(32))
    contact_name: Mapped[str] = mapped_column(String(120))
    contact_email: Mapped[str] = mapped_column(String(160))
    rm_id: Mapped[str] = mapped_column(ForeignKey("staff.id"))
    analyst_id: Mapped[str | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    opened_at: Mapped[datetime] = mapped_column(UTCDateTime())
    rule_version: Mapped[int] = mapped_column(Integer)

    rm: Mapped[Staff] = relationship(foreign_keys=[rm_id], lazy="joined")
    analyst: Mapped[Staff | None] = relationship(foreign_keys=[analyst_id], lazy="joined")
    items: Mapped[list[DocumentItem]] = relationship(
        back_populates="application", order_by="DocumentItem.id", lazy="selectin"
    )


ITEM_STATES = ("requested", "received", "waived")  # "overdue" is derived, never stored


class DocumentItem(Base):
    __tablename__ = "document_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    category: Mapped[str] = mapped_column(String(80))
    category_order: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    owner: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(16), default="requested")
    requested_at: Mapped[datetime] = mapped_column(UTCDateTime())
    due_date: Mapped[date] = mapped_column(Date)
    round: Mapped[int] = mapped_column(Integer, default=1)
    received_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    received_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    waived_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    waived_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    analyst_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("analyst_requests.id"), nullable=True
    )

    application: Mapped[Application] = relationship(back_populates="items")


REMINDER_STATES = ("draft", "scheduled", "sent")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    # The RM named on the application when the draft was created. Only this RM may approve.
    named_rm_id: Mapped[str] = mapped_column(ForeignKey("staff.id"))
    round: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[date] = mapped_column(Date)
    item_ids: Mapped[list[int]] = mapped_column(JSON)
    template_body: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(16), default="draft")
    created_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime())
    revision: Mapped[int] = mapped_column(Integer, default=1)
    ai_assisted: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    application: Mapped[Application] = relationship(lazy="joined")


class AnalystRequest(Base):
    """A request from the analyst to the RM. The client is never contacted directly."""

    __tablename__ = "analyst_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True)
    analyst_id: Mapped[str] = mapped_column(ForeignKey("staff.id"))
    rm_id: Mapped[str] = mapped_column(ForeignKey("staff.id"))
    item_ids: Mapped[list[int]] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime())


EVENT_TYPES = (
    "request_created",
    "reminder_drafted",
    "reminder_approved",
    "reminder_sent",
    "document_received",
    "item_waived",
    "file_marked_complete",
)


class Event(Base):
    """Append-only event log. Rows are never updated or deleted by the application.

    Each row stores a SHA-256 hash of its content chained to the previous row's hash,
    so any later edit to the table is detectable (see app.domain.events.verify_chain).
    On PostgreSQL a trigger additionally rejects UPDATE and DELETE.
    """

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    event_type: Mapped[str] = mapped_column(String(32), index=True)
    application_id: Mapped[str | None] = mapped_column(
        ForeignKey("applications.id"), nullable=True, index=True
    )
    actor_id: Mapped[str] = mapped_column(String(32))
    actor_name: Mapped[str] = mapped_column(String(120))
    actor_role: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), unique=True)


# --------------------------------------------------------------------------- AI agent governance
AGENT_KEYS = ("reminder_rewriter", "reminder_critic")
PROVIDERS = ("gemini", "anthropic", "simulated")


class ModelPrice(Base):
    """Token prices per provider/model (USD per 1M tokens). Editable; used to cost every call."""

    __tablename__ = "model_prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(64))
    input_usd_per_mtok: Mapped[float] = mapped_column(Float)
    output_usd_per_mtok: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(200))
    as_of: Mapped[date] = mapped_column(Date)


class AgentConfig(Base):
    """Live configuration of one agent. Every change also writes an AgentConfigVersion."""

    __tablename__ = "agent_configs"

    agent_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    primary_provider: Mapped[str] = mapped_column(String(32))
    primary_model: Mapped[str] = mapped_column(String(64))
    fallback_provider: Mapped[str] = mapped_column(String(32))
    fallback_model: Mapped[str] = mapped_column(String(64))
    tone: Mapped[str] = mapped_column(String(16))
    prompt: Mapped[str] = mapped_column(Text)
    task_price_inr: Mapped[float] = mapped_column(Float)
    outcome_price_inr: Mapped[float] = mapped_column(Float)
    monthly_budget_usd: Mapped[float] = mapped_column(Float)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=20)
    simulate_primary_outage: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[str] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime())


class AgentConfigVersion(Base):
    """Append-only history of agent configuration changes (who, when, what, why)."""

    __tablename__ = "agent_config_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_key: Mapped[str] = mapped_column(ForeignKey("agent_configs.agent_key"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON)
    changed_fields: Mapped[list[str]] = mapped_column(JSON)
    note: Mapped[str] = mapped_column(Text)
    changed_by: Mapped[str] = mapped_column(String(120))
    changed_at: Mapped[datetime] = mapped_column(UTCDateTime())


class AgentRun(Base):
    """One backend call to a model (one attempt). Attempts of the same task share task_id."""

    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(36), index=True)
    agent_key: Mapped[str] = mapped_column(String(32), index=True)
    config_version: Mapped[int] = mapped_column(Integer)
    task: Mapped[str] = mapped_column(String(32))  # reword | critique
    application_id: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    reminder_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    triggered_by: Mapped[str] = mapped_column(String(120))
    attempt: Mapped[int] = mapped_column(Integer)
    route: Mapped[str] = mapped_column(String(16))  # primary | fallback
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(64))
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24))  # ok|error|rejected|skipped_circuit_open
    error: Mapped[str | None] = mapped_column(String(200), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Outcome-based pricing: "accepted" when the AI wording is approved and sent by the RM.
    outcome: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)


class AgentTrace(Base):
    """Step-by-step record of one agent task or pipeline run (checks, prompts, calls, costs)."""

    __tablename__ = "agent_traces"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))  # task | pipeline
    agent_key: Mapped[str] = mapped_column(String(32))
    application_id: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    triggered_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16))
