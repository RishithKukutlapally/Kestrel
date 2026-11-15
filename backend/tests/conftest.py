from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest

os.environ.update(
    {
        "DEMO_PASSWORD_TEMPLATE": "{Name}-test-pw",
        "PASSWORD_HASH_ITERATIONS": "1000",
        "SESSION_SECRET": "test-session-secret-not-for-production",
        "COOKIE_SECURE": "false",
        "FEATURE_AI_DRAFTING": "false",
        "DATABASE_URL": "sqlite://",
    }
)
os.environ.pop("GEMINI_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import db, seed  # noqa: E402
from app.api import get_now  # noqa: E402
from app.auth import reset_throttle  # noqa: E402
from app.db import Base  # noqa: E402
from app.main import create_app  # noqa: E402

# A fixed "now": Thursday 12 Nov 2026, 12:00 IST.
NOW = datetime(2026, 11, 12, 6, 30, tzinfo=UTC)


@pytest.fixture()
def engine():  # type: ignore[no-untyped-def]
    eng = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(eng)
    with Session(eng) as s:
        seed.load(s, now=NOW)
        s.commit()
    db.set_engine(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def session(engine) -> Iterator[Session]:  # type: ignore[no-untyped-def]
    with Session(engine, expire_on_commit=False) as s:
        yield s


@pytest.fixture()
def client(engine) -> Iterator[TestClient]:  # type: ignore[no-untyped-def]
    reset_throttle()
    app = create_app()
    app.dependency_overrides[get_now] = lambda: NOW
    with TestClient(app) as c:
        yield c


def creds(staff_id: str) -> dict[str, str]:
    """Username and password for a seeded person, e.g. rm-vikram -> vikram / Vikram-test-pw."""
    name = dict((sid, n) for sid, n, _r, _t in seed.STAFF)[staff_id]
    first = name.split()[0]
    return {"username": first.lower(), "password": f"{first}-test-pw"}


def login(c: TestClient, as_user: str | None = None) -> TestClient:
    r = c.post("/auth/login", data=creds(as_user or "rm-vikram"), follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/", r.headers.get("location")
    return c


def switch(c: TestClient, staff_id: str) -> None:
    """Sign out and sign in as another person (there is no in-app role switching)."""
    c.post("/auth/logout", follow_redirects=False)
    login(c, staff_id)


def login_owner(c: TestClient) -> TestClient:
    return login(c, "ao-dev")
