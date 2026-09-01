"""Price forecasting with Holt-Winters exponential smoothing.

Produces 7-day and 30-day forecasts per route+booking_window.
Includes a "Buy Now or Wait" signal based on forecast direction.
"""
from __future__ import annotations
import logging
import numpy as np
import pandas as pd
from datetime import date, timedelta
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import CleanedFare
from apix.domain import ROUTE_BASKET, BOOKING_WINDOWS

logger = logging.getLogger(__name__)


def _get_route_history(origin: str, destination: str, window: int = 15, days: int = 60) -> pd.Series:
    """Get daily average fare history for a route+window."""
    end = date.today()
    start = end - timedelta(days=days)
    with session_scope() as s:
        rows = s.execute(
            select(
                CleanedFare.travel_date,
                CleanedFare.total_fare,
            )
            .where(
                and_(
                    CleanedFare.origin == origin,
                    CleanedFare.destination == destination,
                    CleanedFare.booking_window_days == window,
                    CleanedFare.total_fare.isnot(None),
                    CleanedFare.is_outlier == False,
                    CleanedFare.travel_date >= start.isoformat(),
                    CleanedFare.travel_date <= end.isoformat(),
                )
            )
        ).all()

    if not rows:
        return pd.Series(dtype=float)

    df = pd.DataFrame(rows, columns=["travel_date", "total_fare"])
    df["travel_date"] = pd.to_datetime(df["travel_date"])
    daily = df.groupby("travel_date")["total_fare"].mean()
    daily = daily.sort_index()
    return daily


def forecast_route(
    origin: str,
    destination: str,
    window: int = 15,
    horizon_days: int = 7,
    history_days: int = 60,
) -> dict:
    """Forecast future fares for a route using exponential smoothing."""
    history = _get_route_history(origin, destination, window, history_days)

    result = {
        "route": f"{origin}-{destination}",
        "booking_window": f"T+{window}",
        "horizon_days": horizon_days,
    }

    if len(history) < 7:
        # Fallback: use weighted moving average
        result["method"] = "insufficient_data"
        result["forecast"] = []
        result["buy_or_wait"] = "insufficient_data"
        return result

    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        # Fill gaps with forward fill
        idx = pd.date_range(history.index.min(), history.index.max(), freq="D")
        history = history.reindex(idx).ffill().bfill()

        model = ExponentialSmoothing(
            history.values,
            trend="add",
            seasonal=None,  # skip seasonal for short series
            initialization_method="estimated",
        ).fit(optimized=True)

        forecast_values = model.forecast(horizon_days)
        last_date = history.index[-1]

        forecasts = []
        for i, val in enumerate(forecast_values):
            fdate = last_date + timedelta(days=i + 1)
            forecasts.append({
                "date": fdate.strftime("%Y-%m-%d"),
                "predicted_fare": round(float(val), 0),
            })

        result["method"] = "holt_winters"
        result["forecast"] = forecasts
        result["current_avg"] = round(float(history.iloc[-3:].mean()), 0)

        # Buy or Wait signal
        if forecasts:
            future_avg = np.mean([f["predicted_fare"] for f in forecasts[:3]])
            current = result["current_avg"]
            pct_change = (future_avg - current) / current * 100 if current else 0

            if pct_change > 3:
                result["buy_or_wait"] = "BUY_NOW"
                result["signal_reason"] = f"Prices expected to rise {pct_change:.1f}% in next 3 days"
            elif pct_change < -3:
                result["buy_or_wait"] = "WAIT"
                result["signal_reason"] = f"Prices expected to drop {abs(pct_change):.1f}% in next 3 days"
            else:
                result["buy_or_wait"] = "NEUTRAL"
                result["signal_reason"] = "Prices expected to remain stable"

    except Exception as e:
        logger.warning(f"Forecast failed for {origin}-{destination}: {e}")
        # Fallback: simple moving average
        ma = history.rolling(7).mean().dropna()
        if len(ma) > 0:
            last_val = float(ma.iloc[-1])
            result["method"] = "moving_average"
            result["forecast"] = [
                {"date": (date.today() + timedelta(days=i+1)).isoformat(),
                 "predicted_fare": round(last_val, 0)}
                for i in range(horizon_days)
            ]
            result["buy_or_wait"] = "NEUTRAL"
        else:
            result["method"] = "fallback_failed"
            result["forecast"] = []
            result["buy_or_wait"] = "insufficient_data"

    return result


def forecast_all_routes(horizon_days: int = 7) -> list[dict]:
    """Forecast all routes in the basket."""
    results = []
    for route in ROUTE_BASKET:
        for window in (1, 7, 15):  # focus on most-used windows
            try:
                r = forecast_route(route.origin, route.destination, window, horizon_days)
                results.append(r)
            except Exception as e:
                logger.error(f"Forecast error {route.origin}-{route.destination} T+{window}: {e}")
    return results
