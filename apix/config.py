"""Central configuration. Everything is env-overridable with the ``APIX_`` prefix.

Design rule: the code never hardcodes a secret and never hardcodes a hostname that
could change. Defaults are chosen so that ``apix pipeline run`` works on a bare
checkout with zero configuration (SQLite + reconstruction), and swapping
``APIX_DATABASE_URL`` to a Supabase/Neon string is the only change needed for
production.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
SEED_DIR = REPO_ROOT / "seed"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APIX_",
        env_file=(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------------------------------------------------------------- storage
    database_url: str = Field(
        default=f"sqlite+pysqlite:///{(DATA_DIR / 'apix.db').as_posix()}",
        description="SQLAlchemy URL. Postgres in production, SQLite for local runs.",
    )
    sql_echo: bool = False

    # ------------------------------------------------------------- compliance
    user_agent: str = Field(
        default=(
            "APIxBot/1.0 (+https://github.com/sih26056/apix; "
            "MoSPI SIH26056 airfare price index; research use)"
        ),
        description="Sent on every request. Honest, identifiable, contactable — "
        "an anonymous UA is what gets a public-sector crawler blocked.",
    )
    robots_cache_ttl_hours: int = 24
    default_crawl_delay_seconds: float = 5.0
    max_requests_per_host_per_hour: int = 60
    respect_robots: bool = Field(
        default=True,
        description="Hard gate. Setting this False is refused at runtime unless "
        "APIX_I_UNDERSTAND_THIS_IS_NON_COMPLIANT is also set; the flag exists so "
        "the gate is auditable, not so it can be turned off.",
    )
    scrape_timeout_seconds: float = 45.0
    headless: bool = True

    # ------------------------------------------------------ official fare APIs
    amadeus_client_id: str | None = None
    amadeus_client_secret: str | None = None
    amadeus_base_url: str = "https://test.api.amadeus.com"
    duffel_access_token: str | None = None
    duffel_base_url: str = "https://api.duffel.com"

    # ------------------------------------------------- official statistics API
    mospi_base_url: str = "https://api.mospi.gov.in"
    mospi_bearer_token: str | None = None
    mospi_timeout_seconds: float = 60.0

    # ------------------------------------------------------------------- index
    base_period_start: str = "2026-06-01"
    base_period_end: str = "2026-06-30"
    index_base_value: float = 100.0
    outlier_z_threshold: float = 3.0
    outlier_iqr_multiplier: float = 1.5
    surge_z_threshold: float = 2.5
    min_sources_for_corroboration: int = 2

    # -------------------------------------------------------------------- api
    api_title: str = "APIx — Real-time Airfare Price Index"
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    api_key: str | None = Field(
        default=None,
        description="If set, write/admin endpoints require X-API-Key. Read endpoints "
        "stay open because the whole point is public consumption by NSO/RBI.",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith(("postgresql", "postgres"))

    def normalised_database_url(self) -> str:
        """Accept the copy-paste form Supabase/Neon hand out and make it SQLAlchemy-safe."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://") :]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()


settings = get_settings()
