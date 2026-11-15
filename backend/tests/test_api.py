import json
import re

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import Session

from app.domain.events import verify_chain
from app.models import Application, Event
from tests.conftest import creds, login, switch

CREDIT_WORDS = re.compile(
    r"(cibil|credit score|score\b|limit\b|turnover|dscr|amount|₹\s?\d|\bpan\b|aadhaar|gstin|"
    r"account number|a/c|ifsc|approve the loan|reject|sanction)",
    re.IGNORECASE,
)


# ------------------------------------------------------------------ access gate
def test_healthz_is_public(client) -> None:  # type: ignore[no-untyped-def]
    r = client.get("/healthz")
    assert r.status_code == 200 and r.json()["status"] == "ok" and r.json()["version"]


def test_api_and_pages_require_login(client) -> None:  # type: ignore[no-untyped-def]
    assert client.get("/api/queue").status_code == 401
    r = client.get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"


def test_wrong_code_is_rejected(client) -> None:  # type: ignore[no-untyped-def]
    r = client.post(
        "/auth/login", data={"username": "vikram", "password": "nope"}, follow_redirects=False
    )
    assert r.headers["location"] == "/login?error=1"
    assert client.get("/api/queue").status_code == 401


def test_cookie_flags(client) -> None:  # type: ignore[no-untyped-def]
    r = client.post("/auth/login", data=creds("rm-vikram"), follow_redirects=False)
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "test-pw" not in cookie


def test_secure_flag_when_enabled(engine, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from fastapi.testclient import TestClient

    from app.config import Settings
    from app.main import create_app

    app = create_app(Settings(cookie_secure=True))
    with TestClient(app, base_url="https://testserver") as c:
        r = c.post("/auth/login", data=creds("rm-vikram"), follow_redirects=False)
        assert "secure" in r.headers["set-cookie"].lower()


def test_logout(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client)
    c.post("/auth/logout", follow_redirects=False)
    assert c.get("/api/queue").status_code == 401


def test_security_headers(client) -> None:  # type: ignore[no-untyped-def]
    r = client.get("/healthz")
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert r.headers["x-content-type-options"] == "nosniff"


# ------------------------------------------------------------------ roles
def test_rm_sees_only_own_portfolio(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    rows = c.get("/api/queue").json()["rows"]
    assert rows and {r["rm"]["id"] for r in rows} == {"rm-vikram"}
    assert c.get("/api/applications/KF-2026-1082").status_code == 404  # Priya's file


def test_coordinator_sees_full_queue(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    data = c.get("/api/queue").json()
    assert len(data["rows"]) == 12
    assert data["summary"]["open"] + data["summary"]["complete"] == 12


@pytest.mark.parametrize("who", ["cm-meera", "cro-rahul"])
def test_oversight_roles_get_no_client_level_data(client, who: str) -> None:  # type: ignore[no-untyped-def]
    c = login(client, who)
    assert c.get("/api/queue").status_code == 403
    assert c.get("/api/applications/KF-2026-1049").status_code == 404
    assert c.get("/api/analyst/files").status_code == 403
    summary = c.get("/api/oversight/summary")
    audit = c.get("/api/audit?limit=200")
    assert summary.status_code == 200 and audit.status_code == 200
    blob = json.dumps(summary.json(), ensure_ascii=False) + json.dumps(
        audit.json(), ensure_ascii=False
    )
    for name in _client_names():
        assert name not in blob
    assert "contact_email" not in blob and "client_name" not in blob


def test_analyst_view_scoped_to_assigned_files(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "an-ananya")
    files = c.get("/api/analyst/files").json()
    assert {f["analyst"]["id"] for f in files} == {"an-ananya"}
    assert c.get("/api/analyst/files/KF-2026-1033").status_code == 404  # Karan's file
    assert c.get("/api/queue").status_code == 403
    d = c.get("/api/applications/KF-2026-1021").json()
    assert "reminders" not in d
    assert all(e["event_type"] != "reminder_sent" for e in d["timeline"])


def test_rm_cannot_mark_received_but_coordinator_can(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    item = _outstanding_item(c, "KF-2026-1203")
    assert c.post(f"/api/applications/KF-2026-1203/items/{item}/receive").status_code == 403
    switch(c, "coord-sunita")
    assert c.post(f"/api/applications/KF-2026-1203/items/{item}/receive").status_code == 200
    assert c.post(f"/api/applications/KF-2026-1203/items/{item}/receive").status_code == 409


# ------------------------------------------------------------------ waivers, completion, analyst requests
def test_waiver_requires_reason(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "rm-vikram")
    item = _outstanding_item(c, "KF-2026-1203")
    assert (
        c.post(
            f"/api/applications/KF-2026-1203/items/{item}/waive", json={"reason": ""}
        ).status_code
        == 422
    )
    assert c.post(f"/api/applications/KF-2026-1203/items/{item}/waive", json={}).status_code == 422
    r = c.post(
        f"/api/applications/KF-2026-1203/items/{item}/waive",
        json={"reason": "Already held from an earlier facility"},
    )
    assert r.status_code == 200
    d = c.get("/api/applications/KF-2026-1203").json()
    waived = [i for g in d["groups"] for i in g["items"] if i["id"] == item][0]
    assert waived["status"] == "waived" and waived["waived_reason"]


def test_file_marked_complete_when_last_item_closed(client, session: Session) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    d = c.get("/api/applications/KF-2026-1231").json()
    assert d["outstanding_count"] == 1
    c.post(f"/api/applications/KF-2026-1231/items/{d['blocking'][0]['id']}/receive")
    d = c.get("/api/applications/KF-2026-1231").json()
    assert d["status"] == "complete" and d["timeline"][0]["event_type"] == "file_marked_complete"


def test_request_from_rm_creates_linked_request(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "an-karan")
    d = c.get("/api/analyst/files/KF-2026-1033").json()
    assert d["readiness"] == "blocked"
    ids = [i["id"] for i in d["blocking"]]
    r = c.post(
        "/api/analyst/files/KF-2026-1033/request-from-rm",
        json={"item_ids": ids[:1], "note": "Please chase the audited accounts."},
    )
    assert r.status_code == 200 and r.json()["rm"] == "Rohan Mehta"
    switch(c, "rm-rohan")
    row = [x for x in c.get("/api/queue").json()["rows"] if x["id"] == "KF-2026-1033"][0]
    assert row["open_analyst_requests"] == 1
    detail = c.get("/api/applications/KF-2026-1033").json()
    assert detail["analyst_requests"][0]["note"] == "Please chase the audited accounts."


# ------------------------------------------------------------------ queue
def test_queue_sorted_by_oldest_outstanding_item(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    rows = c.get("/api/queue").json()["rows"]
    ages = [r["oldest_outstanding"]["age_days"] for r in rows if r["oldest_outstanding"]]
    assert ages == sorted(ages, reverse=True)
    assert rows[-1]["status"] == "complete"


def test_queue_filters_and_statuses(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    data = c.get("/api/queue").json()
    statuses = {r["status"] for r in data["rows"]}
    assert {"overdue", "due_today", "on_track", "complete"} <= statuses
    assert all(r["rm"]["id"] == "rm-priya" for r in c.get("/api/queue?rm=rm-priya").json()["rows"])
    assert all(
        r["stage"] == "analyst_blocked"
        for r in c.get("/api/queue?stage=analyst_blocked").json()["rows"]
    )
    assert [r["id"] for r in c.get("/api/queue?q=quillstone").json()["rows"]] == ["KF-2026-1049"]
    assert c.get("/api/queue?sort=bogus").status_code == 422
    assert data["summary"]["overdue"] == sum(1 for r in data["rows"] if r["status"] == "overdue")


# ------------------------------------------------------------------ event log
def test_event_chain_verifies_and_detects_tampering(session: Session) -> None:
    ok, bad, n = verify_chain(session)
    assert ok and bad is None and n > 50
    ev = session.scalar(select(Event).order_by(Event.id).offset(5).limit(1))
    assert ev is not None
    with session.no_autoflush:  # in-memory edit; the DB trigger would block writing it
        ev.reason = "tampered"
        ok, bad, _ = verify_chain(session)
    assert ok is False and bad == ev.id
    session.rollback()


def test_database_rejects_update_and_delete_of_events(session: Session) -> None:
    with pytest.raises(DatabaseError):
        session.execute(text("UPDATE events SET reason = 'x' WHERE id = 1"))
    session.rollback()
    with pytest.raises(DatabaseError):
        session.execute(text("DELETE FROM events WHERE id = 1"))
    session.rollback()


def test_audit_search_and_verify(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cro-rahul")
    r = c.get("/api/audit?type=item_waived").json()
    assert r["total"] >= 2 and all(e["event_type"] == "item_waived" for e in r["events"])
    assert c.get("/api/audit?q=KF-2026-1049").json()["total"] > 0
    assert c.get("/api/audit/verify").json()["ok"] is True
    csv = c.get("/api/audit.csv")
    assert csv.status_code == 200 and csv.text.startswith("event_id,")


def test_oversight_counts(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "cm-meera")
    s = c.get("/api/oversight/summary").json()
    assert s["active_files"] + s["complete_files"] == 12
    assert s["sent_without_named_rm_approval"] == 0
    assert s["reminders_sent_30d"] >= 1
    assert sum(s["ageing_buckets"].values()) == s["active_files"]


# ------------------------------------------------------------------ scope guards
def test_no_credit_data_in_any_response(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    blobs = [c.get("/api/queue").text]
    for row in c.get("/api/queue").json()["rows"]:
        blobs.append(c.get(f"/api/applications/{row['id']}").text)
    # The loan band ("Up to ₹10L", "₹10L–₹25L") selects the checklist; it is not an amount.
    cleaned = [
        json.dumps(json.loads(b), ensure_ascii=False)
        .replace("₹10L–₹25L", "")
        .replace("Up to ₹10L", "")
        for b in blobs
    ]
    hits = {m.group(0) for b in cleaned for m in CREDIT_WORDS.finditer(b)}
    assert hits == set(), hits


def test_no_credit_decision_routes(client) -> None:  # type: ignore[no-untyped-def]
    paths = " ".join(getattr(r, "path", "") for r in client.app.routes).lower()
    for word in ("decision", "approve-loan", "reject", "sanction", "score"):
        assert word not in paths


# ------------------------------------------------------------------ helpers
def _outstanding_item(c, app_id: str) -> int:  # type: ignore[no-untyped-def]
    d = c.get(f"/api/applications/{app_id}").json()
    return int(d["blocking"][0]["id"])


def _client_names() -> list[str]:
    from app.seed import CASES

    return [x.client for x in CASES]


def test_application_ids_are_synthetic_format(session: Session) -> None:
    ids = session.scalars(select(Application.id)).all()
    assert len(ids) == 12 and all(re.fullmatch(r"KF-2026-\d{4}", i) for i in ids)


def test_each_person_signs_in_with_own_password(client) -> None:  # type: ignore[no-untyped-def]
    from app.seed import STAFF

    for sid, _name, role, _title in STAFF:
        c = login(client, sid)
        info = c.get("/api/session").json()
        assert info["user"]["id"] == sid and info["user"]["role"] == role
        assert info["locked"] is True and [u["id"] for u in info["demo_users"]] == [sid]
        c.post("/auth/logout")
    bad = {**creds("rm-vikram"), "password": creds("cm-meera")["password"]}
    r = client.post("/auth/login", data=bad, follow_redirects=False)
    assert r.headers["location"] == "/login?error=1"


def test_role_switching_is_disabled(client) -> None:  # type: ignore[no-untyped-def]
    c = login(client, "coord-sunita")
    assert c.post("/api/session/switch", json={"staff_id": "cm-meera"}).status_code == 403
    assert c.get("/api/session").json()["user"]["id"] == "coord-sunita"


def test_passwords_are_hashed(session) -> None:  # type: ignore[no-untyped-def]
    from app.models import Staff

    for s in session.query(Staff).all():
        assert s.password_hash and s.password_hash.startswith("pbkdf2_sha256$")
        assert "test-pw" not in s.password_hash
