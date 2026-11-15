"""JSON API. Role checks happen on every call, independently of what the UI shows."""

from __future__ import annotations

import csv
import io
from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import agents, pipeline
from app.auth import current_user
from app.config import get_settings
from app.db import get_session
from app.domain import queries, reminders, tracker
from app.domain.events import Actor, verify_chain
from app.domain.reminders import format_due
from app.domain.roles import (
    ROLE_LABELS,
    SCREENS,
    Conflict,
    Forbidden,
    Invalid,
    NotFound,
    can_draft_reminder,
    can_mark_received,
    can_see_oversight,
    can_see_queue,
    can_use_ai,
    can_use_analyst_view,
    can_waive,
    editable_agent_fields,
    has,
    matrix,
    permissions_for,
    require,
    require_permission,
    require_view,
)
from app.domain.status import now_utc
from app.models import EVENT_TYPES, AgentConfig, Application, Reminder, Staff


def get_now() -> datetime:
    return now_utc()


Now = Annotated[datetime, Depends(get_now)]
DB = Annotated[Session, Depends(get_session)]
User = Annotated[Staff, Depends(current_user)]


def send_scheduled(session: DB, now: Now) -> None:
    """Deliver reminders that the named RM approved for a later time (scale-to-zero safe)."""
    if reminders.send_due(session, now=now):
        session.commit()


router = APIRouter(prefix="/api", dependencies=[Depends(send_scheduled)])


def load_app(session: Session, app_id: str) -> Application:
    app = session.get(Application, app_id)
    if app is None:
        raise NotFound("application not found")
    return app


def load_reminder(session: Session, reminder_id: int) -> Reminder:
    r = session.get(Reminder, reminder_id)
    if r is None:
        raise NotFound("reminder not found")
    return r


# ------------------------------------------------------------------ session / role switcher
@router.get("/session")
def session_info(request: Request, user: User, session: DB) -> dict[str, Any]:
    # Every session is bound to one person; there is no role switching.
    locked = True
    staff = [user]
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "title": user.title,
            "role_label": ROLE_LABELS[user.role],
        },
        "screens": SCREENS[user.role],
        "demo_users": [
            {"id": s.id, "name": s.name, "role": s.role, "role_label": ROLE_LABELS[s.role]}
            for s in staff
        ],
        "ai_drafting_enabled": get_settings().ai_drafting_enabled,
        "version": get_settings().app_version,
        "locked": locked,
        "permissions": permissions_for(user.role),
    }


class SwitchIn(BaseModel):
    staff_id: str


@router.post("/session/switch")
def switch_user(body: SwitchIn, request: Request, user: User, session: DB) -> dict[str, str]:
    raise Forbidden("role switching is disabled: sign out and sign in as that person")


# ------------------------------------------------------------------ A. queue
@router.get("/queue")
def get_queue(
    user: User,
    session: DB,
    now: Now,
    rm: str | None = None,
    stage: str | None = None,
    status: str | None = None,
    q: str | None = None,
    sort: str = "oldest",
) -> dict[str, Any]:
    require(can_see_queue(user))
    if sort not in queries.SORTS:
        raise Invalid("unknown sort")
    return queries.queue(
        session, user, now=now, rm=rm, stage_filter=stage, status_filter=status, q=q, sort=sort
    )


# ------------------------------------------------------------------ B. checklist
@router.get("/applications/{app_id}")
def get_application(app_id: str, user: User, session: DB, now: Now) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    d = queries.application_detail(session, app, now=now)
    d["permissions"] = {
        "mark_received": can_mark_received(user, app),
        "waive": can_waive(user, app),
        "draft_reminder": can_draft_reminder(user, app),
    }
    if user.role == "analyst":
        # Analysts see document events only, never reminder activity.
        d.pop("reminders")
        d["timeline"] = [e for e in d["timeline"] if e["event_type"] in queries.RECEIPT_EVENTS]
    return d


class WaiveIn(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@router.post("/applications/{app_id}/items/{item_id}/receive")
def receive_item(app_id: str, item_id: int, user: User, session: DB, now: Now) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_mark_received(user, app), "only Credit Operations can confirm receipt")
    tracker.mark_received(session, app, item_id, actor=Actor.of(user), now=now)
    session.commit()
    return {"ok": True}


@router.post("/applications/{app_id}/items/{item_id}/waive")
def waive_item(
    app_id: str, item_id: int, body: WaiveIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_waive(user, app))
    tracker.waive(session, app, item_id, reason=body.reason, actor=Actor.of(user), now=now)
    session.commit()
    return {"ok": True}


# ------------------------------------------------------------------ C. reminders
class DraftIn(BaseModel):
    item_ids: list[int] | None = None


@router.post("/applications/{app_id}/reminders")
def create_reminder(
    app_id: str, body: DraftIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    r = reminders.create_draft(session, app, actor=user, now=now, item_ids=body.item_ids)
    session.commit()
    return queries.reminder_view(session, r, now=now)


@router.get("/applications/{app_id}/reminders/current")
def current_reminder(app_id: str, user: User, session: DB, now: Now) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_draft_reminder(user, app))
    r = reminders.open_draft(session, app.id)
    if r is None:
        raise NotFound("no open draft")
    return queries.reminder_view(session, r, now=now)


@router.get("/reminders/{reminder_id}")
def get_reminder(reminder_id: int, user: User, session: DB, now: Now) -> dict[str, Any]:
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    require(can_draft_reminder(user, r.application))
    return queries.reminder_view(session, r, now=now)


class DraftPatch(BaseModel):
    item_ids: list[int] | None = None
    round: int | None = Field(default=None, ge=1, le=3)
    due_date: date | None = None
    body: str | None = Field(default=None, max_length=5000)


@router.patch("/reminders/{reminder_id}")
def edit_reminder(
    reminder_id: int, patch: DraftPatch, user: User, session: DB, now: Now
) -> dict[str, Any]:
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    reminders.update_draft(
        session,
        r,
        actor=user,
        now=now,
        item_ids=patch.item_ids,
        round_=patch.round,
        due=patch.due_date,
        body=patch.body,
    )
    session.commit()
    return queries.reminder_view(session, r, now=now)


class AgentTaskIn(BaseModel):
    tone: str | None = None


def _agent_inputs(r: Reminder) -> tuple[list[str], dict[str, str]]:
    app = r.application
    names = [tracker.get_item(app, i).name for i in r.item_ids]
    must_keep = [*names, app.id, format_due(r.due_date), app.rm.name]
    secrets = {"[[CLIENT]]": app.client_name, "[[CONTACT]]": app.contact_name}
    return must_keep, secrets


def _task_result(session: Session, runs: list[Any]) -> dict[str, Any]:
    cfg = session.get(AgentConfig, runs[0].agent_key)
    assert cfg is not None
    return agents.task_view(runs, get_settings().usd_inr_rate, cfg)


@router.post("/reminders/{reminder_id}/ai-reword")
def ai_reword(
    reminder_id: int, user: User, session: DB, now: Now, body: AgentTaskIn | None = None
) -> dict[str, Any]:
    body = body or AgentTaskIn()
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    require(can_use_ai(user, r.application))
    if r.state != "draft":
        raise Conflict("only drafts can be reworded")
    must_keep, secrets = _agent_inputs(r)
    try:
        text, runs = agents.run_task(
            session,
            agent_key="reminder_rewriter",
            task="reword",
            text=r.body,
            tone=body.tone,
            must_keep=must_keep,
            secrets=secrets,
            application_id=r.application_id,
            reminder_id=r.id,
            actor=user,
            now=now,
        )
    except agents.AgentUnavailable as exc:
        session.commit()  # keep the failed attempts in the cost ledger
        raise Conflict(str(exc)) from None
    reminders.update_draft(session, r, actor=user, now=now, body=text, ai_assisted=True)
    session.commit()
    return {
        "reminder": queries.reminder_view(session, r, now=now),
        "task": _task_result(session, runs),
    }


@router.post("/reminders/{reminder_id}/critique")
def ai_critique(
    reminder_id: int, user: User, session: DB, now: Now, body: AgentTaskIn | None = None
) -> dict[str, Any]:
    body = body or AgentTaskIn()
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    require(can_use_ai(user, r.application))
    must_keep, secrets = _agent_inputs(r)
    try:
        _, runs = agents.run_task(
            session,
            agent_key="reminder_critic",
            task="critique",
            text=r.body,
            tone=body.tone,
            must_keep=must_keep,
            secrets=secrets,
            application_id=r.application_id,
            reminder_id=r.id,
            actor=user,
            now=now,
        )
    except agents.AgentUnavailable as exc:
        session.commit()
        raise Conflict(str(exc)) from None
    session.commit()
    return {"task": _task_result(session, runs)}


@router.get("/reminders/{reminder_id}/ai-tasks")
def reminder_ai_tasks(reminder_id: int, user: User, session: DB) -> list[dict[str, Any]]:
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    require(can_draft_reminder(user, r.application))
    return [t for t in agents.ledger(session, application_id=r.application_id, limit=20)]


# ------------------------------------------------------------------ AI agent governance
@router.get("/rbac")
def rbac(user: User) -> dict[str, Any]:
    """The permission matrix the server enforces (shown in the UI for transparency)."""
    return {**matrix(), "you": {"role": user.role, "permissions": permissions_for(user.role)}}


@router.get("/agents")
def agent_governance(user: User, session: DB, now: Now) -> dict[str, Any]:
    if has(user, "agents.view_costs"):
        data = agents.governance(session, now=now)
        data["editable_fields"] = editable_agent_fields(user)
        data["can_edit"] = bool(data["editable_fields"])
        data["can_test"] = has(user, "agents.test")
        data["totals"] = agents.totals(session, now=now)
        return data
    # Desk roles only need to know whether AI help is available and which tones exist.
    s = get_settings()
    return {
        "enabled": s.ai_drafting_enabled,
        "simulated_mode": s.ai_demo_simulate,
        "tones": list(agents.TONES),
        "can_edit": False,
        "agents": [
            {
                "agent_key": c.agent_key,
                "display_name": c.display_name,
                "enabled": c.enabled,
                "tone": c.tone,
            }
            for c in session.scalars(select(AgentConfig))
        ],
    }


class AgentPatch(BaseModel):
    note: str = Field(min_length=3, max_length=500)
    enabled: bool | None = None
    primary_provider: str | None = None
    primary_model: str | None = None
    fallback_provider: str | None = None
    fallback_model: str | None = None
    tone: str | None = None
    prompt: str | None = Field(default=None, max_length=4000)
    task_price_inr: float | None = None
    outcome_price_inr: float | None = None
    monthly_budget_usd: float | None = None
    timeout_seconds: int | None = Field(default=None, ge=3, le=60)
    simulate_primary_outage: bool | None = None


def _agent_editor(user: Staff) -> set[str]:
    allowed = set(editable_agent_fields(user))
    require(bool(allowed), "your role cannot change agents")
    return allowed


@router.patch("/agents/{agent_key}")
def update_agent(
    agent_key: str, patch: AgentPatch, user: User, session: DB, now: Now
) -> dict[str, Any]:
    allowed = _agent_editor(user)
    changes = patch.model_dump(exclude={"note"}, exclude_none=True)
    agents.update_config(
        session, agent_key, changes, note=patch.note, actor=user, now=now, allowed=allowed
    )
    session.commit()
    return agents.governance(session, now=now)


class RestoreIn(BaseModel):
    version: int = Field(ge=1)
    note: str = Field(default="", max_length=500)


@router.post("/agents/{agent_key}/restore")
def restore_agent(
    agent_key: str, body: RestoreIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    require_permission(user, "agents.edit_behaviour")
    allowed = _agent_editor(user)
    agents.restore_version(
        session, agent_key, body.version, note=body.note, actor=user, now=now, allowed=allowed
    )
    session.commit()
    return agents.governance(session, now=now)


class TestIn(BaseModel):
    prompt: str | None = Field(default=None, max_length=4000)
    tone: str | None = None


@router.post("/agents/{agent_key}/test")
def test_agent(agent_key: str, body: TestIn, user: User, session: DB, now: Now) -> dict[str, Any]:
    require_permission(user, "agents.test")
    trace: list[dict[str, Any]] = []
    try:
        out, runs = agents.test_prompt(
            session, agent_key, prompt=body.prompt, tone=body.tone, actor=user, now=now
        )
        status = "ok"
    except agents.AgentUnavailable as exc:
        session.commit()
        last = agents.latest_trace(session, user.name)
        return {
            "status": "failed",
            "error": str(exc),
            "input": agents.SAMPLE_REMINDER,
            "trace": last,
        }
    session.commit()
    task = _task_result(session, runs)
    return {
        "status": status,
        "input": agents.SAMPLE_REMINDER,
        "output": out,
        "task": task,
        "trace": agents.trace_view(session, runs[0].task_id) or {"steps": trace},
    }


class ChaseIn(BaseModel):
    tone: str | None = None


@router.post("/applications/{app_id}/chase-agent")
def run_chase_agent(
    app_id: str, body: ChaseIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    """Run the document-chase agent: plan, draft, reword, critique, revise, hand off."""
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_use_ai(user, app))
    result = pipeline.document_chase(session, app, tone=body.tone, actor=user, now=now)
    session.commit()
    r = load_reminder(session, result["reminder_id"])
    return {**result, "reminder": queries.reminder_view(session, r, now=now)}


@router.get("/agent-traces")
def list_traces(
    user: User,
    session: DB,
    application_id: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[dict[str, Any]]:
    if application_id:
        app = load_app(session, application_id)
        require_view(user, app)
        require(can_use_ai(user, app))
    else:
        require_permission(user, "agents.view_costs")
    return agents.traces(session, application_id=application_id, limit=limit)


@router.get("/agent-traces/{task_id}")
def get_trace(task_id: str, user: User, session: DB) -> dict[str, Any]:
    t = agents.trace_view(session, task_id)
    if t is None:
        raise NotFound("trace not found")
    if not has(user, "agents.view_costs"):
        app = load_app(session, t["application_id"]) if t["application_id"] else None
        require(app is not None)
        assert app is not None
        require_view(user, app)
        require(can_use_ai(user, app))
    return t


@router.get("/agent-runs")
def agent_runs(
    user: User,
    session: DB,
    agent: str | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[dict[str, Any]]:
    require_permission(user, "agents.view_costs")
    return agents.ledger(session, agent=agent, limit=limit)


@router.post("/reminders/{reminder_id}/approve-send")
def approve_send(reminder_id: int, user: User, session: DB, now: Now) -> dict[str, Any]:
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    reminders.approve_and_send(session, r, actor=user, now=now)
    session.commit()
    return queries.reminder_view(session, r, now=now)


class ScheduleIn(BaseModel):
    send_at: AwareDatetime


@router.post("/reminders/{reminder_id}/schedule")
def schedule_reminder(
    reminder_id: int, body: ScheduleIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    r = load_reminder(session, reminder_id)
    require_view(user, r.application)
    reminders.schedule(session, r, actor=user, now=now, send_at=body.send_at)
    session.commit()
    return queries.reminder_view(session, r, now=now)


# ------------------------------------------------------------------ D. analyst
@router.get("/analyst/files")
def analyst_files(user: User, session: DB, now: Now) -> list[dict[str, Any]]:
    require(user.role == "analyst")
    return queries.analyst_files(session, user, now=now)


@router.get("/analyst/files/{app_id}")
def analyst_file(app_id: str, user: User, session: DB, now: Now) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_use_analyst_view(user, app))
    return queries.analyst_detail(session, app, now=now)


class AnalystRequestIn(BaseModel):
    item_ids: list[int] = Field(min_length=1)
    note: str = Field(min_length=1, max_length=1000)


@router.post("/analyst/files/{app_id}/request-from-rm")
def request_from_rm(
    app_id: str, body: AnalystRequestIn, user: User, session: DB, now: Now
) -> dict[str, Any]:
    app = load_app(session, app_id)
    require_view(user, app)
    require(can_use_analyst_view(user, app))
    req = tracker.request_from_rm(
        session, app, item_ids=body.item_ids, note=body.note, actor=Actor.of(user), now=now
    )
    session.commit()
    return {"id": req.id, "rm": app.rm.name}


# ------------------------------------------------------------------ E. oversight
@router.get("/oversight/summary")
def oversight_summary(user: User, session: DB, now: Now) -> dict[str, Any]:
    require(can_see_oversight(user))
    return queries.oversight(session, now=now)


@router.get("/audit")
def audit_log(
    user: User,
    session: DB,
    now: Now,
    q: str | None = None,
    type: str | None = None,
    days: Annotated[int | None, Query(ge=1, le=3650)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> dict[str, Any]:
    require(can_see_oversight(user))
    if type and type not in EVENT_TYPES:
        raise Invalid("unknown event type")
    return queries.audit(
        session, now=now, q=q, event_type=type, days=days, offset=offset, limit=limit
    )


@router.get("/audit/verify")
def audit_verify(user: User, session: DB) -> dict[str, Any]:
    require(can_see_oversight(user))
    ok, bad, count = verify_chain(session)
    return {"ok": ok, "first_bad_event_id": bad, "events_checked": count}


@router.get("/audit.csv")
def audit_csv(
    user: User,
    session: DB,
    now: Now,
    q: str | None = None,
    type: str | None = None,
    days: int | None = None,
) -> StreamingResponse:
    require(can_see_oversight(user))
    data = queries.audit(session, now=now, q=q, event_type=type, days=days, limit=100000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "event_id",
            "occurred_at_utc",
            "application_id",
            "event_type",
            "actor",
            "actor_role",
            "reason",
            "hash",
        ]
    )
    for e in data["events"]:
        w.writerow(
            [
                e["id"],
                e["occurred_at"],
                e["application_id"] or "",
                e["event_type"],
                e["actor_name"],
                e["actor_role_label"],
                e["reason"],
                e["hash"],
            ]
        )
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kestrel-audit-log.csv"},
    )


__all__ = ["router", "get_now", "Forbidden"]
