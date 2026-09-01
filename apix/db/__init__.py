"""Database layer: engine, session factory and schema.

Postgres is the deployment target (Supabase/Neon). SQLite is a first-class local
target so that the whole pipeline and the entire test suite run on a bare checkout
with no server. That is achieved with column-level ``.with_variant()`` rather than
by dumbing the schema down to a lowest common denominator — Postgres still gets
``JSONB``, ``TIMESTAMPTZ`` and ``NUMERIC``.
"""

from apix.db.base import (
    Base,
    engine,
    get_engine,
    get_session,
    init_db,
    reset_db,
    session_scope,
)

__all__ = [
    "Base",
    "engine",
    "get_engine",
    "get_session",
    "init_db",
    "reset_db",
    "session_scope",
]
