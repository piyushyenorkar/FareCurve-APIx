"""Official statistics ingestion — the layer that makes APIx a *statistical* product.

    mospi.py   MoSPI eSankhyiki REST API: CPI item 294 "Airfare" and the WPI ATF series
    series.py  the registry of series we ingest, plus persistence
    dgca.py    DGCA / AAI published artefacts: TMU route fares, airport passenger volumes
    weights.py turns airport / O&D passenger volumes into a versioned weight vintage
"""

from apix.reference.mospi import MoSPIClient, MoSPIError
from apix.reference.series import (
    SERIES_DEFINITIONS,
    SeriesDefinition,
    get_series_frame,
    refresh_all,
    upsert_series_observations,
)

__all__ = [
    "MoSPIClient",
    "MoSPIError",
    "SERIES_DEFINITIONS",
    "SeriesDefinition",
    "get_series_frame",
    "refresh_all",
    "upsert_series_observations",
]
