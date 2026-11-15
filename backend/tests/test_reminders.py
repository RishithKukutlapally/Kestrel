"""The approval rule is enforced on the server, not only in the UI."""

from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import reminders
from app.domain.roles import Forbidden
from app.models import Application, Event, Reminder, Staff
from tests.conftest import NOW, login, switch


def open_draft_id(c, app_id: str) -> int:  # type: ignore[no-untyped-def]
    r = c.get(f"/api/applications/{app_id}/reminders/current")
    assert r.status_code == 200, r.text
    return int(r.json()["id"])


def test_draft_is_labelled_and_not_sent(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    d = c.get(f"/api/reminders/{rid}").json()
    assert d["state"] == "draft" and d["sent_at"] is None and d["approved_by"] is None
    assert "Vikram Desai" in d["body"] and "KF-2026-1049" in d["body"]


def test_named_rm_can_approve_and_send(client, session: Session) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    r = c.post(f"/api/reminders/{rid}/approve-send")
    assert r.status_code == 200, r.text
    assert r.json()["state"] == "sent" and r.json()["approved_by"] == "Vikram Desai"
    types = session.scalars(
        select(Event.event_type)
        .where(Event.application_id == "KF-2026-1049")
        .order_by(Event.id.desc())
        .limit(2)
    ).all()
    assert types == ["reminder_sent", "reminder_approved"]


@pytest.mark.parametrize(
    "other", ["coord-sunita", "rm-priya", "an-ananya", "cm-meera", "cro-rahul"]
)
def test_nobody_else_can_approve(client, other: str) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    switch(c, other)
    r = c.post(f"/api/reminders/{rid}/approve-send")
    assert r.status_code in (403, 404)
    r = c.post(
        f"/api/reminders/{rid}/schedule", json={"send_at": (NOW + timedelta(hours=3)).isoformat()}
    )
    assert r.status_code in (403, 404)
    switch(c, "rm-vikram")
    assert c.get(f"/api/reminders/{rid}").json()["state"] == "draft"


def test_send_refuses_unapproved_reminder_even_if_called_directly(session: Session) -> None:
    r = session.scalar(select(Reminder).where(Reminder.state == "draft").limit(1))
    assert r is not None
    with pytest.raises(Forbidden):
        reminders._send(session, r, now=NOW)


def test_send_refuses_approval_by_someone_other_than_named_rm(session: Session) -> None:
    r = session.scalar(select(Reminder).where(Reminder.state == "draft").limit(1))
    assert r is not None
    r.approved_by, r.approved_at = "coord-sunita", NOW  # tampered state
    with pytest.raises(Forbidden):
        reminders._send(session, r, now=NOW)


def test_coordinator_can_draft_and_edit_but_not_approve(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    rid = open_draft_id(c, "KF-2026-1049")
    r = c.patch(f"/api/reminders/{rid}", json={"round": 3})
    assert r.status_code == 200 and r.json()["round"] == 3
    assert "final reminder" in r.json()["body"].lower()
    assert c.post(f"/api/reminders/{rid}/approve-send").status_code == 403


def test_edit_text_then_approve_records_edit(client, session: Session) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    body = c.get(f"/api/reminders/{rid}").json()["body"] + "\n\nThank you."
    r = c.patch(f"/api/reminders/{rid}", json={"body": body})
    assert r.json()["edited_text"] is True
    c.post(f"/api/reminders/{rid}/approve-send")
    ev = session.scalar(
        select(Event)
        .where(Event.event_type == "reminder_approved")
        .order_by(Event.id.desc())
        .limit(1)
    )
    assert ev is not None and ev.payload["edited_text"] is True


def test_schedule_requires_future_and_sends_only_when_due(client, session: Session) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    assert (
        c.post(
            f"/api/reminders/{rid}/schedule",
            json={"send_at": (NOW - timedelta(minutes=1)).isoformat()},
        ).status_code
        == 422
    )
    r = c.post(
        f"/api/reminders/{rid}/schedule", json={"send_at": (NOW + timedelta(hours=2)).isoformat()}
    )
    assert r.json()["state"] == "scheduled"
    assert reminders.send_due(session, now=NOW) == 0
    assert reminders.send_due(session, now=NOW + timedelta(hours=3)) >= 1
    session.refresh(session.get(Reminder, rid))  # type: ignore[arg-type]
    assert session.get(Reminder, rid).state == "sent"  # type: ignore[union-attr]


def test_drafts_never_send_automatically(session: Session) -> None:
    drafts = session.scalars(select(Reminder).where(Reminder.state == "draft")).all()
    assert drafts
    reminders.send_due(session, now=NOW + timedelta(days=365))
    for d in drafts:
        session.refresh(d)
        assert d.state == "draft"


def test_rm_change_invalidates_old_named_rm(session: Session) -> None:
    app = session.get(Application, "KF-2026-1049")
    r = session.scalar(
        select(Reminder).where(Reminder.application_id == "KF-2026-1049", Reminder.state == "draft")
    )
    assert app is not None and r is not None
    app.rm_id = "rm-priya"
    session.flush()
    vikram = session.get(Staff, "rm-vikram")
    assert vikram is not None
    with pytest.raises(Forbidden):
        reminders.approve_and_send(session, r, actor=vikram, now=NOW)


def test_ai_reword_reports_disabled(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rid = open_draft_id(c, "KF-2026-1049")
    r = c.post(f"/api/reminders/{rid}/ai-reword")
    assert r.status_code == 409 and "disabled" in r.json()["detail"].lower()
    assert c.get("/api/session").json()["ai_drafting_enabled"] is False
