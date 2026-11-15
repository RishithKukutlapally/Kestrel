"""Pure status derivation. No database access, so it is easy to test.

ASSUMPTION (for Operations to confirm): thresholds are calendar days.
  - before the due date            -> on_track
  - due date .. due + N - 1 days   -> due_today   (N = OVERDUE_AFTER_DAYS, placeholder 2)
  - due + N days onwards           -> overdue
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Literal

IST = timezone(timedelta(hours=5, minutes=30), name="IST")

ItemStatus = Literal["on_track", "due_today", "overdue", "received", "waived"]
FileStatus = Literal["on_track", "due_today", "overdue", "complete"]
Stage = Literal["doc_collection", "analyst_blocked", "complete"]

OUTSTANDING: tuple[ItemStatus, ...] = ("on_track", "due_today", "overdue")


def now_utc() -> datetime:
    return datetime.now(UTC)


def ist_date(moment: datetime) -> date:
    return moment.astimezone(IST).date()


def item_status(state: str, due: date, today: date, overdue_after_days: int) -> ItemStatus:
    if state == "received":
        return "received"
    if state == "waived":
        return "waived"
    if state != "requested":
        raise ValueError(f"unknown item state {state!r}")
    if today < due:
        return "on_track"
    if today < due + timedelta(days=overdue_after_days):
        return "due_today"
    return "overdue"


def days_past_due(due: date, today: date) -> int:
    return max(0, (today - due).days)


def file_status(statuses: Iterable[ItemStatus]) -> FileStatus:
    outstanding = [s for s in statuses if s in OUTSTANDING]
    if not outstanding:
        return "complete"
    if "overdue" in outstanding:
        return "overdue"
    if "due_today" in outstanding:
        return "due_today"
    return "on_track"


def stage(statuses: Iterable[ItemStatus], analyst_assigned: bool) -> Stage:
    if file_status(statuses) == "complete":
        return "complete"
    return "analyst_blocked" if analyst_assigned else "doc_collection"


STATUS_LABELS: dict[str, str] = {
    "on_track": "On track",
    "due_today": "Due today",
    "overdue": "Overdue",
    "received": "Received",
    "waived": "Waived",
    "complete": "Complete",
}

STAGE_LABELS: dict[str, str] = {
    "doc_collection": "Doc Collection",
    "analyst_blocked": "Analyst Blocked",
    "complete": "Complete",
}
