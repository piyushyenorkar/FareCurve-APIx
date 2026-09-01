"""Anomaly and surge detection endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Query
from apix.index.anomaly import get_recent_anomalies, detect_anomalies

router = APIRouter()

@router.get("/anomalies")
def list_anomalies(limit: int = Query(50, ge=1, le=200)):
    return get_recent_anomalies(limit)

@router.get("/anomalies/detect")
def run_detection(lookback: int = Query(30, ge=7, le=90)):
    return detect_anomalies(lookback)
