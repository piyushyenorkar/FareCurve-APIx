"""Data cleaning pipeline for raw fare quotes.

Steps:
1. Validate fare range (500-50000 INR for domestic)
2. Detect and flag outliers (modified Z-score + IQR)
3. Deduplicate (same flight, same source, same run)
4. Separate base fare from taxes where available
5. Mark missing/failed fetches without imputation
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from apix.domain import Availability
from apix.config import settings

logger = logging.getLogger(__name__)

MIN_FARE = 500.0
MAX_FARE = 50000.0


def validate_fares(quotes: list[dict]) -> list[dict]:
    """Remove fares outside reasonable domestic range."""
    valid = []
    for q in quotes:
        fare = q.get("total_fare")
        if fare is None:
            valid.append(q)
            continue
        if MIN_FARE <= fare <= MAX_FARE:
            valid.append(q)
        else:
            q["availability"] = "outlier_range"
            logger.debug(f"Range outlier: {q['origin']}-{q['destination']} fare={fare}")
    return valid


def detect_outliers_zscore(quotes: list[dict], threshold: float | None = None) -> list[dict]:
    """Flag outliers using modified Z-score (MAD-based) per route+window group."""
    threshold = threshold or settings.outlier_z_threshold
    if not quotes:
        return quotes

    df = pd.DataFrame(quotes)
    fared = df[df["total_fare"].notna()].copy()
    if fared.empty:
        return quotes

    def flag_group(group):
        fares = group["total_fare"].values
        if len(fares) < 3:
            return group
        median = np.median(fares)
        mad = np.median(np.abs(fares - median))
        if mad == 0:
            return group
        modified_z = 0.6745 * (fares - median) / mad
        group = group.copy()
        group["is_outlier"] = np.abs(modified_z) > threshold
        group["z_score"] = modified_z
        return group

    if "route_key" not in fared.columns:
        fared["route_key"] = fared["origin"] + "-" + fared["destination"]

    result = fared.groupby(["route_key", "booking_window"], group_keys=False).apply(flag_group)

    for idx, row in result.iterrows():
        if row.get("is_outlier", False):
            quotes[idx]["is_outlier"] = True
            quotes[idx]["z_score"] = float(row.get("z_score", 0))

    return quotes


def detect_outliers_iqr(quotes: list[dict], multiplier: float | None = None) -> list[dict]:
    """Flag outliers using IQR method per route+window group."""
    multiplier = multiplier or settings.outlier_iqr_multiplier
    if not quotes:
        return quotes

    df = pd.DataFrame(quotes)
    fared = df[df["total_fare"].notna()].copy()
    if fared.empty:
        return quotes

    if "route_key" not in fared.columns:
        fared["route_key"] = fared["origin"] + "-" + fared["destination"]

    for (route, window), group in fared.groupby(["route_key", "booking_window"]):
        fares = group["total_fare"].values
        if len(fares) < 4:
            continue
        q1, q3 = np.percentile(fares, [25, 75])
        iqr = q3 - q1
        lower = q1 - multiplier * iqr
        upper = q3 + multiplier * iqr
        for idx in group.index:
            fare = fares[list(group.index).index(idx)]
            if fare < lower or fare > upper:
                quotes[idx]["is_outlier_iqr"] = True

    return quotes


def deduplicate(quotes: list[dict]) -> list[dict]:
    """Remove exact duplicates based on source+flight+date+fare."""
    seen = set()
    unique = []
    for q in quotes:
        key = (
            q.get("source_slug"), q.get("origin"), q.get("destination"),
            q.get("travel_date"), q.get("carrier_code"), q.get("flight_number"),
            q.get("total_fare"),
        )
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique


def clean_pipeline(quotes: list[dict]) -> list[dict]:
    """Full cleaning pipeline: validate -> outlier detect -> dedup."""
    logger.info(f"Cleaning {len(quotes)} raw quotes")
    result = validate_fares(quotes)
    result = detect_outliers_zscore(result)
    result = detect_outliers_iqr(result)
    result = deduplicate(result)
    clean_count = sum(1 for q in result if q.get("total_fare") and not q.get("is_outlier"))
    logger.info(f"After cleaning: {len(result)} quotes, {clean_count} clean fares")
    return result
