"""The registry of official reference series, and their persistence.

Adding another official series later is one ``SeriesDefinition`` plus a fetcher —
no schema change, no dashboard change. That is the sustainability requirement made
concrete.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

import pandas as pd
from sqlalchemy import select

from apix.db import session_scope
from apix.db.models import ReferenceObservation, ReferenceSeries
from apix.reference import mospi as M

CPI_AIRFARE_KEY = "cpi_airfare_item294_allindia_combined"
CPI_AIRFARE_URBAN_KEY = "cpi_airfare_item294_allindia_urban"
CPI_TRANSPORT_GROUP_KEY = "cpi_group_transport_allindia_combined"
WPI_ATF_KEY = "wpi_atf_allindia"
DGCA_TMU_KEY = "dgca_tmu_route_average_fare"


@dataclass
class SeriesDefinition:
    key: str
    title: str
    publisher: str
    dataset: str
    unit: str
    frequency: str
    fetch: Callable[[], list[dict[str, Any]]]
    classification_code: str | None = None
    base_period: str | None = None
    geography: str | None = None
    sector: str | None = None
    endpoint: str | None = None
    request_params: dict[str, Any] = field(default_factory=dict)
    source_url: str | None = None
    citation: str | None = None
    #: Set on the series that APIx is meant to augment. The backtest and the
    #: nowcast panel both key off this.
    is_primary_target: bool = False


# --------------------------------------------------------------------- fetchers


def _rows_from_cpi(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for rec in records:
        start = M.period_start(rec)
        if start is None:
            continue
        out.append(
            {
                "period_start": start,
                "period_label": start.strftime("%Y-%m"),
                "value": M.to_float(rec.get("index")),
                "secondary_value": M.to_float(rec.get("inflation")),
                "is_imputed": str(rec.get("imputation", "N")).strip().upper() in ("Y", "YES", "1"),
                "raw_record": rec,
            }
        )
    return sorted(out, key=lambda r: r["period_start"])


def _fetch_cpi_airfare(sector_code: int = M.SECTOR_COMBINED) -> list[dict[str, Any]]:
    client = M.MoSPIClient()
    years = list(range(date.today().year - 3, date.today().year + 1))
    return _rows_from_cpi(client.cpi_airfare(years=years, sector_code=sector_code).records)


def _fetch_cpi_transport_group() -> list[dict[str, Any]]:
    client = M.MoSPIClient()
    years = list(range(date.today().year - 3, date.today().year + 1))
    resp = client.cpi(level="Group", years=years)
    wanted = [
        r
        for r in resp.records
        if "transport" in str(r.get("group") or r.get("group_name") or "").lower()
    ]
    return _rows_from_cpi(wanted or resp.records)


def _fetch_wpi_atf() -> list[dict[str, Any]]:
    client = M.MoSPIClient()
    years = list(range(date.today().year - 3, date.today().year + 1))
    records = client.wpi_atf(years=years).records
    out = []
    for rec in records:
        start = M.period_start(rec)
        if start is None:
            continue
        value = None
        for key in ("index", "wpi_index", "value", "current_index"):
            value = M.to_float(rec.get(key))
            if value is not None:
                break
        out.append(
            {
                "period_start": start,
                "period_label": start.strftime("%Y-%m"),
                "value": value,
                "secondary_value": M.to_float(rec.get("inflation")),
                "raw_record": rec,
            }
        )
    return sorted(out, key=lambda r: r["period_start"])


def _fetch_dgca_tmu() -> list[dict[str, Any]]:
    """DGCA Tariff Monitoring Unit route fares, from the cited seed file.

    These are not machine-readable at source — the TMU publishes via monthly PDFs and
    Parliament replies. ``seed/dgca_tmu_fares.csv`` carries one citation per row, and
    ``apix reference import-dgca`` replaces it with a fresher extraction. The backtest
    reads whatever is loaded, so improving the source improves the validation without
    touching code.
    """
    from apix.reference.dgca import load_tmu_seed

    return load_tmu_seed()


# -------------------------------------------------------------------- definitions

SERIES_DEFINITIONS: dict[str, SeriesDefinition] = {
    CPI_AIRFARE_KEY: SeriesDefinition(
        key=CPI_AIRFARE_KEY,
        title="CPI — Item 294 'Airfare', All India, Combined (base 2024=100)",
        publisher="MoSPI / NSO",
        dataset="CPI",
        unit="index (2024=100)",
        frequency="monthly",
        fetch=lambda: _fetch_cpi_airfare(M.SECTOR_COMBINED),
        classification_code=M.CPI_AIRFARE_COICOP,
        base_period="2024=100",
        geography="All India",
        sector="Combined",
        endpoint=M.CPI_UNIFIED,
        request_params={
            "base_year": "2024",
            "level": "Item",
            "item_code": M.CPI_AIRFARE_ITEM_CODE,
            "state_code": M.STATE_ALL_INDIA,
            "sector_code": M.SECTOR_COMBINED,
            "series": "Current",
        },
        source_url="https://esankhyiki.mospi.gov.in",
        citation=(
            "MoSPI, Consumer Price Index (base 2024=100), Division 7 Transport > "
            "Group 24 Passenger transport services > Class 58 Passenger transport by "
            "air > Sub-class 125 domestic > Item 294 Airfare, COICOP 07.3.3.1.2.01. "
            "Retrieved from the eSankhyiki open API."
        ),
        is_primary_target=True,
    ),
    CPI_AIRFARE_URBAN_KEY: SeriesDefinition(
        key=CPI_AIRFARE_URBAN_KEY,
        title="CPI — Item 294 'Airfare', All India, Urban (base 2024=100)",
        publisher="MoSPI / NSO",
        dataset="CPI",
        unit="index (2024=100)",
        frequency="monthly",
        fetch=lambda: _fetch_cpi_airfare(M.SECTOR_URBAN),
        classification_code=M.CPI_AIRFARE_COICOP,
        base_period="2024=100",
        geography="All India",
        sector="Urban",
        endpoint=M.CPI_UNIFIED,
        source_url="https://esankhyiki.mospi.gov.in",
        citation=(
            "MoSPI CPI Urban, Item 294 Airfare. Urban matters here because air travel "
            "is overwhelmingly an urban consumption item, so the Urban series is the "
            "sharper comparison for APIx."
        ),
    ),
    CPI_TRANSPORT_GROUP_KEY: SeriesDefinition(
        key=CPI_TRANSPORT_GROUP_KEY,
        title="CPI — Transport & Communication group, All India, Combined",
        publisher="MoSPI / NSO",
        dataset="CPI",
        unit="index (2024=100)",
        frequency="monthly",
        fetch=_fetch_cpi_transport_group,
        base_period="2024=100",
        geography="All India",
        sector="Combined",
        endpoint=M.CPI_UNIFIED,
        source_url="https://esankhyiki.mospi.gov.in",
        citation="MoSPI CPI, Transport group — the sub-group the PS names.",
    ),
    WPI_ATF_KEY: SeriesDefinition(
        key=WPI_ATF_KEY,
        title="WPI — Aviation Turbine Fuel, All India",
        publisher="MoSPI / Office of the Economic Adviser",
        dataset="WPI",
        unit="index (2011-12=100)",
        frequency="monthly",
        fetch=_fetch_wpi_atf,
        base_period="2011-12=100",
        geography="All India",
        endpoint=M.WPI_RECORDS,
        source_url="https://esankhyiki.mospi.gov.in",
        citation=(
            "MoSPI Wholesale Price Index, Aviation Turbine Fuel. Chosen over "
            "PPAC/IOCL retail pages because those are JS-gated and unstable, while "
            "this is on the same official API as our CPI target."
        ),
    ),
    DGCA_TMU_KEY: SeriesDefinition(
        key=DGCA_TMU_KEY,
        title="DGCA Tariff Monitoring Unit — average airfare on monitored routes",
        publisher="DGCA",
        dataset="TMU",
        unit="INR",
        frequency="monthly",
        fetch=_fetch_dgca_tmu,
        geography="Selected domestic routes",
        source_url="https://www.dgca.gov.in",
        citation=(
            "DGCA Tariff Monitoring Unit. The TMU monitors airfares on selected "
            "domestic routes monthly by checking airline websites manually — the "
            "process APIx automates. Published via monthly reports and Parliament "
            "replies, not as a machine-readable feed; see seed/dgca_tmu_fares.csv "
            "for per-row citations."
        ),
    ),
}


# ------------------------------------------------------------------- persistence


def upsert_series_observations(
    definition: SeriesDefinition, rows: list[dict[str, Any]]
) -> tuple[int, int]:
    """Insert or update one series' observations. Returns (inserted, updated).

    Official series get revised, so this is an upsert rather than an append. The
    ``raw_record`` column keeps the publisher's own payload, which means a revision is
    visible after the fact instead of silently overwriting history.
    """
    inserted = updated = 0
    with session_scope() as s:
        series = s.scalars(
            select(ReferenceSeries).where(ReferenceSeries.series_key == definition.key)
        ).first()
        if series is None:
            series = ReferenceSeries(series_key=definition.key)
            s.add(series)
        series.title = definition.title
        series.publisher = definition.publisher
        series.dataset = definition.dataset
        series.unit = definition.unit
        series.frequency = definition.frequency
        series.classification_code = definition.classification_code
        series.base_period = definition.base_period
        series.geography = definition.geography
        series.sector = definition.sector
        series.endpoint = definition.endpoint
        series.request_params = definition.request_params or None
        series.source_url = definition.source_url
        series.citation = definition.citation
        series.last_refreshed_at = datetime.now(timezone.utc)
        s.flush()

        existing = {
            o.period_start: o
            for o in s.scalars(
                select(ReferenceObservation).where(ReferenceObservation.series_id == series.id)
            ).all()
        }
        for row in rows:
            start = row["period_start"]
            obs = existing.get(start)
            if obs is None:
                s.add(ReferenceObservation(series_id=series.id, **row))
                inserted += 1
            else:
                changed = False
                for key, value in row.items():
                    if getattr(obs, key, None) != value:
                        setattr(obs, key, value)
                        changed = True
                updated += int(changed)
    return inserted, updated


def refresh_all(keys: list[str] | None = None, *, strict: bool = False) -> dict[str, Any]:
    """Refresh every registered series. Never lets one bad source break the rest."""
    report: dict[str, Any] = {"refreshed": [], "failed": []}
    for key in keys or list(SERIES_DEFINITIONS):
        definition = SERIES_DEFINITIONS[key]
        try:
            rows = definition.fetch()
            if not rows:
                raise RuntimeError("fetch returned zero observations")
            ins, upd = upsert_series_observations(definition, rows)
            report["refreshed"].append(
                {
                    "key": key,
                    "observations": len(rows),
                    "inserted": ins,
                    "updated": upd,
                    "latest": rows[-1]["period_label"],
                    "latest_value": rows[-1].get("value"),
                }
            )
        except Exception as exc:
            report["failed"].append({"key": key, "error": f"{type(exc).__name__}: {exc}"})
            if strict:
                raise
    report["ok"] = not report["failed"]
    return report


def get_series_frame(key: str) -> pd.DataFrame:
    """Return one reference series as a tidy DataFrame indexed by period_start."""
    with session_scope() as s:
        series = s.scalars(
            select(ReferenceSeries).where(ReferenceSeries.series_key == key)
        ).first()
        if series is None:
            return pd.DataFrame(columns=["period_start", "period_label", "value", "secondary_value"])
        rows = s.scalars(
            select(ReferenceObservation)
            .where(ReferenceObservation.series_id == series.id)
            .order_by(ReferenceObservation.period_start)
        ).all()
    return pd.DataFrame(
        [
            {
                "period_start": r.period_start,
                "period_label": r.period_label,
                "value": float(r.value) if r.value is not None else None,
                "secondary_value": float(r.secondary_value) if r.secondary_value is not None else None,
                "is_imputed": r.is_imputed,
            }
            for r in rows
        ]
    )


def series_catalogue() -> list[dict[str, Any]]:
    """Machine-readable provenance for the dashboard's 'Sources' panel."""
    return [
        {
            "key": d.key,
            "title": d.title,
            "publisher": d.publisher,
            "dataset": d.dataset,
            "unit": d.unit,
            "frequency": d.frequency,
            "classification_code": d.classification_code,
            "base_period": d.base_period,
            "geography": d.geography,
            "sector": d.sector,
            "endpoint": d.endpoint,
            "request_params": d.request_params,
            "source_url": d.source_url,
            "citation": d.citation,
            "is_primary_target": d.is_primary_target,
        }
        for d in SERIES_DEFINITIONS.values()
    ]


