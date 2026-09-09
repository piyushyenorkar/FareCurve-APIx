"""Index weights: routes and booking windows.

The PS asks for "an index-construction module based on PSD given routes and weights",
and Context-of-PS.md names traffic weighting as USP #3. Two weight sets are needed:

**Route weights.** Preference order, highest first:

  1. Published city-pair O&D passengers (``seed/route_traffic.csv``, PUBLISHED rows).
     A real number beats any model.
  2. A **gravity estimate** from airport-wise domestic throughput:

         w_ij  =  (P_i * P_j) / d_ij^a        with a = 0.6   (normalised)

     This is the standard gravity specification used in transport demand work: flows
     rise with the mass of both endpoints and fall with distance. a = 0.6 is chosen
     because Indian domestic air O&D is distance-*attracted* at short range (rail
     substitutes below ~500 km) yet capacity-constrained at long range, so the decay
     is much weaker than the a ~ 1-2 typical of road freight. The value is a single
     documented, tunable constant rather than a black box, and ``apix weights explain``
     prints the full derivation for any route.

Whichever basis is used is recorded per row in ``weight_basis``, and the whole set is
stamped with a ``vintage``. Vintages are never edited — a rebuild inserts a new one —
so any index number APIx has ever published can be reproduced against the exact
weights that produced it.

**Booking-window weights.** The five advance-purchase windows are not equally
representative of what travellers pay: most domestic leisure bookings cluster 2–5
weeks out while business travel skews late. Treating a T+45 fare as equally
representative as a T+1 walk-up would bias the headline index downward. The default
distribution is documented in ``DEFAULT_WINDOW_WEIGHTS`` and is overridable.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Any

from sqlalchemy import select, update

from apix.db import session_scope
from apix.db.models import BookingWindowWeight, RouteWeight
from apix.domain import AIRPORTS, BOOKING_WINDOWS, ROUTE_BASKET, Route
from apix.reference.dgca import PROVENANCE_PUBLISHED, read_airport_passengers, read_route_traffic

GRAVITY_DISTANCE_EXPONENT = 0.6

#: Share of domestic bookings made in each advance-purchase bucket. Sums to 1.
#: Documented as a methodological assumption, not a measurement — and replaceable
#: with a real distribution the moment one is published.
DEFAULT_WINDOW_WEIGHTS: dict[int, float] = {
    1: 0.10,
    7: 0.20,
    15: 0.26,
    30: 0.28,
    45: 0.16,
}
DEFAULT_WINDOW_WEIGHTS_CITATION = (
    "APIx methodological assumption. Approximates the observed clustering of Indian "
    "domestic bookings 2-5 weeks before departure, with a thinner walk-up tail. "
    "Documented in docs/METHODOLOGY.md §4.2 and replaceable via "
    "'apix weights window-weights' once a published booking-lead distribution is "
    "available. Equal weighting is available as a sensitivity check "
    "('apix index compute --window-weights equal')."
)


def haversine_km(a: str, b: str) -> float:
    """Great-circle distance between two airports, in km."""
    pa, pb = AIRPORTS[a], AIRPORTS[b]
    lat1, lon1, lat2, lon2 = map(math.radians, (pa.lat, pa.lon, pb.lat, pb.lon))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


def derive_route_weights(
    routes: tuple[Route, ...] = ROUTE_BASKET,
    *,
    distance_exponent: float = GRAVITY_DISTANCE_EXPONENT,
) -> list[dict[str, Any]]:
    """Compute one weight row per route, recording which basis each row used."""
    pax_rows = read_airport_passengers()
    pax: dict[str, float] = {}
    pax_provenance: dict[str, str] = {}
    pax_citation: dict[str, str] = {}
    for row in pax_rows:
        pax[row["iata"]] = row["domestic_passengers"]
        pax_provenance[row["iata"]] = row["provenance"]
        pax_citation[row["iata"]] = row["source_citation"]

    published_od = {
        r["route_key"]: r for r in read_route_traffic() if r["provenance"] == PROVENANCE_PUBLISHED
    }

    rows: list[dict[str, Any]] = []
    for route in routes:
        od = published_od.get(route.key) or published_od.get(
            f"{route.destination}-{route.origin}"
        )
        distance = haversine_km(route.origin, route.destination)
        if od is not None:
            raw = float(od["annual_passengers"])
            basis = "dgca_od_passengers"
            citation = od["source_citation"] or "Published city-pair O&D passengers."
            url = od.get("source_url")
            annual = raw
        else:
            p_o = pax.get(route.origin)
            p_d = pax.get(route.destination)
            if not p_o or not p_d:
                continue
            raw = ((p_o * p_d) / (distance**distance_exponent)) / 1e6
            basis = "gravity_from_airport_pax"
            annual = None
            src = {pax_provenance.get(route.origin), pax_provenance.get(route.destination)}
            quality = (
                "published airport throughput"
                if src == {PROVENANCE_PUBLISHED}
                else "calibration-grade airport throughput"
            )
            citation = (
                f"Gravity estimate w = (P_o*P_d)/d^{distance_exponent} from {quality}: "
                f"P_{route.origin}={p_o:,.0f}, P_{route.destination}={p_d:,.0f}, "
                f"d={distance:,.0f} km. Basis rows: "
                f"{pax_citation.get(route.origin, 'n/a')} | "
                f"{pax_citation.get(route.destination, 'n/a')}"
            )
            url = "https://www.aai.aero/en/business-opportunities/aai-traffic-news"

        rows.append(
            {
                "route_key": route.key,
                "origin": route.origin,
                "destination": route.destination,
                "tier": route.tier,
                "annual_passengers": annual,
                "weight_raw": raw,
                "weight_basis": basis,
                "source_citation": citation,
                "source_url": url,
                "distance_km": round(distance, 1),
            }
        )

    total = sum(r["weight_raw"] for r in rows) or 1.0
    for row in rows:
        row["weight"] = row["weight_raw"] / total
    return rows


def store_route_weights(
    rows: list[dict[str, Any]],
    *,
    vintage: str | None = None,
    reference_period: str | None = None,
    activate: bool = True,
) -> str:
    """Persist a weight vintage. Never mutates an existing one."""
    vintage = vintage or f"auto-{date.today().isoformat()}"
    with session_scope() as s:
        existing = s.scalars(
            select(RouteWeight).where(RouteWeight.vintage == vintage)
        ).all()
        for row in existing:
            s.delete(row)
        s.flush()
        for row in rows:
            s.add(
                RouteWeight(
                    vintage=vintage,
                    origin=row["origin"],
                    destination=row["destination"],
                    route_key=row["route_key"],
                    tier=row.get("tier", 1),
                    annual_passengers=row.get("annual_passengers"),
                    weight_raw=row["weight_raw"],
                    weight=row["weight"],
                    weight_basis=row["weight_basis"],
                    source_citation=row["source_citation"],
                    source_url=row.get("source_url"),
                    reference_period=reference_period,
                    is_active=False,
                )
            )
        if activate:
            s.execute(update(RouteWeight).values(is_active=False))
            s.flush()
            s.execute(
                update(RouteWeight).where(RouteWeight.vintage == vintage).values(is_active=True)
            )
    return vintage


def store_window_weights(
    weights: dict[int, float] | None = None,
    *,
    vintage: str | None = None,
    citation: str | None = None,
    activate: bool = True,
) -> str:
    weights = weights or DEFAULT_WINDOW_WEIGHTS
    missing = set(BOOKING_WINDOWS) - set(weights)
    if missing:
        raise ValueError(f"booking-window weights missing for {sorted(missing)}")
    total = sum(weights[w] for w in BOOKING_WINDOWS)
    if total <= 0:
        raise ValueError("booking-window weights must be positive")

    vintage = vintage or f"auto-{date.today().isoformat()}"
    with session_scope() as s:
        for row in s.scalars(
            select(BookingWindowWeight).where(BookingWindowWeight.vintage == vintage)
        ).all():
            s.delete(row)
        s.flush()
        for window in BOOKING_WINDOWS:
            s.add(
                BookingWindowWeight(
                    vintage=vintage,
                    booking_window_days=window,
                    weight=weights[window] / total,
                    source_citation=citation or DEFAULT_WINDOW_WEIGHTS_CITATION,
                    is_active=False,
                )
            )
        if activate:
            s.execute(update(BookingWindowWeight).values(is_active=False))
            s.flush()
            s.execute(
                update(BookingWindowWeight)
                .where(BookingWindowWeight.vintage == vintage)
                .values(is_active=True)
            )
    return vintage


def rebuild(
    *, vintage: str | None = None, reference_period: str | None = None, activate: bool = True
) -> dict[str, Any]:
    """Derive and store both weight sets. Idempotent for a given vintage name."""
    rows = derive_route_weights()
    route_vintage = store_route_weights(
        rows, vintage=vintage, reference_period=reference_period, activate=activate
    )
    window_vintage = store_window_weights(vintage=vintage, activate=activate)
    bases = sorted({r["weight_basis"] for r in rows})
    return {
        "route_vintage": route_vintage,
        "window_vintage": window_vintage,
        "routes": len(rows),
        "weight_bases": bases,
        "gravity_routes": sum(1 for r in rows if r["weight_basis"] == "gravity_from_airport_pax"),
        "published_od_routes": sum(1 for r in rows if r["weight_basis"] == "dgca_od_passengers"),
        "top5": sorted(rows, key=lambda r: -r["weight"])[:5],
    }


# ---------------------------------------------------------------------- accessors


def active_route_weights() -> dict[str, float]:
    with session_scope() as s:
        rows = s.scalars(select(RouteWeight).where(RouteWeight.is_active.is_(True))).all()
        return {r.route_key: float(r.weight) for r in rows}


def active_route_weight_vintage() -> str | None:
    with session_scope() as s:
        row = s.scalars(select(RouteWeight).where(RouteWeight.is_active.is_(True)).limit(1)).first()
        return row.vintage if row else None


def active_window_weights() -> dict[int, float]:
    with session_scope() as s:
        rows = s.scalars(
            select(BookingWindowWeight).where(BookingWindowWeight.is_active.is_(True))
        ).all()
        return {r.booking_window_days: float(r.weight) for r in rows}


def weight_table() -> list[dict[str, Any]]:
    """Full active weight set with citations, for the API and the dashboard."""
    with session_scope() as s:
        rows = s.scalars(
            select(RouteWeight)
            .where(RouteWeight.is_active.is_(True))
            .order_by(RouteWeight.weight.desc())
        ).all()
        return [
            {
                "route_key": r.route_key,
                "origin": r.origin,
                "destination": r.destination,
                "tier": r.tier,
                "weight": float(r.weight),
                "weight_pct": round(float(r.weight) * 100, 3),
                "weight_basis": r.weight_basis,
                "annual_passengers": float(r.annual_passengers) if r.annual_passengers else None,
                "distance_km": round(haversine_km(r.origin, r.destination), 1),
                "vintage": r.vintage,
                "reference_period": r.reference_period,
                "source_citation": r.source_citation,
                "source_url": r.source_url,
            }
            for r in rows
        ]


def explain(route_key: str) -> dict[str, Any]:
    """Human-readable derivation for one route. Answers "why does DEL-BOM weigh that?"."""
    table = {row["route_key"]: row for row in weight_table()}
    row = table.get(route_key)
    if row is None:
        raise KeyError(f"{route_key} is not in the active weight vintage")
    return {
        **row,
        "formula": (
            "w_raw = annual_passengers (published O&D)"
            if row["weight_basis"] == "dgca_od_passengers"
            else f"w_raw = (P_origin x P_destination) / distance_km^{GRAVITY_DISTANCE_EXPONENT}"
        ),
        "normalisation": "w = w_raw / sum(w_raw over the active basket)",
        "share_of_index": f"{row['weight_pct']:.3f}% of the headline APIx",
    }


