"""Document-chase agent: the AI workflow for this slice.

Plan -> act -> check -> hand off, with deterministic orchestration around two model calls:
  1. Tool: read the outstanding documents from the tracker (the system of record).
  2. Tool: build the draft from the approved template (items, due date, RM name).
  3. Rewriter agent: reword in the chosen tone (LLM, primary -> fallback).
  4. Critic agent: review the draft (LLM) and score it.
  5. One revision pass if the critic says "revise".
  6. Hand-off: the draft is held for the named RM. The agent has no permission to send,
     approve, change checklist items or make any credit decision.
Every step is recorded in an AgentTrace (kind "pipeline") with its cost.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.ai import agents
from app.ai.agents import AgentUnavailable, Step, _step
from app.domain import reminders, tracker
from app.domain.roles import Conflict
from app.models import AgentTrace, Application, Reminder, Staff


def _inputs(r: Reminder) -> tuple[list[str], dict[str, str]]:
    app = r.application
    names = [tracker.get_item(app, i).name for i in r.item_ids]
    keep = [*names, app.id, reminders.format_due(r.due_date), app.rm.name]
    return keep, {"[[CLIENT]]": app.client_name, "[[CONTACT]]": app.contact_name}


def _critique(text: str) -> dict[str, Any]:
    try:
        data: dict[str, Any] = json.loads(text[text.find("{") : text.rfind("}") + 1])
        return data
    except Exception:
        return {"score": None, "verdict": "unknown", "issues": []}


def document_chase(
    session: Session, app: Application, *, tone: str | None, actor: Staff, now: datetime
) -> dict[str, Any]:
    steps: list[Step] = []
    costs_before = _cost_marker(session)

    # 1. Tool: tracker
    outstanding = reminders.outstanding(app)
    if not outstanding:
        _step(steps, "Plan: read outstanding documents", "fail", "nothing outstanding to chase")
        raise Conflict("every document is received or waived; nothing to chase")
    _step(
        steps,
        "Plan: read outstanding documents (tool: tracker)",
        "pass",
        f"{len(outstanding)} outstanding: " + "; ".join(i.name for i in outstanding),
    )

    # 2. Tool: template
    r = reminders.create_draft(session, app, actor=actor, now=now)
    _step(
        steps,
        "Act: draft from approved template (tool: drafter)",
        "pass",
        f"round {r.round}, due {reminders.format_due(r.due_date)}, {len(r.item_ids)} item(s), "
        f"named RM {app.rm.name}",
        output=r.body,
    )

    # 3. Rewriter
    keep, secrets = _inputs(r)
    status = "ok"
    try:
        text, _ = agents.run_task(
            session,
            agent_key="reminder_rewriter",
            task="reword",
            text=r.body,
            tone=tone,
            must_keep=keep,
            secrets=secrets,
            application_id=app.id,
            reminder_id=r.id,
            actor=actor,
            now=now,
            trace=steps,
        )
        reminders.update_draft(session, r, actor=actor, now=now, body=text, ai_assisted=True)
    except AgentUnavailable:
        status = "partial"
        _step(steps, "Fallback to template", "info", "AI wording unavailable; template text kept")

    # 4. Critic
    verdict: dict[str, Any] = {"score": None, "verdict": "not run", "issues": []}
    try:
        review, _ = agents.run_task(
            session,
            agent_key="reminder_critic",
            task="critique",
            text=r.body,
            tone=tone,
            must_keep=keep,
            secrets=secrets,
            application_id=app.id,
            reminder_id=r.id,
            actor=actor,
            now=now,
            trace=steps,
        )
        verdict = _critique(review)
        _step(
            steps,
            "Check: critic verdict",
            "pass" if verdict.get("verdict") == "ok" else "info",
            f"score {verdict.get('score')}/5, verdict {verdict.get('verdict')}; issues: "
            + ("; ".join(verdict.get("issues") or []) or "none"),
        )
    except AgentUnavailable:
        status = "partial"

    # 5. One revision pass
    if verdict.get("verdict") == "revise" and verdict.get("issues") and status == "ok":
        try:
            text, _ = agents.run_task(
                session,
                agent_key="reminder_rewriter",
                task="reword",
                text=r.body,
                tone=tone,
                must_keep=keep,
                secrets=secrets,
                application_id=app.id,
                reminder_id=r.id,
                actor=actor,
                now=now,
                trace=steps,
                extra_instruction="; ".join(verdict["issues"])[:600],
            )
            reminders.update_draft(session, r, actor=actor, now=now, body=text, ai_assisted=True)
            _step(steps, "Revise: one pass on critic feedback", "pass", "draft updated")
        except AgentUnavailable:
            _step(steps, "Revise: one pass on critic feedback", "info", "kept previous draft")
    else:
        _step(steps, "Revise: one pass on critic feedback", "skip", "not needed")

    # 6. Hand-off
    _step(
        steps,
        "Hand-off: held for the named RM",
        "pass",
        f"draft revision {r.revision} waits for {app.rm.name}. The agent cannot send or approve: "
        "the server only accepts approval from the RM named on the draft.",
    )
    total = round(_cost_marker(session) - costs_before, 8)
    trace = AgentTrace(
        task_id=str(uuid.uuid4()),
        kind="pipeline",
        agent_key="document_chase",
        application_id=app.id,
        triggered_by=actor.name,
        created_at=now,
        steps=steps,
        total_cost_usd=total,
        status=status,
    )
    session.add(trace)
    session.flush()
    return {
        "trace_id": trace.task_id,
        "status": status,
        "steps": steps,
        "total_cost_usd": total,
        "critique": verdict,
        "reminder_id": r.id,
    }


def _cost_marker(session: Session) -> float:
    from sqlalchemy import func, select

    from app.models import AgentRun

    session.flush()
    return float(session.scalar(select(func.coalesce(func.sum(AgentRun.cost_usd), 0.0))) or 0.0)
