"""Checklist service and document tracker: every state change writes an event."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.domain import events
from app.domain.events import SYSTEM, Actor
from app.domain.roles import Conflict, Invalid, NotFound
from app.domain.status import file_status, ist_date, item_status
from app.models import AnalystRequest, Application, ChecklistRule, DocumentItem


def rules_for(session: Session, app: Application) -> list[ChecklistRule]:
    rows = session.scalars(
        select(ChecklistRule)
        .where(
            ChecklistRule.version == app.rule_version,
            ChecklistRule.active.is_(True),
            ChecklistRule.product.in_([app.product, "*"]),
            ChecklistRule.applicant_type.in_([app.applicant_type, "*"]),
            ChecklistRule.loan_band.in_([app.loan_band, "*"]),
        )
        .order_by(ChecklistRule.category_order, ChecklistRule.id)
    ).all()
    return list(rows)


def generate_checklist(
    session: Session, app: Application, *, now: datetime, actor: Actor = SYSTEM
) -> list[DocumentItem]:
    """Create the required items from the versioned rule table and log one request per item."""
    if app.items:
        raise Conflict("checklist already generated")
    due = ist_date(now) + timedelta(days=get_settings().default_due_in_days)
    created = []
    for rule in rules_for(session, app):
        item = DocumentItem(
            application_id=app.id,
            category=rule.category,
            category_order=rule.category_order,
            name=rule.doc_name,
            owner=rule.owner,
            state="requested",
            requested_at=now,
            due_date=due,
            round=1,
        )
        session.add(item)
        session.flush()
        events.record(
            session,
            event_type="request_created",
            actor=actor,
            application_id=app.id,
            reason=f"Requested '{item.name}' (checklist rule v{app.rule_version})",
            now=now,
            payload={"kind": "document", "item_id": item.id, "due_date": due.isoformat()},
        )
        created.append(item)
    session.refresh(app)
    return created


def get_item(app: Application, item_id: int) -> DocumentItem:
    for it in app.items:
        if it.id == item_id:
            return it
    raise NotFound("item not found")


def mark_received(
    session: Session, app: Application, item_id: int, *, actor: Actor, now: datetime
) -> DocumentItem:
    item = get_item(app, item_id)
    if item.state != "requested":
        raise Conflict(f"item is already {item.state}")
    item.state = "received"
    item.received_at = now
    item.received_by = actor.name
    events.record(
        session,
        event_type="document_received",
        actor=actor,
        application_id=app.id,
        reason=f"Received '{item.name}'",
        now=now,
        payload={"item_id": item.id},
    )
    _complete_if_done(session, app, now=now)
    return item


def waive(
    session: Session, app: Application, item_id: int, *, reason: str, actor: Actor, now: datetime
) -> DocumentItem:
    reason = (reason or "").strip()
    if len(reason) < 5:
        raise Invalid("a waiver needs a recorded reason (at least 5 characters)")
    item = get_item(app, item_id)
    if item.state != "requested":
        raise Conflict(f"item is already {item.state}")
    item.state = "waived"
    item.waived_reason = reason
    item.waived_by = actor.name
    events.record(
        session,
        event_type="item_waived",
        actor=actor,
        application_id=app.id,
        reason=f"Waived '{item.name}': {reason}",
        now=now,
        payload={"item_id": item.id},
    )
    _complete_if_done(session, app, now=now)
    return item


def _complete_if_done(session: Session, app: Application, *, now: datetime) -> None:
    session.flush()
    session.refresh(app)
    today = ist_date(now)
    n = get_settings().overdue_after_days
    statuses = [item_status(i.state, i.due_date, today, n) for i in app.items]
    if file_status(statuses) == "complete":
        events.record(
            session,
            event_type="file_marked_complete",
            actor=SYSTEM,
            application_id=app.id,
            reason="All checklist items received or waived",
            now=now,
            payload={},
        )


def request_from_rm(
    session: Session,
    app: Application,
    *,
    item_ids: list[int],
    note: str,
    actor: Actor,
    now: datetime,
) -> AnalystRequest:
    """Analyst asks the RM to chase specific blocking items. The client is not contacted."""
    note = (note or "").strip()
    if not note:
        raise Invalid("add a note for the RM")
    if not item_ids:
        raise Invalid("select at least one blocking item")
    items = [get_item(app, i) for i in item_ids]
    for it in items:
        if it.state != "requested":
            raise Conflict(f"'{it.name}' is not outstanding")
    req = AnalystRequest(
        application_id=app.id,
        analyst_id=actor.id,
        rm_id=app.rm_id,
        item_ids=[i.id for i in items],
        note=note,
        created_at=now,
    )
    session.add(req)
    session.flush()
    for it in items:
        it.analyst_request_id = req.id
    events.record(
        session,
        event_type="request_created",
        actor=actor,
        application_id=app.id,
        reason=f"Analyst asked RM {app.rm.name} to obtain: " + "; ".join(i.name for i in items),
        now=now,
        payload={
            "kind": "analyst_to_rm",
            "analyst_request_id": req.id,
            "item_ids": req.item_ids,
            "note": note,
        },
    )
    return req
