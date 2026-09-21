"""Laspeyres-type weighted Airfare Price Index computation.

Formula: APIx_t = SUM(w_i * P_it / P_i0) * 100
"""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta, timezone
import numpy as np
import pandas as pd
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import CleanedFare, IndexValue, DataQualityLog
from apix.domain import ROUTE_BASKET, BOOKING_WINDOWS, SOURCES
from apix.reference.weights import active_route_weights
from apix.config import settings

logger = logging.getLogger(__name__)


def _get_fares_for_period(start: date, end: date) -> pd.DataFrame:
    with session_scope() as s:
        rows = s.execute(
            select(
                CleanedFare.origin, CleanedFare.destination, CleanedFare.route_key,
                CleanedFare.booking_window_days, CleanedFare.carrier_code,
                CleanedFare.total_fare, CleanedFare.provenance,
                CleanedFare.travel_date, CleanedFare.source_slug,
                CleanedFare.base_fare, CleanedFare.taxes,
            ).where(and_(
                CleanedFare.observation_date >= start,
                CleanedFare.observation_date <= end,
                CleanedFare.total_fare.isnot(None),
                CleanedFare.included_in_index == True,
            ))
        ).all()
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows, columns=[
        "origin", "destination", "route_key", "booking_window_days",
        "carrier_code", "total_fare", "provenance", "travel_date",
        "source_slug", "base_fare", "taxes",
    ])


def compute_base_prices() -> dict[str, float]:
    start = date.fromisoformat(settings.base_period_start)
    end = date.fromisoformat(settings.base_period_end)
    df = _get_fares_for_period(start, end)
    if df.empty:
        from apix.pipeline.reconstruct import ROUTE_FARE_ANCHORS
        return dict(ROUTE_FARE_ANCHORS)
    return df.groupby("route_key")["total_fare"].mean().to_dict()


def compute_daily_index(run_uid: str | None = None) -> dict:
    today = date.today()
    weights = active_route_weights()
    base_prices = compute_base_prices()
    df = _get_fares_for_period(today, today)
    if df.empty:
        df = _get_fares_for_period(today - timedelta(days=1), today)

    result = {"date": today.isoformat(), "run_uid": run_uid}
    if df.empty:
        result["overall_index"] = None
        result["error"] = "No fare data"
        return result

    route_indices = {}
    for route in ROUTE_BASKET:
        rk = f"{route.origin}-{route.destination}"
        rf = df[df["route_key"] == rk]
        if rf.empty:
            continue
        avg_fare = rf["total_fare"].mean()
        base_fare = base_prices.get(rk)
        if not base_fare or base_fare == 0:
            continue
        price_relative = avg_fare / base_fare
        weight = weights.get(rk, 1.0 / len(ROUTE_BASKET))
        route_indices[rk] = {
            "avg_fare": round(float(avg_fare), 2),
            "base_fare": round(float(base_fare), 2),
            "price_relative": round(float(price_relative), 4),
            "weight": round(float(weight), 4),
            "weighted_relative": round(float(price_relative * weight), 6),
            "n_observations": len(rf),
            "sources": int(rf["source_slug"].nunique()),
            "live_pct": round(float((rf["provenance"] != "RECONSTRUCTED").mean() * 100), 1),
            "avg_base_fare": round(float(rf["base_fare"].mean()), 2) if rf["base_fare"].notna().any() else None,
            "avg_taxes": round(float(rf["taxes"].mean()), 2) if rf["taxes"].notna().any() else None,
        }

    if not route_indices:
        result["overall_index"] = None
        return result

    total_weight = sum(r["weight"] for r in route_indices.values())
    overall = sum(r["weighted_relative"] for r in route_indices.values())
    if total_weight > 0:
        overall = (overall / total_weight) * settings.index_base_value

    result["overall_index"] = round(float(overall), 2)
    result["routes"] = route_indices
    result["routes_covered"] = len(route_indices)
    result["total_observations"] = int(df.shape[0])

    # Per-booking-window sub-indices
    window_indices = {}
    for window in BOOKING_WINDOWS:
        wdf = df[df["booking_window_days"] == window]
        if wdf.empty:
            continue
        w_relatives = []
        for rk, rd in route_indices.items():
            wrf = wdf[wdf["route_key"] == rk]
            if wrf.empty:
                continue
            bp = base_prices.get(rk, rd["base_fare"])
            if bp == 0:
                continue
            w_relatives.append(float(wrf["total_fare"].mean()) / bp * rd["weight"])
        if w_relatives:
            window_indices[f"T+{window}"] = round(sum(w_relatives) / total_weight * settings.index_base_value, 2)
    result["booking_window_indices"] = window_indices

    # Confidence — composite score combining coverage, diversity, and density
    expected = len(ROUTE_BASKET) * len(BOOKING_WINDOWS)
    actual = len(df.groupby(["route_key", "booking_window_days"]).size())
    live_count = len(df[df["provenance"] != "RECONSTRUCTED"])
    
    # Component 1: Coverage (40%) — what fraction of route×window cells are filled
    coverage_score = min(1.0, actual / max(1, expected))
    
    # Component 2: Source diversity (30%) — how many distinct sources contributed
    n_sources = int(df["source_slug"].nunique())
    source_score = min(1.0, n_sources / max(1, min(6, len(SOURCES))))
    
    # Component 3: Observation density (30%) — enough observations per cell
    min_obs_per_cell = 3  # at least 3 observations per route-window is ideal
    obs_per_cell = len(df) / max(1, actual)
    density_score = min(1.0, obs_per_cell / min_obs_per_cell)
    
    # Component 4: Provenance quality — live data is more trustworthy than reconstructed
    live_ratio = live_count / max(1, len(df))
    # Live data = 100% quality, reconstructed = 82% quality (calibrated but not observed)
    provenance_quality = live_ratio * 1.0 + (1 - live_ratio) * 0.82
    
    # Weighted composite (coverage 30%, sources 20%, density 20%, provenance 30%)
    raw_score = (coverage_score * 30 + source_score * 20 + density_score * 20 + provenance_quality * 30)
    # Cap at 97 — no system is perfect, keeps it realistic
    confidence_pct = min(97.0, round(raw_score, 1))
    
    result["confidence"] = {
        "score_pct": round(actual / expected * 100, 1) if expected > 0 else 0,
        "confidence_pct": confidence_pct,
        "coverage": f"{actual}/{expected}",
        "live_observations": int(live_count),
        "reconstructed_observations": int(len(df) - live_count),
    }

    try:
        _store_index(result, run_uid, df)
    except Exception as e:
        logger.error(f"Failed to store index: {e}")
    return result


def _store_index(result: dict, run_uid, df) -> None:
    with session_scope() as s:
        today = date.fromisoformat(result["date"])
        idx = IndexValue(
            frequency="daily",
            period_start=today,
            period_end=today,
            period_label=today.isoformat(),
            index_value=result.get("overall_index", 0),
            mean_fare=float(df["total_fare"].mean()) if not df.empty else None,
            median_fare=float(df["total_fare"].median()) if not df.empty else None,
            observation_count=result.get("total_observations", 0),
            confidence_pct=result.get("confidence", {}).get("confidence_pct"),
            observed_share_pct=round(result.get("confidence", {}).get("live_observations", 0) / max(1, result.get("total_observations", 1)) * 100, 1),
            base_period_label=f"{settings.base_period_start} to {settings.base_period_end}",
            provenance_mix=result.get("confidence"),
        )
        s.add(idx)

        # Store per-route
        for rk, rd in result.get("routes", {}).items():
            s.add(IndexValue(
                frequency="daily",
                period_start=today,
                period_end=today,
                period_label=today.isoformat(),
                route_key=rk,
                index_value=round(rd["price_relative"] * settings.index_base_value, 2),
                mean_fare=rd["avg_fare"],
                observation_count=rd["n_observations"],
                observed_share_pct=rd.get("live_pct", 0),
                base_period_label=f"{settings.base_period_start} to {settings.base_period_end}",
            ))

        # Count data cleaning stats
        outliers = s.query(CleanedFare).filter(CleanedFare.observation_date == today, CleanedFare.is_outlier == True).count()
        sold_out = s.query(CleanedFare).filter(CleanedFare.observation_date == today, CleanedFare.availability_status == 'sold_out').count()
        failed = s.query(CleanedFare).filter(CleanedFare.observation_date == today, CleanedFare.availability_status == 'fetch_failed').count()

        # Quality log
        conf = result.get("confidence", {})
        s.add(DataQualityLog(
            log_date=today,
            scope="overall",
            expected_data_points=len(ROUTE_BASKET) * len(BOOKING_WINDOWS),
            actual_data_points=result.get("total_observations", 0),
            observed_data_points=conf.get("live_observations", 0),
            reconstructed_data_points=conf.get("reconstructed_observations", 0),
            outlier_points=outliers,
            sold_out_points=sold_out,
            failed_points=failed,
            coverage_pct=conf.get("score_pct", 0),
            confidence_pct=conf.get("confidence_pct", 0),
            confidence_band="high" if conf.get("confidence_pct", 0) > 80 else "medium" if conf.get("confidence_pct", 0) > 50 else "low",
        ))


def get_index_history(frequency="daily", route_key=None, limit=90) -> list[dict]:
    with session_scope() as s:
        q = select(IndexValue).where(IndexValue.frequency == frequency)
        if route_key:
            q = q.where(IndexValue.route_key == route_key)
        else:
            q = q.where(IndexValue.route_key.is_(None))
        q = q.order_by(IndexValue.period_start.desc(), IndexValue.created_at.desc())
        rows = s.scalars(q).all()
        
    unique_rows = []
    seen = set()
    for r in rows:
        if r.period_start not in seen:
            seen.add(r.period_start)
            unique_rows.append(r)
            if len(unique_rows) == limit:
                break
                
    return [
        {
            "date": r.period_start.isoformat() if r.period_start else None,
            "value": float(r.index_value) if r.index_value else None,
            "confidence_pct": float(r.confidence_pct) if r.confidence_pct else None,
            "live_pct": float(r.observed_share_pct) if r.observed_share_pct else None,
            "observations": r.observation_count,
            "mean_fare": float(r.mean_fare) if r.mean_fare else None,
            "median_fare": float(r.median_fare) if r.median_fare else None,
        }
        for r in reversed(unique_rows)
    ]
