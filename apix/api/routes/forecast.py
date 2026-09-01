"""Forecast and Buy-Now-or-Wait endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Query
from apix.index.forecast import forecast_route, forecast_all_routes

router = APIRouter()

@router.get("/forecast/{origin}/{destination}")
def get_forecast(
    origin: str, destination: str,
    window: int = Query(15, description="Booking window days"),
    horizon: int = Query(7, ge=1, le=30),
):
    return forecast_route(origin.upper(), destination.upper(), window, horizon)

@router.get("/forecast/all")
def get_all_forecasts(horizon: int = Query(7, ge=1, le=30)):
    return forecast_all_routes(horizon)
