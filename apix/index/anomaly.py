"""Anomaly/surge detection for airfare data.

Classifies fare spikes as:
- GENUINE_SURGE: Corroborated by 2+ sources (real market event)
- DATA_ERROR: Single source anomaly (scraping artifact)
- SEASONAL_SPIKE: Expected pattern (festivals, holidays)

Uses rolling mean + 2.5 sigma threshold with cross-source corroboration.
"""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta, timezone
import numpy as np
import pandas as pd
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import CleanedFare, Anomaly
from apix.config import settings

logger = logging.getLogger(__name__)

# Known high-demand periods in India
FESTIVAL_WINDOWS = [
    ("Diwali", 10, 15, 11, 5),       # Oct 15 - Nov 5
    ("Christmas-NY", 12, 20, 1, 5),   # Dec 20 - Jan 5
    ("Holi", 3, 1, 3, 20),            # Mar 1-20
    ("Summer", 5, 1, 6, 30),          # May-Jun school break
    ("Dussehra", 10, 1, 10, 15),      # Oct 1-15
]


def detect_anomalies(
    lookback_days: int = 30,
    threshold_sigma: float | None = None,
) -> list[dict]:
    """Detect fare anomalies across all routes."""
    threshold_sigma = threshold_sigma or settings.surge_z_threshold
    today = date.today()
    start = today - timedelta(days=lookback_days)

    with session_scope() as s:
        rows = s.execute(
            select(
                CleanedFare.origin,
                CleanedFare.destination,
                CleanedFare.booking_window_days,
                CleanedFare.total_fare,
                CleanedFare.source_slug,
                CleanedFare.travel_date,
                CleanedFare.observed_at,
                CleanedFare.carrier_code,
            )
            .where(
                and_(
                    CleanedFare.total_fare.isnot(None),
                    CleanedFare.is_outlier == False,
                    CleanedFare.travel_date >= start,
                )
            )
        ).all()

    if not rows:
        return []

    df = pd.DataFrame(rows, columns=[
        "origin", "destination", "booking_window", "total_fare",
        "source_slug", "travel_date", "observed_at", "carrier_code",
    ])
    df["route_key"] = df["origin"] + "-" + df["destination"]

    anomalies = []
    for (route, window), group in df.groupby(["route_key", "booking_window"]):
        fares = group["total_fare"].values
        if len(fares) < 5:
            continue

        mean = np.mean(fares)
        std = np.std(fares)
        if std == 0:
            continue

        for idx, row in group.iterrows():
            z = (row["total_fare"] - mean) / std
            if abs(z) > threshold_sigma:
                # Check corroboration
                same_route_day = group[
                    (group["travel_date"] == row["travel_date"]) &
                    (group["source_slug"] != row["source_slug"])
                ]
                n_corroborating = len(same_route_day[
                    (same_route_day["total_fare"] > mean + threshold_sigma * std)
                ])

                if n_corroborating >= settings.min_sources_for_corroboration - 1:
                    classification = "GENUINE_SURGE"
                elif _is_festival_period(row["travel_date"]):
                    classification = "SEASONAL_SPIKE"
                else:
                    classification = "DATA_ERROR"

                pct_above = round((row["total_fare"] - mean) / mean * 100, 1)
                anomalies.append({
                    "route": route,
                    "booking_window": f"T+{window}",
                    "date": str(row["travel_date"]),
                    "fare": round(float(row["total_fare"]), 0),
                    "mean_fare": round(float(mean), 0),
                    "z_score": round(float(z), 2),
                    "pct_above_mean": pct_above,
                    "source": row["source_slug"],
                    "carrier": row["carrier_code"],
                    "classification": classification,
                    "corroborating_sources": int(n_corroborating),
                    "explanation": _explain(classification, route, pct_above, row["carrier_code"]),
                })

    # Store anomalies
    _store_anomalies(anomalies)
    logger.info(f"Detected {len(anomalies)} anomalies")
    return anomalies


def _is_festival_period(travel_date) -> bool:
    """Check if date falls in a known high-demand period."""
    if isinstance(travel_date, str):
        travel_date = date.fromisoformat(travel_date)
    for name, sm, sd, em, ed in FESTIVAL_WINDOWS:
        start = date(travel_date.year, sm, sd)
        end = date(travel_date.year if em >= sm else travel_date.year + 1, em, ed)
        if start <= travel_date <= end:
            return True
    return False


def _explain(classification: str, route: str, pct: float, carrier: str) -> str:
    """Generate plain-language explanation for an anomaly."""
    origin, dest = route.split("-")
    if classification == "GENUINE_SURGE":
        return f"Confirmed fare surge on {origin}-{dest}: {carrier} fares are {pct}% above the rolling average, corroborated by multiple sources. Likely driven by high demand or capacity reduction."
    elif classification == "SEASONAL_SPIKE":
        return f"Seasonal fare increase on {origin}-{dest}: {pct}% above average during a known high-travel period. Expected pattern."
    else:
        return f"Potential data error on {origin}-{dest} from source reporting {carrier}: fare is {pct}% above average but not confirmed by other sources. Flagged for review."


def _store_anomalies(anomalies: list[dict]) -> None:
    """Persist detected anomalies to database."""
    if not anomalies:
        return
    try:
        from datetime import date as date_type
        with session_scope() as s:
            for a in anomalies:
                s.add(Anomaly(
                    detected_on=date_type.today(),
                    route_key=a["route"],
                    booking_window_days=int(a["booking_window"].replace("T+", "")),
                    flag_type=a["classification"],
                    observed_fare=a["fare"],
                    expected_fare=a["mean_fare"],
                    z_score=a["z_score"],
                    deviation_pct=a["pct_above_mean"],
                    rolling_mean=a["mean_fare"],
                    corroborating_sources=a["corroborating_sources"],
                    description=a["explanation"],
                ))
    except Exception as e:
        logger.error(f"Failed to store anomalies: {e}")


def get_recent_anomalies(limit: int = 50) -> list[dict]:
    """Fetch recent anomalies for the dashboard."""
    with session_scope() as s:
        rows = s.scalars(
            select(Anomaly)
            .order_by(Anomaly.detected_on.desc())
            .limit(limit)
        ).all()

    return [
        {
            "route": r.route_key,
            "booking_window": f"T+{r.booking_window_days}" if r.booking_window_days else None,
            "date": str(r.detected_on),
            "fare": float(r.observed_fare) if r.observed_fare else None,
            "mean_fare": float(r.expected_fare) if r.expected_fare else None,
            "z_score": float(r.z_score) if r.z_score else None,
            "classification": r.flag_type,
            "explanation": r.description,
            "detected_at": str(r.detected_on),
        }
        for r in rows
    ]
