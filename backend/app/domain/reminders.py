"""Reminder drafter and the approval-and-send step.

`_send` is the only route to the client. It refuses unless the reminder was approved by
the RM named on the draft. Drafts are never sent automatically: a scheduled send only
happens after the named RM approved that schedule.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.domain import events
from app.domain.events import Actor
from app.domain.roles import (
    Conflict,
    Forbidden,
    Invalid,
    can_approve_reminder,
    can_draft_reminder,
    require,
)
from app.domain.status import ist_date
from app.domain.tracker import get_item
from app.models import Application, DocumentItem, Reminder, Staff

log = logging.getLogger("kestrel.reminders")

ROUND_INTROS = {
    1: "To continue with your application, we need the following documents:",
    2: "We are still waiting for the following documents and would be grateful to receive them:",
    3: "This is a final reminder. We cannot progress your application until we receive:",
}
ROUND_LABELS = {
    1: "Reminder Round 1 (first notice)",
    2: "Reminder Round 2 (firm reminder)",
    3: "Reminder Round 3 (final notice)",
}


def format_due(d: date) -> str:
    return d.strftime("%A, %d %b %Y")


def render(app: Application, items: list[DocumentItem], round_: int, due: date) -> str:
    lines = [
        f"Dear {app.contact_name},",
        "",
        f"Regarding your application {app.id} for {app.client_name}:",
        "",
        ROUND_INTROS[round_],
        "",
        *[f"{n}. {it.name}" for n, it in enumerate(items, start=1)],
        "",
        f"Please share these documents by {format_due(due)}.",
        "",
        f"If you have any questions, please contact your Relationship Manager, {app.rm.name}.",
        "",
        "Kestrel Finance, SME Lending",
    ]
    return "\n".join(lines)


def outstanding(app: Application) -> list[DocumentItem]:
    return [i for i in app.items if i.state == "requested"]


def sent_count(session: Session, app_id: str) -> int:
    return len(
        session.scalars(
            select(Reminder.id).where(Reminder.application_id == app_id, Reminder.state == "sent")
        ).all()
    )


def open_draft(session: Session, app_id: str) -> Reminder | None:
    return session.scalar(
        select(Reminder)
        .where(Reminder.application_id == app_id, Reminder.state == "draft")
        .order_by(Reminder.id.desc())
        .limit(1)
    )


def _resolve_items(app: Application, item_ids: list[int]) -> list[DocumentItem]:
    if not item_ids:
        raise Invalid("select at least one outstanding item")
    items = [get_item(app, i) for i in item_ids]
    for it in items:
        if it.state != "requested":
            raise Conflict(f"'{it.name}' is no longer outstanding")
    return items


def create_draft(
    session: Session,
    app: Application,
    *,
    actor: Staff,
    now: datetime,
    item_ids: list[int] | None = None,
) -> Reminder:
    require(can_draft_reminder(actor, app))
    existing = open_draft(session, app.id)
    if existing is not None:
        return existing
    items = _resolve_items(app, item_ids or [i.id for i in outstanding(app)])
    round_ = min(3, sent_count(session, app.id) + 1)
    due = ist_date(now) + timedelta(days=get_settings().default_due_in_days)
    body = render(app, items, round_, due)
    r = Reminder(
        application_id=app.id,
        named_rm_id=app.rm_id,
        round=round_,
        due_date=due,
        item_ids=[i.id for i in items],
        template_body=body,
        body=body,
        state="draft",
        created_by=actor.name,
        created_at=now,
        revision=1,
    )
    session.add(r)
    session.flush()
    events.record(
        session,
        event_type="reminder_drafted",
        actor=Actor.of(actor),
        application_id=app.id,
        reason=f"Draft reminder (round {round_}) for {len(items)} item(s), held for RM review",
        now=now,
        payload={"reminder_id": r.id, "revision": 1, "item_ids": r.item_ids},
    )
    return r


def update_draft(
    session: Session,
    r: Reminder,
    *,
    actor: Staff,
    now: datetime,
    item_ids: list[int] | None = None,
    round_: int | None = None,
    due: date | None = None,
    body: str | None = None,
    ai_assisted: bool = False,
) -> Reminder:
    app = r.application
    require(can_draft_reminder(actor, app))
    if r.state != "draft":
        raise Conflict("only drafts can be edited")
    if round_ is not None and round_ not in ROUND_INTROS:
        raise Invalid("round must be 1, 2 or 3")
    if due is not None and due < ist_date(now):
        raise Invalid("the due date cannot be in the past")

    structural = item_ids is not None or round_ is not None or due is not None
    if structural:
        items = _resolve_items(app, item_ids if item_ids is not None else r.item_ids)
        r.item_ids = [i.id for i in items]
        r.round = round_ or r.round
        r.due_date = due or r.due_date
        r.template_body = render(app, items, r.round, r.due_date)
        r.body = r.template_body
        r.ai_assisted = False
    if body is not None:
        if not body.strip():
            raise Invalid("the reminder text cannot be empty")
        r.body = body.strip()
        r.ai_assisted = ai_assisted
    r.revision += 1
    events.record(
        session,
        event_type="reminder_drafted",
        actor=Actor.of(actor),
        application_id=app.id,
        reason=f"Draft reminder revised (revision {r.revision})"
        + (" with AI-assisted wording" if r.ai_assisted else ""),
        now=now,
        payload={
            "reminder_id": r.id,
            "revision": r.revision,
            "item_ids": r.item_ids,
            "edited_text": r.body != r.template_body,
            "ai_assisted": r.ai_assisted,
        },
    )
    return r


def _approve(session: Session, r: Reminder, *, actor: Staff, now: datetime, note: str) -> None:
    app = r.application
    if not can_approve_reminder(actor, r.named_rm_id) or app.rm_id != r.named_rm_id:
        raise Forbidden("only the RM named on this draft can approve it")
    if r.state != "draft":
        raise Conflict(f"reminder is already {r.state}")
    _resolve_items(app, r.item_ids)  # every item must still be outstanding
    r.approved_by = actor.id
    r.approved_at = now
    events.record(
        session,
        event_type="reminder_approved",
        actor=Actor.of(actor),
        application_id=app.id,
        reason=note,
        now=now,
        payload={
            "reminder_id": r.id,
            "revision": r.revision,
            "edited_text": r.body != r.template_body,
            "ai_assisted": r.ai_assisted,
            "scheduled_for": r.scheduled_for.isoformat() if r.scheduled_for else None,
        },
    )


def _send(session: Session, r: Reminder, *, now: datetime) -> None:
    """The only route to the client."""
    if r.approved_by is None or r.approved_at is None or r.approved_by != r.named_rm_id:
        raise Forbidden("a reminder cannot be sent without approval by the named RM")
    if r.state == "sent":
        raise Conflict("reminder already sent")
    app = r.application
    approver = session.get(Staff, r.approved_by)
    assert approver is not None
    message_id = SimulatedMailer.send(to=app.contact_email, subject=f"Documents for {app.id}")
    r.state = "sent"
    r.sent_at = now
    if r.ai_assisted:
        from app.ai.agents import mark_outcome_accepted

        mark_outcome_accepted(session, r.id)
    for item_id in r.item_ids:
        item = get_item(app, item_id)
        item.round += 1
        # The client now has the deadline stated in this reminder.
        item.due_date = r.due_date
    events.record(
        session,
        event_type="reminder_sent",
        actor=Actor.of(approver),
        application_id=app.id,
        reason=f"Round {r.round} reminder sent by email after approval by {approver.name}",
        now=now,
        payload={
            "reminder_id": r.id,
            "message_id": message_id,
            "channel": "email (simulated)",
            "item_ids": r.item_ids,
        },
    )


def approve_and_send(session: Session, r: Reminder, *, actor: Staff, now: datetime) -> Reminder:
    _approve(
        session, r, actor=actor, now=now, note=f"Approved round {r.round} reminder for sending"
    )
    _send(session, r, now=now)
    return r


def schedule(
    session: Session, r: Reminder, *, actor: Staff, now: datetime, send_at: datetime
) -> Reminder:
    if send_at <= now:
        raise Invalid("the scheduled time must be in the future")
    if send_at > now + timedelta(days=14):
        raise Invalid("schedule within the next 14 days")
    r.scheduled_for = send_at
    _approve(
        session,
        r,
        actor=actor,
        now=now,
        note=f"Approved round {r.round} reminder, scheduled for {send_at.isoformat()}",
    )
    r.state = "scheduled"
    return r


def send_due(session: Session, *, now: datetime) -> int:
    """Send approved, scheduled reminders whose time has come. Never touches drafts."""
    due = session.scalars(
        select(Reminder).where(Reminder.state == "scheduled", Reminder.scheduled_for <= now)
    ).all()
    for r in due:
        _send(session, r, now=now)
    return len(due)


class SimulatedMailer:
    """Stands in for Kestrel's existing mail system. Sends nothing; logs metadata only."""

    _counter = 0

    @classmethod
    def send(cls, *, to: str, subject: str) -> str:
        cls._counter += 1
        message_id = f"SIM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{cls._counter:04d}"
        log.info("simulated email queued id=%s subject=%s", message_id, subject)
        return message_id
