"""DGCA and AAI artefacts: the validation benchmark and the traffic weights.

Neither of these is a machine-readable feed, and pretending otherwise is how a
project like this quietly becomes unreproducible. So both arrive as **cited seed
files** with an importer that replaces them from a fresher publication:

  seed/dgca_tmu_fares.csv      route x month average fare  -> backtest benchmark
  seed/airport_passengers.csv  airport x year domestic pax  -> weight derivation
  seed/route_traffic.csv       O&D pair share estimates     -> weight derivation

Every row of every file carries ``source_citation``, ``source_url`` and ``provenance``.
A row whose provenance is not ``PUBLISHED`` is never treated as an official figure:
the backtest reports it separately, and the dashboard labels it.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from apix.config import SEED_DIR

TMU_SEED = SEED_DIR / "dgca_tmu_fares.csv"
AIRPORT_PAX_SEED = SEED_DIR / "airport_passengers.csv"
ROUTE_TRAFFIC_SEED = SEED_DIR / "route_traffic.csv"

#: Rows with this provenance are official published figures and may be used as a
#: validation benchmark. Anything else is calibration input only.
PROVENANCE_PUBLISHED = "PUBLISHED"
PROVENANCE_CALIBRATION = "ANALYST_CALIBRATION"


@dataclass
class TmuRow:
    period_start: date
    route_key: str
    average_fare: float
    booking_window_days: int | None
    provenance: str
    source_citation: str
    source_url: str | None


def _read_csv(path: Path) -> list[dict[str, str]]:
    """Read a seed CSV, tolerating leading ``#`` comment blocks.

    The seed files carry substantial provenance documentation in comments above the
    header — that documentation is the point, so the reader strips comment lines
    before handing anything to ``csv``.
    """
    if not path.exists():
        return []
    lines = [
        line
        for line in path.read_text("utf-8-sig").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if not lines:
        return []
    return list(csv.DictReader(lines))



def _parse_month(value: str) -> date | None:
    value = (value or "").strip()
    for fmt in ("%Y-%m", "%Y-%m-%d", "%b-%Y", "%B-%Y", "%b %Y", "%B %Y", "%m/%Y"):
        try:
            from datetime import datetime

            parsed = datetime.strptime(value, fmt).date()
            return parsed.replace(day=1)
        except ValueError:
            continue
    return None


def read_tmu_rows(path: Path | None = None) -> list[TmuRow]:
    out: list[TmuRow] = []
    for row in _read_csv(path or TMU_SEED):
        period = _parse_month(row.get("month", ""))
        fare = row.get("average_fare_inr", "").strip()
        if period is None or not fare:
            continue
        try:
            fare_value = float(fare.replace(",", ""))
        except ValueError:
            continue
        window = row.get("booking_window_days", "").strip()
        out.append(
            TmuRow(
                period_start=period,
                route_key=(row.get("route_key") or "").strip().upper(),
                average_fare=fare_value,
                booking_window_days=int(window) if window.isdigit() else None,
                provenance=(row.get("provenance") or PROVENANCE_CALIBRATION).strip().upper(),
                source_citation=(row.get("source_citation") or "").strip(),
                source_url=(row.get("source_url") or "").strip() or None,
            )
        )
    return out


def load_tmu_seed(path: Path | None = None) -> list[dict[str, Any]]:
    """Collapse the route-level TMU rows into a monthly all-route mean.

    Only ``PUBLISHED`` rows are used. If the seed file has none, this returns an empty
    list and the backtest says so out loud rather than validating against numbers we
    made up. That is the correct behaviour: an honest "benchmark not loaded" is worth
    more than a confident comparison against fiction.
    """
    rows = [r for r in read_tmu_rows(path) if r.provenance == PROVENANCE_PUBLISHED]
    by_period: dict[date, list[TmuRow]] = {}
    for row in rows:
        by_period.setdefault(row.period_start, []).append(row)

    out: list[dict[str, Any]] = []
    for period in sorted(by_period):
        bucket = by_period[period]
        mean_fare = sum(r.average_fare for r in bucket) / len(bucket)
        out.append(
            {
                "period_start": period,
                "period_label": period.strftime("%Y-%m"),
                "value": round(mean_fare, 2),
                "raw_record": {
                    "routes": sorted({r.route_key for r in bucket}),
                    "n_rows": len(bucket),
                    "citations": sorted({r.source_citation for r in bucket if r.source_citation}),
                },
            }
        )
    return out


def tmu_route_frame(path: Path | None = None):
    """Route x month benchmark table for the per-route backtest."""
    import pandas as pd

    rows = read_tmu_rows(path)
    return pd.DataFrame(
        [
            {
                "period_start": r.period_start,
                "period_label": r.period_start.strftime("%Y-%m"),
                "route_key": r.route_key,
                "booking_window_days": r.booking_window_days,
                "average_fare": r.average_fare,
                "provenance": r.provenance,
                "source_citation": r.source_citation,
            }
            for r in rows
        ]
    )


# --------------------------------------------------------------------- traffic


def read_airport_passengers(path: Path | None = None) -> list[dict[str, Any]]:
    out = []
    for row in _read_csv(path or AIRPORT_PAX_SEED):
        pax = (row.get("domestic_passengers") or "").replace(",", "").strip()
        if not pax:
            continue
        try:
            value = float(pax)
        except ValueError:
            continue
        out.append(
            {
                "iata": (row.get("iata") or "").strip().upper(),
                "reference_period": (row.get("reference_period") or "").strip(),
                "domestic_passengers": value,
                "provenance": (row.get("provenance") or PROVENANCE_CALIBRATION).strip().upper(),
                "source_citation": (row.get("source_citation") or "").strip(),
                "source_url": (row.get("source_url") or "").strip() or None,
            }
        )
    return out


def read_route_traffic(path: Path | None = None) -> list[dict[str, Any]]:
    out = []
    for row in _read_csv(path or ROUTE_TRAFFIC_SEED):
        pax = (row.get("annual_passengers") or "").replace(",", "").strip()
        if not pax:
            continue
        try:
            value = float(pax)
        except ValueError:
            continue
        out.append(
            {
                "route_key": (row.get("route_key") or "").strip().upper(),
                "origin": (row.get("origin") or "").strip().upper(),
                "destination": (row.get("destination") or "").strip().upper(),
                "reference_period": (row.get("reference_period") or "").strip(),
                "annual_passengers": value,
                "provenance": (row.get("provenance") or PROVENANCE_CALIBRATION).strip().upper(),
                "source_citation": (row.get("source_citation") or "").strip(),
                "source_url": (row.get("source_url") or "").strip() or None,
            }
        )
    return out


def import_tmu_table(rows: list[dict[str, Any]], path: Path | None = None) -> int:
    """Append verified rows to the TMU seed, e.g. after extracting a fresh DGCA table.

    Kept deliberately dumb — no scraping of a PDF that might reshape between months.
    A human extracts the table, this writes it with its citation, and the backtest
    immediately upgrades from 'benchmark not loaded' to a real comparison."""
    target = path or TMU_SEED
    target.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "month",
        "route_key",
        "booking_window_days",
        "average_fare_inr",
        "provenance",
        "source_citation",
        "source_url",
    ]
    exists = target.exists()
    with target.open("a", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        if not exists:
            writer.writeheader()
        written = 0
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})
            written += 1
    return written

