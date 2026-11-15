"""Engine and session factory. Works unchanged on SQLite and PostgreSQL."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: object | None = None) -> Engine:
    target = url if url is not None else get_settings().sqlalchemy_url
    engine: Engine = create_engine(target, pool_pre_ping=True)  # type: ignore[call-overload]
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _record):  # type: ignore[no-untyped-def]
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

    return engine


_engine: Engine | None = None
_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine, _factory
    if _engine is None:
        _engine = make_engine()
        _factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def set_engine(engine: Engine) -> None:
    """Used by tests to point the app at a throwaway database."""
    global _engine, _factory
    _engine = engine
    _factory = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    get_engine()
    assert _factory is not None
    with _factory() as session:
        yield session
