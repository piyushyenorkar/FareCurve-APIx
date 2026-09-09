"""FastAPI application: the NSO/RBI-consumable API surface."""
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apix.config import settings
from apix.api.routes import index, fares, forecast, anomalies, quality, reference, ai

app = FastAPI(
    title="APIx - Real-time Airfare Price Index for India",
    description=(
        "Automated airfare index for CPI augmentation. "
        "SIH Problem Statement 26056 - MoSPI DIID."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(index.router, prefix="/api/v1", tags=["Index"])
app.include_router(fares.router, prefix="/api/v1", tags=["Fares"])
app.include_router(forecast.router, prefix="/api/v1", tags=["Forecast"])
app.include_router(anomalies.router, prefix="/api/v1", tags=["Anomalies"])
app.include_router(quality.router, prefix="/api/v1", tags=["Data Quality"])
app.include_router(reference.router, prefix="/api/v1", tags=["Reference Data"])
app.include_router(ai.router, prefix="/api/v1", tags=["AI"])


@app.get("/", tags=["Health"])
def root():
    return {
        "name": "APIx - Real-time Airfare Price Index",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "problem_statement": "SIH-26056",
        "organization": "MoSPI DIID",
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
