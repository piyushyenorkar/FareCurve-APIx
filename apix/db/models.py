"""The APIx schema.

Table-by-table mapping to the PS deliverables:

  (b) "cleaned and de-duplicated airfare database with metadata"
        -> raw_fare_snapshots  (untouched, append-only, audit source of truth)
        -> cleaned_fares       (deduped, outlier-flagged, fare components split)
  (c) "index-construction module based on PSD given routes and weights"
        -> route_weights (versioned) + index_values + elasticity_points
  Cleaning requirements    -> cleaned_fares.is_outlier / outlier_reason / availability
  Ethical scraping         -> robots_snapshots + compliance_audit + collection_runs
  USP forecast             -> forecasts
  USP anomaly detection    -> anomalies
  USP confidence score     -> data_quality_log
  USP ATF correlation      -> reference_observations (WPI ATF series)
  30-day backtest          -> backtest_results (vs DGCA fares AND vs CPI item 294)
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apix.db.base import Base, JSONType, MoneyType, RatioType, TimestampType


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        TimestampType, server_default=func.now(), nullable=False
    )


# =====================================================================  collection


class CollectionRun(Base, TimestampMixin):
    """One invocation of the collector. Every observation points back to its run,
    so any published number can be traced to the exact run that produced it."""

    __tablename__ = "collection_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    started_at: Mapped[datetime] = mapped_column(TimestampType, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(TimestampType)
    trigger: Mapped[str] = mapped_column(String(32), default="manual")
    status: Mapped[str] = mapped_column(String(24), default="running")
    sources_attempted: Mapped[int] = mapped_column(Integer, default=0)
    sources_allowed: Mapped[int] = mapped_column(Integer, default=0)
    sources_blocked: Mapped[int] = mapped_column(Integer, default=0)
    observations_written: Mapped[int] = mapped_column(Integer, default=0)
    requests_issued: Mapped[int] = mapped_column(Integer, default=0)
    seconds_spent_waiting: Mapped[float] = mapped_column(Float, default=0.0)
    git_sha: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    detail: Mapped[dict | None] = mapped_column(JSONType)

    snapshots: Mapped[list[RawFareSnapshot]] = relationship(back_populates="run")


class RawFareSnapshot(Base, TimestampMixin):
    """Append-only. Never updated, never deleted. The cleaning stage reads from here
    and writes elsewhere, so raw evidence survives every methodology change."""

    __tablename__ = "raw_fare_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int | None] = mapped_column(ForeignKey("collection_runs.id"), index=True)

    source_slug: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    provenance: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    route_key: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    observed_at: Mapped[datetime] = mapped_column(TimestampType, nullable=False, index=True)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    booking_window_days: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    carrier_code: Mapped[str | None] = mapped_column(String(3))
    carrier_name: Mapped[str | None] = mapped_column(String(64))
    flight_number: Mapped[str | None] = mapped_column(String(16))
    departure_time_local: Mapped[str | None] = mapped_column(String(8))
    arrival_time_local: Mapped[str | None] = mapped_column(String(8))
    stops: Mapped[int | None] = mapped_column(Integer)
    fare_class: Mapped[str | None] = mapped_column(String(24))
    fare_brand: Mapped[str | None] = mapped_column(String(48))
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    base_fare: Mapped[float | None] = mapped_column(MoneyType)
    taxes: Mapped[float | None] = mapped_column(MoneyType)
    user_development_fee: Mapped[float | None] = mapped_column(MoneyType)
    convenience_fee: Mapped[float | None] = mapped_column(MoneyType)
    other_charges: Mapped[float | None] = mapped_column(MoneyType)
    total_fare: Mapped[float | None] = mapped_column(MoneyType)
    components_are_reported: Mapped[bool] = mapped_column(Boolean, default=False)

    seats_remaining: Mapped[int | None] = mapped_column(Integer)
    availability_status: Mapped[str] = mapped_column(String(24), default="available")
    fetch_status: Mapped[int | None] = mapped_column(Integer)
    fetch_error: Mapped[str | None] = mapped_column(Text)
    request_url: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    raw_payload: Mapped[dict | None] = mapped_column(JSONType)

    run: Mapped[CollectionRun | None] = relationship(back_populates="snapshots")

    __table_args__ = (
        Index("ix_raw_route_window_obs", "route_key", "booking_window_days", "observation_date"),
        Index("ix_raw_source_obs", "source_slug", "observation_date"),
        UniqueConstraint(
            "source_slug",
            "route_key",
            "travel_date",
            "booking_window_days",
            "carrier_code",
            "flight_number",
            "observation_date",
            "content_hash",
            name="uq_raw_dedupe",
        ),
    )


class CleanedFare(Base, TimestampMixin):
    """Output of the cleaning pipeline: one row per accepted observation, with fare
    components resolved and outliers marked (not deleted — the PS wants outliers
    handled, and our USP is classifying them, which needs them retained)."""

    __tablename__ = "cleaned_fares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raw_id: Mapped[int] = mapped_column(
        ForeignKey("raw_fare_snapshots.id"), unique=True, index=True
    )

    source_slug: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    provenance: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    route_key: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    observed_at: Mapped[datetime] = mapped_column(TimestampType, nullable=False)
    booking_window_days: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    carrier_code: Mapped[str | None] = mapped_column(String(3), index=True)
    flight_number: Mapped[str | None] = mapped_column(String(16))
    fare_class: Mapped[str | None] = mapped_column(String(24))

    base_fare: Mapped[float | None] = mapped_column(MoneyType)
    taxes: Mapped[float | None] = mapped_column(MoneyType)
    user_development_fee: Mapped[float | None] = mapped_column(MoneyType)
    convenience_fee: Mapped[float | None] = mapped_column(MoneyType)
    other_charges: Mapped[float | None] = mapped_column(MoneyType)
    total_fare: Mapped[float | None] = mapped_column(MoneyType)

    #: How base_fare came to be. 'reported' = the page/API itemised it.
    #: 'estimated_statutory' = derived with the published statutory schedule
    #: (see apix/pipeline/fares.py). 'unavailable' = we refuse to guess.
    base_fare_method: Mapped[str] = mapped_column(String(24), default="unavailable")
    tax_share_pct: Mapped[float | None] = mapped_column(RatioType)

    availability_status: Mapped[str] = mapped_column(String(24), default="available")
    is_outlier: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    outlier_reason: Mapped[str | None] = mapped_column(String(64))
    outlier_score: Mapped[float | None] = mapped_column(RatioType)
    is_imputed: Mapped[bool] = mapped_column(Boolean, default=False)
    imputation_method: Mapped[str | None] = mapped_column(String(32))
    dedupe_group: Mapped[str | None] = mapped_column(String(64), index=True)
    included_in_index: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    exclusion_reason: Mapped[str | None] = mapped_column(String(64))

    __table_args__ = (
        Index("ix_clean_cell", "route_key", "booking_window_days", "observation_date"),
        Index("ix_clean_prov_obs", "provenance", "observation_date"),
    )


# =========================================================================  weights


class RouteWeight(Base, TimestampMixin):
    """Versioned index weights. A published index number must be reproducible, so
    weights are never edited in place — a new ``vintage`` is inserted and the old one
    is kept forever."""

    __tablename__ = "route_weights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vintage: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    route_key: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    tier: Mapped[int] = mapped_column(Integer, default=1)

    annual_passengers: Mapped[float | None] = mapped_column(RatioType)
    weight_raw: Mapped[float] = mapped_column(RatioType, nullable=False)
    weight: Mapped[float] = mapped_column(RatioType, nullable=False)
    weight_basis: Mapped[str] = mapped_column(String(48), default="dgca_od_passengers")

    source_citation: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    reference_period: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    __table_args__ = (UniqueConstraint("vintage", "route_key", name="uq_weight_vintage_route"),)


class BookingWindowWeight(Base, TimestampMixin):
    """How the five advance-purchase windows are combined into one headline number.

    This is the second half of "PSD given routes and weights" and it is a real
    methodological choice: weights approximate the observed distribution of when
    Indian travellers actually buy, so the headline APIx reflects purchase behaviour
    rather than treating a 45-day-out fare as equally representative as a walk-up."""

    __tablename__ = "booking_window_weights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vintage: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    booking_window_days: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[float] = mapped_column(RatioType, nullable=False)
    source_citation: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    __table_args__ = (
        UniqueConstraint("vintage", "booking_window_days", name="uq_bww_vintage_window"),
    )


# ===========================================================================  index


class IndexValue(Base, TimestampMixin):
    """One published index number.

    Dimensions are nullable-as-aggregate: ``route_key IS NULL`` means all-routes,
    ``booking_window_days IS NULL`` means all-windows. So the headline APIx is the
    row where both are NULL, and the dashboard's sub-indices are the rows where one
    or both are set. One table, no duplication, trivial to query.
    """

    __tablename__ = "index_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    frequency: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_label: Mapped[str] = mapped_column(String(16), nullable=False)

    route_key: Mapped[str | None] = mapped_column(String(8), index=True)
    booking_window_days: Mapped[int | None] = mapped_column(Integer, index=True)
    carrier_code: Mapped[str | None] = mapped_column(String(3))

    index_value: Mapped[float] = mapped_column(RatioType, nullable=False)
    index_value_total_fare: Mapped[float | None] = mapped_column(RatioType)
    mom_change_pct: Mapped[float | None] = mapped_column(RatioType)
    yoy_change_pct: Mapped[float | None] = mapped_column(RatioType)

    mean_fare: Mapped[float | None] = mapped_column(MoneyType)
    median_fare: Mapped[float | None] = mapped_column(MoneyType)
    p25_fare: Mapped[float | None] = mapped_column(MoneyType)
    p75_fare: Mapped[float | None] = mapped_column(MoneyType)

    observation_count: Mapped[int] = mapped_column(Integer, default=0)
    cell_count: Mapped[int] = mapped_column(Integer, default=0)
    cells_expected: Mapped[int] = mapped_column(Integer, default=0)
    confidence_pct: Mapped[float | None] = mapped_column(RatioType)

    #: Share of contributing observations that were LIVE_SCRAPE or OFFICIAL_API.
    #: The dashboard renders this on every chart so a reader always knows how much
    #: of a number is real. Non-negotiable.
    observed_share_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    provenance_mix: Mapped[dict | None] = mapped_column(JSONType)

    weight_vintage: Mapped[str | None] = mapped_column(String(32))
    base_period_label: Mapped[str | None] = mapped_column(String(32))
    method: Mapped[str] = mapped_column(String(48), default="laspeyres_weighted_relative")
    is_provisional: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint(
            "frequency",
            "period_start",
            "route_key",
            "booking_window_days",
            "carrier_code",
            name="uq_index_cell",
        ),
        Index("ix_index_lookup", "frequency", "route_key", "booking_window_days", "period_start"),
    )


class ElasticityPoint(Base, TimestampMixin):
    """Lead-time elasticity: the shape of the booking curve, and its slope.

    ``elasticity`` is d(ln fare)/d(ln days_to_departure) estimated by OLS across the
    five windows. Negative = fares fall the earlier you book, which is the expected
    sign; magnitude is how steeply. This is the headline USP in one number."""

    __tablename__ = "elasticity_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    as_of: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    window_days: Mapped[int] = mapped_column(Integer, default=28)
    route_key: Mapped[str | None] = mapped_column(String(8), index=True)
    booking_window_days: Mapped[int | None] = mapped_column(Integer)

    mean_fare: Mapped[float | None] = mapped_column(MoneyType)
    median_fare: Mapped[float | None] = mapped_column(MoneyType)
    index_relative_to_t45: Mapped[float | None] = mapped_column(RatioType)
    elasticity: Mapped[float | None] = mapped_column(RatioType)
    r_squared: Mapped[float | None] = mapped_column(RatioType)
    observation_count: Mapped[int] = mapped_column(Integer, default=0)
    observed_share_pct: Mapped[float] = mapped_column(RatioType, default=0.0)

    __table_args__ = (
        UniqueConstraint(
            "as_of", "window_days", "route_key", "booking_window_days", name="uq_elasticity_cell"
        ),
    )


# ========================================================================  analytics


class Anomaly(Base, TimestampMixin):
    """A flagged cell, classified rather than silently dropped.

    ``flag_type``:
      genuine_surge   -- corroborated by >= N independent sources on the same day
      data_error      -- one source disagrees sharply with its peers
      single_source   -- extreme, but only one source covers the cell, so unprovable
      collapse        -- an unusually large *fall* (capacity dumping, fare war)
    """

    __tablename__ = "anomalies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    detected_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    route_key: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    booking_window_days: Mapped[int | None] = mapped_column(Integer)
    flag_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(12), default="medium")

    observed_fare: Mapped[float | None] = mapped_column(MoneyType)
    expected_fare: Mapped[float | None] = mapped_column(MoneyType)
    deviation_pct: Mapped[float | None] = mapped_column(RatioType)
    z_score: Mapped[float | None] = mapped_column(RatioType)
    rolling_mean: Mapped[float | None] = mapped_column(MoneyType)
    rolling_std: Mapped[float | None] = mapped_column(MoneyType)

    corroborating_sources: Mapped[int] = mapped_column(Integer, default=0)
    dissenting_sources: Mapped[int] = mapped_column(Integer, default=0)
    source_breakdown: Mapped[dict | None] = mapped_column(JSONType)
    excluded_from_index: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    likely_driver: Mapped[str | None] = mapped_column(String(64))

    __table_args__ = (
        UniqueConstraint(
            "detected_on", "route_key", "booking_window_days", "flag_type", name="uq_anomaly_cell"
        ),
    )


class Forecast(Base, TimestampMixin):
    """Forward fare path plus a buy-now-or-wait recommendation."""

    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    generated_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    route_key: Mapped[str | None] = mapped_column(String(8), index=True)
    booking_window_days: Mapped[int | None] = mapped_column(Integer)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False)

    predicted_value: Mapped[float] = mapped_column(RatioType, nullable=False)
    ci_lower: Mapped[float | None] = mapped_column(RatioType)
    ci_upper: Mapped[float | None] = mapped_column(RatioType)
    ci_level: Mapped[float] = mapped_column(RatioType, default=0.80)

    target_kind: Mapped[str] = mapped_column(String(16), default="index")
    model_used: Mapped[str] = mapped_column(String(48), nullable=False)
    model_params: Mapped[dict | None] = mapped_column(JSONType)
    train_points: Mapped[int] = mapped_column(Integer, default=0)
    backtest_mape: Mapped[float | None] = mapped_column(RatioType)

    recommendation: Mapped[str | None] = mapped_column(String(16))
    recommendation_rationale: Mapped[str | None] = mapped_column(Text)
    expected_change_pct: Mapped[float | None] = mapped_column(RatioType)

    __table_args__ = (
        UniqueConstraint(
            "generated_on",
            "route_key",
            "booking_window_days",
            "target_date",
            "target_kind",
            name="uq_forecast_cell",
        ),
    )


class DataQualityLog(Base, TimestampMixin):
    """The confidence-score USP, stored rather than computed on the fly so that the
    number shown next to a historical index value is the number that was true then."""

    __tablename__ = "data_quality_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(32), default="overall", index=True)
    scope_key: Mapped[str | None] = mapped_column(String(32), index=True)

    expected_data_points: Mapped[int] = mapped_column(Integer, default=0)
    actual_data_points: Mapped[int] = mapped_column(Integer, default=0)
    observed_data_points: Mapped[int] = mapped_column(Integer, default=0)
    reconstructed_data_points: Mapped[int] = mapped_column(Integer, default=0)
    outlier_points: Mapped[int] = mapped_column(Integer, default=0)
    sold_out_points: Mapped[int] = mapped_column(Integer, default=0)
    failed_points: Mapped[int] = mapped_column(Integer, default=0)
    blocked_points: Mapped[int] = mapped_column(Integer, default=0)

    coverage_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    cell_coverage_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    source_coverage_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    observed_share_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    confidence_pct: Mapped[float] = mapped_column(RatioType, default=0.0)
    confidence_band: Mapped[str] = mapped_column(String(12), default="low")
    components: Mapped[dict | None] = mapped_column(JSONType)
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("log_date", "scope", "scope_key", name="uq_quality_scope"),
    )


# =======================================================================  compliance


class RobotsSnapshot(Base, TimestampMixin):
    """A dated record of what each operator's robots.txt said and how we read it.

    Two reasons this is a table and not a log line. First, it is the evidence behind
    the compliance matrix on the dashboard. Second, if an operator changes policy,
    the history explains why APIx's coverage changed on a given date — which is
    exactly the question a statistical auditor would ask."""

    __tablename__ = "robots_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_slug: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    host: Mapped[str] = mapped_column(String(128), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(TimestampType, nullable=False, index=True)
    http_status: Mapped[int | None] = mapped_column(Integer)

    checked_path: Mapped[str] = mapped_column(Text, nullable=False)
    verdict: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    governing_group: Mapped[str | None] = mapped_column(String(128))
    governing_rule: Mapped[str | None] = mapped_column(Text)
    rule_line_number: Mapped[int | None] = mapped_column(Integer)
    crawl_delay: Mapped[float | None] = mapped_column(Float)
    effective_delay: Mapped[float | None] = mapped_column(Float)

    anomalies: Mapped[list | None] = mapped_column(JSONType)
    sitemaps: Mapped[list | None] = mapped_column(JSONType)
    content_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    raw_robots_txt: Mapped[str | None] = mapped_column(Text)
    changed_from_previous: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (Index("ix_robots_source_time", "source_slug", "fetched_at"),)


class ComplianceAudit(Base, TimestampMixin):
    """Every access decision the gate made. Allow and deny alike.

    This is the single most important table for defending the ethics claim: it is
    impossible for a request to have happened without a row here, because the gate
    writes the row before the adapter is handed permission."""

    __tablename__ = "compliance_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_uid: Mapped[str | None] = mapped_column(String(64), index=True)
    decided_at: Mapped[datetime] = mapped_column(TimestampType, nullable=False, index=True)
    source_slug: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    reason_code: Mapped[str] = mapped_column(String(48), nullable=False)
    reason_detail: Mapped[str | None] = mapped_column(Text)
    robots_snapshot_id: Mapped[int | None] = mapped_column(ForeignKey("robots_snapshots.id"))
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)
    delay_applied_seconds: Mapped[float | None] = mapped_column(Float)
    hourly_budget_remaining: Mapped[int | None] = mapped_column(Integer)


# ========================================================================  reference


class ReferenceSeries(Base, TimestampMixin):
    """Metadata for an official series we ingest (CPI item 294, WPI ATF, DGCA fares).

    Kept generic on purpose: adding the next official series is one row plus a
    fetcher, not a schema migration."""

    __tablename__ = "reference_series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    series_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    publisher: Mapped[str] = mapped_column(String(48), nullable=False)
    dataset: Mapped[str] = mapped_column(String(64), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(48))
    frequency: Mapped[str] = mapped_column(String(16), default="monthly")
    classification_code: Mapped[str | None] = mapped_column(String(32))
    base_period: Mapped[str | None] = mapped_column(String(16))
    geography: Mapped[str | None] = mapped_column(String(48))
    sector: Mapped[str | None] = mapped_column(String(16))
    endpoint: Mapped[str | None] = mapped_column(Text)
    request_params: Mapped[dict | None] = mapped_column(JSONType)
    source_url: Mapped[str | None] = mapped_column(Text)
    citation: Mapped[str | None] = mapped_column(Text)
    last_refreshed_at: Mapped[datetime | None] = mapped_column(TimestampType)

    observations: Mapped[list[ReferenceObservation]] = relationship(back_populates="series")


class ReferenceObservation(Base, TimestampMixin):
    __tablename__ = "reference_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("reference_series.id"), index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_label: Mapped[str] = mapped_column(String(16), nullable=False)
    value: Mapped[float | None] = mapped_column(RatioType)
    secondary_value: Mapped[float | None] = mapped_column(RatioType)
    is_imputed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_provisional: Mapped[bool] = mapped_column(Boolean, default=False)
    raw_record: Mapped[dict | None] = mapped_column(JSONType)

    series: Mapped[ReferenceSeries] = relationship(back_populates="observations")

    __table_args__ = (
        UniqueConstraint("series_id", "period_start", name="uq_ref_obs_period"),
    )


class BacktestResult(Base, TimestampMixin):
    """PS deliverable: ">= 30 days of back-tested results against publicly available
    DGCA monthly average-fare data". We also backtest against CPI item 294, because
    that is the series the output is actually meant to augment."""

    __tablename__ = "backtest_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_uid: Mapped[str] = mapped_column(String(64), index=True)
    benchmark_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(32), default="overall")
    scope_key: Mapped[str | None] = mapped_column(String(16))
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_label: Mapped[str] = mapped_column(String(16), nullable=False)

    apix_value: Mapped[float | None] = mapped_column(RatioType)
    benchmark_value: Mapped[float | None] = mapped_column(RatioType)
    apix_change_pct: Mapped[float | None] = mapped_column(RatioType)
    benchmark_change_pct: Mapped[float | None] = mapped_column(RatioType)
    abs_error: Mapped[float | None] = mapped_column(RatioType)
    observed_share_pct: Mapped[float | None] = mapped_column(RatioType)

    __table_args__ = (
        UniqueConstraint(
            "run_uid", "benchmark_key", "scope", "scope_key", "period_start",
            name="uq_backtest_cell",
        ),
    )


class BacktestSummary(Base, TimestampMixin):
    __tablename__ = "backtest_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_uid: Mapped[str] = mapped_column(String(64), index=True)
    benchmark_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(32), default="overall")
    scope_key: Mapped[str | None] = mapped_column(String(16))
    n_periods: Mapped[int] = mapped_column(Integer, default=0)
    n_days_covered: Mapped[int] = mapped_column(Integer, default=0)
    pearson_r: Mapped[float | None] = mapped_column(RatioType)
    spearman_rho: Mapped[float | None] = mapped_column(RatioType)
    direction_agreement_pct: Mapped[float | None] = mapped_column(RatioType)
    mape: Mapped[float | None] = mapped_column(RatioType)
    rmse: Mapped[float | None] = mapped_column(RatioType)
    mean_bias_pct: Mapped[float | None] = mapped_column(RatioType)
    verdict: Mapped[str | None] = mapped_column(String(32))
    narrative: Mapped[str | None] = mapped_column(Text)
    detail: Mapped[dict | None] = mapped_column(JSONType)

    __table_args__ = (
        UniqueConstraint(
            "run_uid", "benchmark_key", "scope", "scope_key", name="uq_backtest_summary"
        ),
    )




