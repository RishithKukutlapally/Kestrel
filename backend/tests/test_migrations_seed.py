"""Alembic migration and the re-runnable seed, against a real SQLite file."""

from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import Session

from app import db, seed
from app.domain.events import verify_chain
from app.models import Application


@pytest.fixture()
def file_engine(tmp_path: Path):  # type: ignore[no-untyped-def]
    eng = create_engine(f"sqlite:///{(tmp_path / 'k.db').as_posix()}")
    db.set_engine(eng)
    yield eng
    eng.dispose()


def test_migration_creates_schema_and_triggers(file_engine) -> None:  # type: ignore[no-untyped-def]
    seed.migrate(file_engine)
    tables = set(inspect(file_engine).get_table_names())
    assert {
        "applications",
        "document_items",
        "events",
        "reminders",
        "staff",
        "checklist_rules",
        "analyst_requests",
        "alembic_version",
    } <= tables
    with file_engine.connect() as conn:
        triggers = (
            conn.execute(text("SELECT name FROM sqlite_master WHERE type='trigger'"))
            .scalars()
            .all()
        )
    assert set(triggers) == {"events_no_update", "events_no_delete"}


def test_seed_is_rerunnable_only_with_reset(file_engine) -> None:  # type: ignore[no-untyped-def]
    assert seed.main([]) == 0
    assert seed.main([]) == 1  # refuses to overwrite existing data
    assert seed.main(["--reset"]) == 0
    with Session(file_engine) as s:
        assert len(s.scalars(select(Application.id)).all()) == 12
        assert verify_chain(s)[0]
        with pytest.raises(DatabaseError):
            s.execute(text("DELETE FROM events"))
