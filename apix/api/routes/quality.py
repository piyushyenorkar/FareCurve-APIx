"""Data quality and confidence score endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Query
from datetime import date, timedelta
from sqlalchemy import select, and_
from apix.db import session_scope
from apix.db.models import DataQualityLog

router = APIRouter()

@router.get("/quality/current")
def current_quality():
    with session_scope() as s:
        row = s.scalars(
            select(DataQualityLog)
            .where(DataQualityLog.scope == "overall")
            .order_by(DataQualityLog.log_date.desc())
            .limit(1)
        ).first()
    if not row:
        return {"error": "No quality data yet"}
    return {
        "date": row.log_date.isoformat(),
        "confidence_pct": float(row.confidence_pct) if row.confidence_pct else 0,
        "confidence_band": row.confidence_band,
        "expected": row.expected_data_points,
        "actual": row.actual_data_points,
        "live": row.observed_data_points,
        "reconstructed": row.reconstructed_data_points,
        "coverage_pct": float(row.coverage_pct) if row.coverage_pct else 0,
    }

@router.get("/quality/history")
def quality_history(days: int = Query(30, ge=1, le=180)):
    cutoff = date.today() - timedelta(days=days)
    with session_scope() as s:
        rows = s.scalars(
            select(DataQualityLog)
            .where(and_(
                DataQualityLog.scope == "overall",
                DataQualityLog.log_date >= cutoff,
            ))
            .order_by(DataQualityLog.log_date)
        ).all()
    return [
        {
            "date": r.log_date.isoformat(),
            "confidence_pct": float(r.confidence_pct) if r.confidence_pct else 0,
            "band": r.confidence_band,
            "coverage_pct": float(r.coverage_pct) if r.coverage_pct else 0,
            "live": r.observed_data_points,
            "reconstructed": r.reconstructed_data_points,
        }
        for r in rows
    ]
