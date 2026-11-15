from datetime import date

import pytest

from app.domain.status import days_past_due, file_status, item_status, stage

DUE = date(2026, 11, 10)


@pytest.mark.parametrize(
    ("today", "expected"),
    [
        (date(2026, 11, 9), "on_track"),
        (date(2026, 11, 10), "due_today"),  # on the due date
        (date(2026, 11, 11), "due_today"),  # grace day before the 2-day threshold
        (date(2026, 11, 12), "overdue"),  # two days after the due date
        (date(2026, 12, 1), "overdue"),
    ],
)
def test_requested_item_thresholds(today: date, expected: str) -> None:
    assert item_status("requested", DUE, today, overdue_after_days=2) == expected


def test_threshold_is_configurable() -> None:
    assert item_status("requested", DUE, date(2026, 11, 11), overdue_after_days=1) == "overdue"


def test_received_and_waived_are_never_overdue() -> None:
    late = date(2027, 1, 1)
    assert item_status("received", DUE, late, 2) == "received"
    assert item_status("waived", DUE, late, 2) == "waived"


def test_unknown_state_rejected() -> None:
    with pytest.raises(ValueError):
        item_status("approved", DUE, DUE, 2)


def test_file_status_takes_worst_outstanding_item() -> None:
    assert file_status(["received", "on_track", "overdue"]) == "overdue"
    assert file_status(["received", "due_today", "on_track"]) == "due_today"
    assert file_status(["on_track"]) == "on_track"
    assert file_status(["received", "waived"]) == "complete"


def test_stage() -> None:
    assert stage(["received"], analyst_assigned=True) == "complete"
    assert stage(["overdue"], analyst_assigned=True) == "analyst_blocked"
    assert stage(["overdue"], analyst_assigned=False) == "doc_collection"


def test_days_past_due() -> None:
    assert days_past_due(DUE, date(2026, 11, 13)) == 3
    assert days_past_due(DUE, date(2026, 11, 1)) == 0
