"""Read models for the screens. Ageing and metrics come from the event log."""

from __future__ import annotations

import statistics
from collections import Counter
from collections.abc import Iterable, Sequence
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import Select, false, func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.domain.reminders import ROUND_LABELS, format_due, open_draft
from app.domain.roles import ROLE_LABELS
from app.domain.status import (
    STAGE_LABELS,
    STATUS_LABELS,
    days_past_due,
    file_status,
    ist_date,
    item_status,
    stage,
)
from app.models import AnalystRequest, Application, DocumentItem, Event, Reminder, Staff


# ---------------------------------------------------------------- event-log helpers
def request_times(session: Session, app_ids: Iterable[str]) -> dict[int, datetime]:
    """First request time per item, read from request_created events."""
    out: dict[int, datetime] = {}
    rows = session.scalars(
        select(Event)
        .where(Event.event_type == "request_created", Event.application_id.in_(list(app_ids)))
        .order_by(Event.id)
    )
    for ev in rows:
        if ev.payload.get("kind") == "document":
            out.setdefault(int(ev.payload["item_id"]), ev.occurred_at)
    return out


def turnaround_days(
    session: Session, app_ids: Sequence[str] | None, since: datetime, until: datetime
) -> list[float]:
    """Days from request to receipt for items received in [since, until)."""
    q = select(Event).where(Event.event_type.in_(["request_created", "document_received"]))
    if app_ids is not None:
        q = q.where(Event.application_id.in_(list(app_ids)))
    requested: dict[int, datetime] = {}
    out: list[float] = []
    for ev in session.scalars(q.order_by(Event.id)):
        if ev.event_type == "request_created" and ev.payload.get("kind") == "document":
            requested.setdefault(int(ev.payload["item_id"]), ev.occurred_at)
        elif ev.event_type == "document_received" and since <= ev.occurred_at < until:
            start = requested.get(int(ev.payload["item_id"]))
            if start is not None:
                out.append((ev.occurred_at - start).total_seconds() / 86400)
    return out


def _median(values: list[float]) -> float | None:
    return round(statistics.median(values), 1) if values else None


# ---------------------------------------------------------------- per-application view
def item_view(item: DocumentItem, today: date, requested_at: datetime | None) -> dict[str, Any]:
    n = get_settings().overdue_after_days
    st = item_status(item.state, item.due_date, today, n)
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "category_order": item.category_order,
        "owner": item.owner,
        "state": item.state,
        "status": st,
        "status_label": STATUS_LABELS[st],
        "round": item.round,
        "requested_on": ist_date(requested_at or item.requested_at).isoformat(),
        "due_date": item.due_date.isoformat(),
        "days_past_due": days_past_due(item.due_date, today) if st == "overdue" else 0,
        "age_days": (today - ist_date(requested_at or item.requested_at)).days,
        "received_at": item.received_at.isoformat() if item.received_at else None,
        "received_by": item.received_by,
        "waived_reason": item.waived_reason,
        "waived_by": item.waived_by,
        "analyst_request_id": item.analyst_request_id,
    }


def app_summary(
    session: Session,
    app: Application,
    req: dict[int, datetime],
    today: date,
    draft: Reminder | None,
    analyst_requests: int,
) -> dict[str, Any]:
    items = [item_view(i, today, req.get(i.id)) for i in app.items]
    statuses = [i["status"] for i in items]
    outstanding = [i for i in items if i["status"] in ("on_track", "due_today", "overdue")]
    oldest = max(outstanding, key=lambda i: (i["age_days"], -i["id"]), default=None)
    fs = file_status(statuses)
    stg = stage(statuses, app.analyst_id is not None)
    scheduled = session.scalar(
        select(func.min(Reminder.scheduled_for)).where(
            Reminder.application_id == app.id, Reminder.state == "scheduled"
        )
    )
    next_due = min((date.fromisoformat(i["due_date"]) for i in outstanding), default=None)
    return {
        "id": app.id,
        "client_name": app.client_name,
        "city": app.city,
        "product": app.product,
        "applicant_type": app.applicant_type,
        "loan_band": app.loan_band,
        "rm": {"id": app.rm.id, "name": app.rm.name},
        "analyst": {"id": app.analyst.id, "name": app.analyst.name} if app.analyst else None,
        "opened_on": ist_date(app.opened_at).isoformat(),
        "age_days": (today - ist_date(app.opened_at)).days,
        "status": fs,
        "status_label": STATUS_LABELS[fs],
        "stage": stg,
        "stage_label": STAGE_LABELS[stg],
        "items_total": len(items),
        "items_done": len(items) - len(outstanding),
        "outstanding_count": len(outstanding),
        "overdue_count": statuses.count("overdue"),
        "due_today_count": statuses.count("due_today"),
        "oldest_outstanding": oldest,
        "next_follow_up": {
            "kind": "scheduled_reminder" if scheduled else ("due_date" if next_due else None),
            "at": scheduled.isoformat()
            if scheduled
            else (next_due.isoformat() if next_due else None),
        },
        "draft": {"id": draft.id, "items": len(draft.item_ids)} if draft else None,
        "open_analyst_requests": analyst_requests,
        "_items": items,
    }


def visible_apps(session: Session, user: Staff) -> Select[Application]:
    q = select(Application)
    if user.role == "rm":
        q = q.where(Application.rm_id == user.id)
    elif user.role == "analyst":
        q = q.where(Application.analyst_id == user.id)
    elif user.role != "coordinator":
        q = q.where(false())
    return q


def _analyst_request_counts(session: Session, app_ids: list[str]) -> Counter[str]:
    """Analyst requests whose items are still outstanding."""
    c: Counter[str] = Counter()
    for req in session.scalars(
        select(AnalystRequest).where(AnalystRequest.application_id.in_(app_ids))
    ):
        items = session.scalars(
            select(DocumentItem.state).where(DocumentItem.id.in_(req.item_ids))
        ).all()
        if any(s == "requested" for s in items):
            c[req.application_id] += 1
    return c


# ---------------------------------------------------------------- Screen A
SORTS = ("oldest", "newest", "overdue_first", "docs_desc")


def queue(
    session: Session,
    user: Staff,
    *,
    now: datetime,
    rm: str | None = None,
    stage_filter: str | None = None,
    status_filter: str | None = None,
    q: str | None = None,
    sort: str = "oldest",
) -> dict[str, Any]:
    today = ist_date(now)
    apps = list(session.scalars(visible_apps(session, user)).unique())
    ids = [a.id for a in apps]
    req = request_times(session, ids)
    areq = _analyst_request_counts(session, ids)
    rows = [
        app_summary(session, a, req, today, open_draft(session, a.id), areq[a.id]) for a in apps
    ]

    # Summary strip: computed over the whole visible portfolio, before filters.
    open_rows = [r for r in rows if r["status"] != "complete"]
    overdue_rows = [r for r in open_rows if r["status"] == "overdue"]
    this_week = turnaround_days(session, ids, now - timedelta(days=7), now)
    last_week = turnaround_days(session, ids, now - timedelta(days=14), now - timedelta(days=7))
    median_now, median_prev = _median(this_week), _median(last_week)
    receipts_by_day = []
    for back in range(4, -1, -1):
        start = now - timedelta(days=back + 1)
        receipts_by_day.append(
            len(turnaround_days(session, ids, start, now - timedelta(days=back)))
        )
    summary = {
        "open": len(open_rows),
        "complete": len(rows) - len(open_rows),
        "rm_count": len({r["rm"]["id"] for r in rows}),
        "overdue": len(overdue_rows),
        "overdue_share_pct": round(100 * len(overdue_rows) / len(open_rows), 1)
        if open_rows
        else 0.0,
        "median_wait_days": median_now,
        "median_wait_delta": (
            round(median_now - median_prev, 1)
            if median_now is not None and median_prev is not None
            else None
        ),
        "receipts_last_5_days": receipts_by_day,
        "drafts_pending": sum(1 for r in rows if r["draft"]),
        "analyst_requests_open": sum(r["open_analyst_requests"] for r in rows),
    }

    rms = sorted({(r["rm"]["id"], r["rm"]["name"]) for r in rows}, key=lambda x: x[1])
    rm_counts = Counter(r["rm"]["id"] for r in open_rows)
    stage_counts = Counter(r["stage"] for r in rows)

    if rm:
        rows = [r for r in rows if r["rm"]["id"] == rm]
    if stage_filter:
        rows = [r for r in rows if r["stage"] == stage_filter]
    if status_filter:
        rows = [r for r in rows if r["status"] == status_filter]
    if q:
        needle = q.strip().lower()
        rows = [r for r in rows if needle in r["id"].lower() or needle in r["client_name"].lower()]

    def oldest_age(r: dict[str, Any]) -> int:
        o = r["oldest_outstanding"]
        return o["age_days"] if o else -1

    severity = {"overdue": 0, "due_today": 1, "on_track": 2, "complete": 3}
    if sort == "newest":
        rows.sort(key=lambda r: r["opened_on"], reverse=True)
    elif sort == "overdue_first":
        rows.sort(key=lambda r: (severity[r["status"]], -oldest_age(r)))
    elif sort == "docs_desc":
        rows.sort(key=lambda r: (-r["outstanding_count"], -oldest_age(r)))
    else:  # oldest outstanding item first; complete files last
        rows.sort(key=lambda r: (r["status"] == "complete", -oldest_age(r), r["id"]))

    for r in rows:
        r.pop("_items")
    return {
        "summary": summary,
        "filters": {
            "rms": [{"id": i, "name": n, "open": rm_counts[i]} for i, n in rms],
            "stages": [
                {"id": s, "label": STAGE_LABELS[s], "count": stage_counts[s]}
                for s in ("doc_collection", "analyst_blocked", "complete")
            ],
        },
        "rows": rows,
    }


# ---------------------------------------------------------------- Screen B
def timeline(session: Session, app_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    q = select(Event).where(Event.application_id == app_id).order_by(Event.id.desc())
    if limit:
        q = q.limit(limit)
    return [event_view(e, include_app=False) for e in session.scalars(q)]


def application_detail(session: Session, app: Application, *, now: datetime) -> dict[str, Any]:
    today = ist_date(now)
    req = request_times(session, [app.id])
    areq = _analyst_request_counts(session, [app.id])
    summary = app_summary(session, app, req, today, open_draft(session, app.id), areq[app.id])
    items = summary.pop("_items")
    groups: dict[str, dict[str, Any]] = {}
    for it in sorted(items, key=lambda i: (i["category_order"], i["id"])):
        g = groups.setdefault(it["category"], {"name": it["category"], "items": []})
        g["items"].append(it)
    for g in groups.values():
        done = sum(1 for i in g["items"] if i["status"] in ("received", "waived"))
        g["done"] = done
        g["total"] = len(g["items"])
        g["overdue"] = sum(1 for i in g["items"] if i["status"] == "overdue")
        g["max_round"] = max(i["round"] for i in g["items"])
    blocking = [i for i in items if i["status"] in ("overdue", "due_today", "on_track")]
    blocking.sort(
        key=lambda i: ({"overdue": 0, "due_today": 1, "on_track": 2}[i["status"]], -i["age_days"])
    )
    requests = [
        {
            "id": r.id,
            "analyst": session.get(Staff, r.analyst_id).name,  # type: ignore[union-attr]
            "note": r.note,
            "created_at": r.created_at.isoformat(),
            "item_ids": r.item_ids,
        }
        for r in session.scalars(
            select(AnalystRequest)
            .where(AnalystRequest.application_id == app.id)
            .order_by(AnalystRequest.id.desc())
        )
    ]
    reminders = [
        {
            "id": r.id,
            "state": r.state,
            "round": r.round,
            "scheduled_for": r.scheduled_for.isoformat() if r.scheduled_for else None,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
        }
        for r in session.scalars(
            select(Reminder).where(Reminder.application_id == app.id).order_by(Reminder.id.desc())
        )
    ]
    return {
        **summary,
        "contact_name": app.contact_name,
        "groups": list(groups.values()),
        "blocking": blocking,
        "analyst_requests": requests,
        "reminders": reminders,
        "timeline": timeline(session, app.id),
    }


# ---------------------------------------------------------------- Screen C
def reminder_view(session: Session, r: Reminder, *, now: datetime) -> dict[str, Any]:
    app = r.application
    today = ist_date(now)
    req = request_times(session, [app.id])
    outstanding = [item_view(i, today, req.get(i.id)) for i in app.items if i.state == "requested"]
    approver = session.get(Staff, r.approved_by) if r.approved_by else None
    return {
        "id": r.id,
        "application_id": app.id,
        "client_name": app.client_name,
        "contact_name": app.contact_name,
        "contact_email": app.contact_email,
        "product": app.product,
        "named_rm": {"id": r.named_rm_id, "name": app.rm.name},
        "state": r.state,
        "round": r.round,
        "round_labels": ROUND_LABELS,
        "due_date": r.due_date.isoformat(),
        "due_label": format_due(r.due_date),
        "item_ids": r.item_ids,
        "outstanding_items": outstanding,
        "items_total": len(app.items),
        "body": r.body,
        "edited_text": r.body != r.template_body,
        "ai_assisted": r.ai_assisted,
        "revision": r.revision,
        "created_by": r.created_by,
        "approved_by": approver.name if approver else None,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "scheduled_for": r.scheduled_for.isoformat() if r.scheduled_for else None,
        "sent_at": r.sent_at.isoformat() if r.sent_at else None,
    }


# ---------------------------------------------------------------- Screen D
def analyst_files(session: Session, user: Staff, *, now: datetime) -> list[dict[str, Any]]:
    today = ist_date(now)
    apps = list(session.scalars(visible_apps(session, user)).unique())
    req = request_times(session, [a.id for a in apps])
    rows = []
    for a in apps:
        s = app_summary(session, a, req, today, None, 0)
        s.pop("_items")
        rows.append(s)
    rows.sort(key=lambda r: (r["status"] == "complete", r["id"]))
    return rows


RECEIPT_EVENTS = ("request_created", "document_received", "item_waived", "file_marked_complete")


def analyst_detail(session: Session, app: Application, *, now: datetime) -> dict[str, Any]:
    d = application_detail(session, app, now=now)
    # Analyst sees document events only: no reminder wording or client messages.
    receipt_log = [e for e in d.pop("timeline") if e["event_type"] in RECEIPT_EVENTS]
    d.pop("reminders")
    d["receipt_log"] = receipt_log
    d["received_items"] = [
        i for g in d["groups"] for i in g["items"] if i["status"] in ("received", "waived")
    ]
    d["readiness"] = "complete" if d["status"] == "complete" else "blocked"
    return d


# ---------------------------------------------------------------- Screen E
def oversight(session: Session, *, now: datetime) -> dict[str, Any]:
    """Counts only. No client names, amounts or other client-level data."""
    today = ist_date(now)
    apps = list(session.scalars(select(Application)).unique())
    req = request_times(session, [a.id for a in apps])
    summaries = []
    for a in apps:
        s = app_summary(session, a, req, today, None, 0)
        summaries.append(s)
    active = [s for s in summaries if s["status"] != "complete"]
    buckets = {"0-3": 0, "4-7": 0, "8-14": 0, "15+": 0}
    for s in active:
        age = s["oldest_outstanding"]["age_days"] if s["oldest_outstanding"] else 0
        key = "0-3" if age <= 3 else "4-7" if age <= 7 else "8-14" if age <= 14 else "15+"
        buckets[key] += 1
    stages = Counter(s["stage"] for s in summaries)

    since = now - timedelta(days=30)
    ev30 = list(session.scalars(select(Event).where(Event.occurred_at >= since)))
    sent = [e for e in ev30 if e.event_type == "reminder_sent"]
    approved = [e for e in ev30 if e.event_type == "reminder_approved"]
    approved_ids = {
        e.payload["reminder_id"]: e.actor_id
        for e in session.scalars(select(Event).where(Event.event_type == "reminder_approved"))
    }
    named = dict(session.execute(select(Reminder.id, Reminder.named_rm_id)).tuples().all())
    sent_without_named_rm_approval = sum(
        1
        for e in sent
        if approved_ids.get(e.payload["reminder_id"]) != named.get(e.payload["reminder_id"])
    )
    unedited = sum(1 for e in approved if not e.payload.get("edited_text"))
    turnaround = turnaround_days(session, None, since, now)
    total_events = session.scalar(select(func.count(Event.id))) or 0
    return {
        "active_files": len(active),
        "complete_files": len(summaries) - len(active),
        "files_with_overdue_items": sum(1 for s in active if s["status"] == "overdue"),
        "overdue_share_pct": round(
            100 * sum(1 for s in active if s["status"] == "overdue") / len(active), 1
        )
        if active
        else 0.0,
        "ageing_buckets": buckets,
        "critical_stall_count": buckets["15+"],
        "stages": {k: stages[k] for k in ("doc_collection", "analyst_blocked", "complete")},
        "reminders_sent_30d": len(sent),
        "reminders_approved_30d": len(approved),
        "sent_without_named_rm_approval": sent_without_named_rm_approval,
        "approved_without_edits_pct": round(100 * unedited / len(approved), 1)
        if approved
        else None,
        "avg_turnaround_days": round(sum(turnaround) / len(turnaround), 1) if turnaround else None,
        "total_events": total_events,
    }


EVENT_LABELS = {
    "request_created": "Request Created",
    "reminder_drafted": "Reminder Drafted",
    "reminder_approved": "Reminder Approved",
    "reminder_sent": "Reminder Sent",
    "document_received": "Document Received",
    "item_waived": "Item Waived",
    "file_marked_complete": "File Marked Complete",
}


def event_view(e: Event, *, include_app: bool = True) -> dict[str, Any]:
    v: dict[str, Any] = {
        "id": e.id,
        "occurred_at": e.occurred_at.isoformat(),
        "event_type": e.event_type,
        "event_label": EVENT_LABELS[e.event_type],
        "actor_name": e.actor_name,
        "actor_role": e.actor_role,
        "actor_role_label": ROLE_LABELS.get(e.actor_role, "System"),
        "reason": e.reason,
        "kind": e.payload.get("kind"),
        "hash": e.hash,
    }
    if include_app:
        v["application_id"] = e.application_id
    return v


def audit(
    session: Session,
    *,
    now: datetime,
    q: str | None,
    event_type: str | None,
    days: int | None,
    offset: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    stmt = select(Event)
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if days:
        stmt = stmt.where(Event.occurred_at >= now - timedelta(days=days))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Event.application_id.ilike(like),
                Event.actor_name.ilike(like),
                Event.reason.ilike(like),
            )
        )
    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = session.scalars(stmt.order_by(Event.id.desc()).offset(offset).limit(limit)).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "events": [_audit_view(session, e) for e in rows],
    }


def _audit_view(session: Session, e: Event) -> dict[str, Any]:
    v = event_view(e)
    # The oversight log must not carry client names. Event reasons never include them,
    # but strip defensively in case a document name or note mentions the client.
    if e.application_id:
        app = session.get(Application, e.application_id)
        if app and app.client_name.lower() in v["reason"].lower():
            v["reason"] = v["reason"].replace(app.client_name, "[client]")
    return v
