"""Backtesting: validate APIx against DGCA and CPI official data.

PS requirement: ">= 30 days of back-tested results against publicly available
DGCA monthly average-fare data"

We also backtest against CPI item 294 (the series APIx is meant to augment).
"""
from __future__ import annotations
import logging
from datetime import date, datetime, timezone
import numpy as np
import pandas as pd
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import IndexValue, BacktestResult, BacktestSummary
from apix.reference.series import (
    CPI_AIRFARE_KEY, DGCA_TMU_KEY,
    get_series_frame, SERIES_DEFINITIONS,
)

logger = logging.getLogger(__name__)


def run_backtest(run_uid: str | None = None) -> dict:
    """Run backtest against all registered benchmark series."""
    report = {"run_uid": run_uid, "benchmarks": {}}

    for benchmark_key in (CPI_AIRFARE_KEY, DGCA_TMU_KEY):
        try:
            result = _backtest_against(benchmark_key, run_uid)
            report["benchmarks"][benchmark_key] = result
        except Exception as e:
            logger.error(f"Backtest against {benchmark_key} failed: {e}")
            report["benchmarks"][benchmark_key] = {"error": str(e)}

    return report


def _backtest_against(benchmark_key: str, run_uid: str | None) -> dict:
    """Compare monthly APIx aggregates against a benchmark series."""
    # Get benchmark data
    bench_df = get_series_frame(benchmark_key)
    if bench_df.empty:
        return {"error": "No benchmark data available", "n_periods": 0}

    # Get APIx monthly values
    with session_scope() as s:
        idx_rows = s.scalars(
            select(IndexValue)
            .where(
                and_(
                    IndexValue.frequency == "daily",
                    IndexValue.scope == "overall",
                )
            )
            .order_by(IndexValue.index_date)
        ).all()

    if not idx_rows:
        return {"error": "No APIx index data available", "n_periods": 0}

    # Aggregate daily to monthly
    idx_df = pd.DataFrame([
        {"date": r.index_date, "value": float(r.value) if r.value else None}
        for r in idx_rows
    ])
    idx_df["date"] = pd.to_datetime(idx_df["date"])
    idx_df["month"] = idx_df["date"].dt.to_period("M")
    monthly_apix = idx_df.groupby("month")["value"].mean()

    # Align periods
    bench_df["period"] = pd.to_datetime(bench_df["period_start"]).dt.to_period("M")
    bench_monthly = bench_df.set_index("period")["value"]

    common = monthly_apix.index.intersection(bench_monthly.index)
    if len(common) == 0:
        return {"error": "No overlapping periods", "n_periods": 0}

    apix_vals = monthly_apix.loc[common].values.astype(float)
    bench_vals = bench_monthly.loc[common].values.astype(float)

    # Compute metrics
    mask = ~(np.isnan(apix_vals) | np.isnan(bench_vals))
    a, b = apix_vals[mask], bench_vals[mask]
    n = len(a)

    if n < 2:
        return {"n_periods": n, "error": "Insufficient overlapping periods"}

    # Pearson correlation
    pearson_r = float(np.corrcoef(a, b)[0, 1]) if n >= 3 else None

    # Direction agreement
    if n >= 2:
        a_dirs = np.sign(np.diff(a))
        b_dirs = np.sign(np.diff(b))
        direction_agree = float(np.mean(a_dirs == b_dirs) * 100)
    else:
        direction_agree = None

    # MAPE
    mape = float(np.mean(np.abs((a - b) / b) * 100)) if np.all(b != 0) else None

    # RMSE
    rmse = float(np.sqrt(np.mean((a - b) ** 2)))

    # Mean bias
    mean_bias = float(np.mean((a - b) / b * 100)) if np.all(b != 0) else None

    # Verdict
    if pearson_r and pearson_r > 0.8:
        verdict = "STRONG_CORRELATION"
        narrative = f"APIx tracks {benchmark_key} with Pearson r={pearson_r:.2f}, direction agreement {direction_agree:.0f}%."
    elif pearson_r and pearson_r > 0.5:
        verdict = "MODERATE_CORRELATION"
        narrative = f"APIx shows moderate correlation with {benchmark_key} (r={pearson_r:.2f})."
    else:
        verdict = "WEAK_CORRELATION"
        narrative = f"APIx correlation with {benchmark_key} is weak. More data needed."

    n_days = (common[-1].end_time.date() - common[0].start_time.date()).days

    result = {
        "benchmark": benchmark_key,
        "n_periods": n,
        "n_days_covered": n_days,
        "pearson_r": round(pearson_r, 4) if pearson_r else None,
        "direction_agreement_pct": round(direction_agree, 1) if direction_agree else None,
        "mape": round(mape, 2) if mape else None,
        "rmse": round(rmse, 2),
        "mean_bias_pct": round(mean_bias, 2) if mean_bias else None,
        "verdict": verdict,
        "narrative": narrative,
    }

    # Store results
    try:
        _store_backtest(result, run_uid, common, a, b, benchmark_key)
    except Exception as e:
        logger.error(f"Failed to store backtest: {e}")

    return result


def _store_backtest(result, run_uid, periods, apix_vals, bench_vals, benchmark_key):
    """Persist backtest results."""
    with session_scope() as s:
        for i, period in enumerate(periods):
            s.add(BacktestResult(
                run_uid=run_uid or "manual",
                benchmark_key=benchmark_key,
                scope="overall",
                period_start=period.start_time.date(),
                period_end=period.end_time.date(),
                period_label=str(period),
                apix_value=float(apix_vals[i]),
                benchmark_value=float(bench_vals[i]),
            ))

        s.add(BacktestSummary(
            run_uid=run_uid or "manual",
            benchmark_key=benchmark_key,
            scope="overall",
            n_periods=result["n_periods"],
            n_days_covered=result["n_days_covered"],
            pearson_r=result.get("pearson_r"),
            direction_agreement_pct=result.get("direction_agreement_pct"),
            mape=result.get("mape"),
            rmse=result.get("rmse"),
            mean_bias_pct=result.get("mean_bias_pct"),
            verdict=result.get("verdict"),
            narrative=result.get("narrative"),
        ))
