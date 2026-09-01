"""APIx — Real-time Airfare Price Index for India.

Built for SIH26056 (MoSPI, Data Informatics & Innovation Division).

The package is organised as a one-way dependency chain so every layer is
independently testable:

    reference/   official statistics (MoSPI CPI + WPI, DGCA, AAI)   -- no deps
    compliance/  RFC 9309 robots.txt engine + rate limiter          -- no deps
    sources/     one adapter per airline / OTA / official API       -- needs compliance
    pipeline/    collect -> clean -> quality                        -- needs sources
    index/       weights -> price relatives -> APIx -> analytics    -- needs pipeline
    api/         FastAPI service consumed by NSO/RBI + dashboard    -- needs index
"""

__version__ = "1.0.0"
__all__ = ["__version__"]
