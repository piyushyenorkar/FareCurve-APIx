"""Reference data: CPI, ATF, compliance matrix, series catalogue."""
from __future__ import annotations
from fastapi import APIRouter
from apix.reference.series import series_catalogue, get_series_frame, CPI_AIRFARE_KEY, WPI_ATF_KEY
from apix.domain import SOURCES, PS_ELEVEN

router = APIRouter()

@router.get("/reference/series-catalogue")
def get_catalogue():
    return series_catalogue()

@router.get("/reference/cpi-airfare")
def cpi_airfare():
    df = get_series_frame(CPI_AIRFARE_KEY)
    if df.empty:
        return {"error": "No CPI airfare data. Run pix reference refresh first."}
    return df.to_dict(orient="records")

@router.get("/reference/atf-price")
def atf_price():
    df = get_series_frame(WPI_ATF_KEY)
    if df.empty:
        return {"error": "No ATF data. Run pix reference refresh first."}
    return df.to_dict(orient="records")

@router.get("/reference/compliance-matrix")
def compliance_matrix():
    return [
        {
            "slug": s.slug,
            "name": s.display_name,
            "type": s.source_type.value,
            "url": s.base_url,
            "verdict": s.documented_verdict.value,
            "rule": s.governing_rule,
            "is_ps_source": s.slug in PS_ELEVEN,
            "notes": s.notes if hasattr(s, "notes") else None,
            "tags": list(s.tags) if hasattr(s, "tags") and s.tags else [],
        }
        for s in SOURCES
    ]

@router.get("/reference/atf-correlation")
def atf_correlation():
    """ATF price vs APIx correlation data for the dashboard."""
    from apix.index.compute import get_index_history
    idx = get_index_history(limit=90)
    atf = get_series_frame(WPI_ATF_KEY)
    return {
        "apix_history": idx,
        "atf_history": atf.to_dict(orient="records") if not atf.empty else [],
    }
