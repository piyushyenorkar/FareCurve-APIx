"""Raw fare data endpoints for transparency and audit."""
from __future__ import annotations
from fastapi import APIRouter, Query
from datetime import date, timedelta
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import CleanedFare

router = APIRouter()

@router.get("/fares/raw")
def fares_raw(
    route: str | None = Query(None, description="e.g. DEL-BOM"),
    source: str | None = Query(None),
    carrier: str | None = Query(None),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(200, ge=1, le=1000),
):
    """Raw cleaned fares, filterable."""
    cutoff = date.today() - timedelta(days=days)
    with session_scope() as s:
        q = select(CleanedFare).where(CleanedFare.observation_date >= cutoff)
        if route:
            q = q.where(CleanedFare.route_key == route.upper())
        if source:
            q = q.where(CleanedFare.source_slug == source)
        if carrier:
            q = q.where(CleanedFare.carrier_code == carrier.upper())
        q = q.order_by(CleanedFare.observed_at.desc()).limit(limit)
        rows = s.scalars(q).all()

    return [
        {
            "route": r.route_key,
            "travel_date": str(r.travel_date),
            "booking_window": f"T+{r.booking_window_days}",
            "carrier": r.carrier_code,
            "flight": r.flight_number,
            "base_fare": float(r.base_fare) if r.base_fare else None,
            "taxes": float(r.taxes) if r.taxes else None,
            "convenience_fee": float(r.convenience_fee) if r.convenience_fee else None,
            "total_fare": float(r.total_fare) if r.total_fare else None,
            "source": r.source_slug,
            "provenance": r.provenance,
            "fare_class": r.fare_class,
            "observed_at": r.observed_at.isoformat() if r.observed_at else None,
        }
        for r in rows
    ]

@router.get("/fares/breakdown/{route}")
def fare_breakdown(route: str, days: int = Query(7, ge=1, le=90), window: str = Query("ALL")):
    """Base fare vs taxes vs fees breakdown per carrier and OTA for a route."""
    cutoff = date.today() - timedelta(days=days)
    from sqlalchemy import func
    with session_scope() as s:
        # Base where clause
        where_clause = and_(
            CleanedFare.route_key == route.upper(),
            CleanedFare.observation_date >= cutoff,
            CleanedFare.total_fare.isnot(None),
        )
        if window != "ALL":
            try:
                w_days = int(window.replace("T+", ""))
                where_clause = and_(where_clause, CleanedFare.booking_window_days == w_days)
            except ValueError:
                pass
                
        # Carrier breakdown
        carrier_rows = s.execute(
            select(
                CleanedFare.carrier_code,
                func.avg(CleanedFare.base_fare).label("avg_base"),
                func.avg(CleanedFare.taxes).label("avg_taxes"),
                func.avg(CleanedFare.convenience_fee).label("avg_conv"),
                func.avg(CleanedFare.total_fare).label("avg_total"),
                func.count().label("n"),
            ).where(where_clause).group_by(CleanedFare.carrier_code)
        ).all()

        # OTA breakdown
        ota_rows = s.execute(
            select(
                CleanedFare.source_code,
                func.avg(CleanedFare.base_fare).label("avg_base"),
                func.avg(CleanedFare.taxes).label("avg_taxes"),
                func.avg(CleanedFare.convenience_fee).label("avg_conv"),
                func.avg(CleanedFare.total_fare).label("avg_total"),
                func.count().label("n"),
            ).where(where_clause).group_by(CleanedFare.source_code)
        ).all()

    return {
        "route": route.upper(),
        "carriers": [
            {
                "carrier": r[0],
                "avg_base_fare": round(float(r[1]), 0) if r[1] else None,
                "avg_taxes": round(float(r[2]), 0) if r[2] else None,
                "avg_convenience_fee": round(float(r[3]), 0) if r[3] else None,
                "avg_total_fare": round(float(r[4]), 0) if r[4] else None,
                "observations": r[5]
            } for r in carrier_rows
        ],
        "otas": [
            {
                "carrier": r[0],
                "avg_base_fare": round(float(r[1]), 0) if r[1] else None,
                "avg_taxes": round(float(r[2]), 0) if r[2] else None,
                "avg_convenience_fee": round(float(r[3]), 0) if r[3] else None,
                "avg_total_fare": round(float(r[4]), 0) if r[4] else None,
                "observations": r[5]
            } for r in ota_rows
        ]
    }