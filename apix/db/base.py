"""Engine / session plumbing plus the portable column types."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import JSON, DateTime, Numeric, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import TIMESTAMP as PG_TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from apix.config import settings

# ---------------------------------------------------------------- portable types
#: JSONB on Postgres, plain JSON on SQLite. Used for raw payload retention — the PS
#: asks for a de-duplicated database *with metadata*, and keeping the untouched
#: payload is what makes every downstream number auditable back to its source.
JSONType = JSON().with_variant(JSONB(astext_type=None), "postgresql")

#: Timezone-aware everywhere. Fare timestamps without a timezone are a trap: fares
#: are quoted in IST, collected by a UTC runner, and consumed by both.
TimestampType = DateTime(timezone=True).with_variant(
    PG_TIMESTAMP(timezone=True), "postgresql"
)

#: Money. NUMERIC(12,2) on Postgres so no float drift ever reaches a published index.
MoneyType = Numeric(12, 2).with_variant(Numeric(12, 2), "postgresql")

#: Index values and weights need more decimals than money does.
RatioType = Numeric(18, 8).with_variant(Numeric(18, 8), "postgresql")


class Base(DeclarativeBase):
    type_annotation_map: dict[Any, Any] = {}


_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine():
    global _engine
    if _engine is None:
        url = settings.normalised_database_url()
        kwargs: dict[str, Any] = {"echo": settings.sql_echo, "future": True}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs.update(pool_pre_ping=True, pool_size=5, max_overflow=10)
        _engine = create_engine(url, **kwargs)
        if url.startswith("sqlite"):

            @event.listens_for(_engine, "connect")
            def _sqlite_pragmas(dbapi_conn, _rec):  # pragma: no cover - trivial
                cur = dbapi_conn.cursor()
                cur.execute("PRAGMA journal_mode=WAL")
                cur.execute("PRAGMA foreign_keys=ON")
                cur.close()

    return _engine


def get_session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False, future=True)
    return _SessionLocal()


@contextmanager
def session_scope() -> Iterator[Session]:
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create every table that does not exist yet. Idempotent."""
    import apix.db.models  # noqa: F401  (registers mappers)

    Base.metadata.create_all(bind=get_engine())


def reset_db() -> None:
    """Drop and recreate. Used by tests and by ``apix db reset``."""
    import apix.db.models  # noqa: F401

    Base.metadata.drop_all(bind=get_engine())
    Base.metadata.create_all(bind=get_engine())


engine = get_engine
