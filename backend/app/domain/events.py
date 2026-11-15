"""Append-only, hash-chained event log."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DDL, select, text
from sqlalchemy.orm import Session

from app.models import EVENT_TYPES, Event, Staff

GENESIS_HASH = "0" * 64


@dataclass(frozen=True)
class Actor:
    id: str
    name: str
    role: str

    @classmethod
    def of(cls, staff: Staff) -> Actor:
        return cls(staff.id, staff.name, staff.role)


SYSTEM = Actor("system", "Checklist service", "system")


def _canonical(e: Event) -> bytes:
    body = {
        "occurred_at": e.occurred_at.isoformat(),
        "event_type": e.event_type,
        "application_id": e.application_id,
        "actor_id": e.actor_id,
        "actor_name": e.actor_name,
        "actor_role": e.actor_role,
        "reason": e.reason,
        "payload": e.payload,
        "prev_hash": e.prev_hash,
    }
    return json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def compute_hash(e: Event) -> str:
    return hashlib.sha256(_canonical(e)).hexdigest()


def record(
    session: Session,
    *,
    event_type: str,
    actor: Actor,
    application_id: str | None,
    reason: str,
    now: datetime,
    payload: dict[str, Any] | None = None,
) -> Event:
    """Append one event. Call inside the same transaction as the state change it records."""
    if event_type not in EVENT_TYPES:
        raise ValueError(f"unknown event type {event_type!r}")
    if not reason.strip():
        raise ValueError("every event needs a reason")
    if session.get_bind().dialect.name == "postgresql":
        # Serialise writers so the hash chain stays linear.
        session.execute(text("SELECT pg_advisory_xact_lock(724501)"))
    session.flush()
    prev = session.scalar(select(Event.hash).order_by(Event.id.desc()).limit(1))
    ev = Event(
        occurred_at=now.astimezone(UTC),
        event_type=event_type,
        application_id=application_id,
        actor_id=actor.id,
        actor_name=actor.name,
        actor_role=actor.role,
        reason=reason.strip(),
        payload=payload or {},
        prev_hash=prev or GENESIS_HASH,
        hash="",
    )
    ev.hash = compute_hash(ev)
    session.add(ev)
    session.flush()
    return ev


def verify_chain(session: Session) -> tuple[bool, int | None, int]:
    """Return (ok, first_bad_event_id, events_checked)."""
    prev = GENESIS_HASH
    count = 0
    for ev in session.scalars(select(Event).order_by(Event.id)):
        count += 1
        if ev.prev_hash != prev or compute_hash(ev) != ev.hash:
            return False, ev.id, count
        prev = ev.hash
    return True, None, count


# Database-level protection, used by both create_all (tests) and the Alembic migration.
SQLITE_TRIGGERS = [
    "CREATE TRIGGER events_no_update BEFORE UPDATE ON events "
    "BEGIN SELECT RAISE(ABORT, 'events table is append-only'); END",
    "CREATE TRIGGER events_no_delete BEFORE DELETE ON events "
    "BEGIN SELECT RAISE(ABORT, 'events table is append-only'); END",
]
POSTGRES_TRIGGERS = [
    "CREATE OR REPLACE FUNCTION events_append_only() RETURNS trigger AS $$ "
    "BEGIN RAISE EXCEPTION 'events table is append-only'; END; $$ LANGUAGE plpgsql",
    "CREATE TRIGGER events_no_update_delete BEFORE UPDATE OR DELETE ON events "
    "FOR EACH ROW EXECUTE FUNCTION events_append_only()",
]


def trigger_statements(dialect: str) -> list[str]:
    if dialect == "sqlite":
        return SQLITE_TRIGGERS
    if dialect == "postgresql":
        return POSTGRES_TRIGGERS
    return []


def install_ddl_listeners() -> None:
    from sqlalchemy import event as sa_event

    table = Event.__table__
    for stmt in SQLITE_TRIGGERS:
        sa_event.listen(table, "after_create", DDL(stmt).execute_if(dialect="sqlite"))  # type: ignore[no-untyped-call]
    for stmt in POSTGRES_TRIGGERS:
        sa_event.listen(table, "after_create", DDL(stmt).execute_if(dialect="postgresql"))  # type: ignore[no-untyped-call]


install_ddl_listeners()
