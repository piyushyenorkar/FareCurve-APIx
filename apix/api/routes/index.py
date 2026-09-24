"""Index endpoints: overall, per-route, per-booking-window."""
from __future__ import annotations
from fastapi import APIRouter, Query
from apix.index.compute import get_index_history, compute_daily_index
from apix.domain import ROUTE_BASKET, BOOKING_WINDOWS

router = APIRouter()

@router.get("/index/latest")
def index_latest():
    """Get the latest computed APIx value."""
    history = get_index_history(limit=1)
    if not history:
        return {"error": "No index data yet. Run the pipeline first.", "value": None}
    return history[-1]

@router.get("/index/overall")
def index_overall(
    frequency: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    limit: int = Query(90, ge=1, le=365),
):
    """Historical overall APIx values."""
    return get_index_history(frequency=frequency, limit=limit)

@router.get("/index/route/{origin}/{destination}")
def index_route(
    origin: str,
    destination: str,
    limit: int = Query(90, ge=1, le=365),
):
    """Historical index for a specific route."""
    route_key = f"{origin.upper()}-{destination.upper()}"
    return get_index_history(route_key=route_key, limit=limit)

@router.get("/index/booking-curve/{origin}/{destination}")
def booking_curve(origin: str, destination: str, carrier: str = None, source: str = None):
    """Booking-window curve: price at T+1, T+7, T+15, T+30, T+45."""
    from datetime import date, timedelta
    from sqlalchemy import select, and_, func
    from apix.db import session_scope
    from apix.db.models import CleanedFare

    route_key = f"{origin.upper()}-{destination.upper()}"
    today = date.today()
    lookback = today - timedelta(days=7)

    with session_scope() as s:
        q = select(
                CleanedFare.booking_window_days,
                func.avg(CleanedFare.total_fare).label("avg_fare"),
                func.min(CleanedFare.total_fare).label("min_fare"),
                func.max(CleanedFare.total_fare).label("max_fare"),
                func.count().label("n"),
            ).where(and_(
                CleanedFare.route_key == route_key,
                CleanedFare.observation_date >= lookback,
                CleanedFare.included_in_index == True,
                CleanedFare.total_fare.isnot(None),
            ))
        if carrier:
            q = q.where(CleanedFare.carrier_code == carrier)
        if source:
            q = q.where(CleanedFare.source_slug == source)
        
        rows = s.execute(
            q.group_by(CleanedFare.booking_window_days)
            .order_by(CleanedFare.booking_window_days)
        ).all()

    return {
        "route": route_key,
        "period": f"{lookback} to {today}",
        "curve": [
            {
                "window": f"T+{r[0]}",
                "days_before_travel": r[0],
                "avg_fare": round(float(r[1]), 0),
                "min_fare": round(float(r[2]), 0),
                "max_fare": round(float(r[3]), 0),
                "observations": r[4],
            }
            for r in rows
        ],
    }

@router.get("/index/routes")
def list_routes():
    """All routes in the basket with metadata."""
    from apix.domain import AIRPORTS
    return [
        {
            "route_key": f"{r.origin}-{r.destination}",
            "origin": {"iata": r.origin, "city": AIRPORTS[r.origin].city},
            "destination": {"iata": r.destination, "city": AIRPORTS[r.destination].city},
        }
        for r in ROUTE_BASKET
    ]
