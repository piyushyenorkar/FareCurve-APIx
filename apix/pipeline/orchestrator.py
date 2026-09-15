"""Pipeline orchestrator: scrape -> clean -> store -> compute."""
from __future__ import annotations
import asyncio, logging, uuid
from datetime import date, datetime, timezone
from apix.domain import SOURCES, SOURCES_BY_SLUG, ROUTE_BASKET, BOOKING_WINDOWS
from apix.scrapers.base import FareQuote
from apix.pipeline.clean import clean_pipeline
from apix.pipeline.reconstruct import generate_reconstructed_fares
from apix.config import settings
from apix.db import session_scope
from apix.db.models import CleanedFare, CollectionRun, DataQualityLog

logger = logging.getLogger(__name__)

SCRAPER_REGISTRY = {}
try:
    from apix.scrapers.akasa import AkasaScraper
    SCRAPER_REGISTRY["akasa"] = AkasaScraper
except ImportError:
    pass
try:
    from apix.scrapers.spicejet import SpiceJetScraper
    SCRAPER_REGISTRY["spicejet"] = SpiceJetScraper
except ImportError:
    pass
try:
    from apix.scrapers.airindia import AirIndiaScraper
    SCRAPER_REGISTRY["airindia"] = AirIndiaScraper
except ImportError:
    pass
try:
    from apix.scrapers.yatra import YatraScraper
    SCRAPER_REGISTRY["yatra"] = YatraScraper
except ImportError:
    pass


def _get_allowed_slugs() -> list[str]:
    return [s.slug for s in SOURCES if s.documented_verdict.value == "ALLOW"]

def _get_gated_slugs() -> list[str]:
    return [s.slug for s in SOURCES if s.documented_verdict.value == "DENY"]


async def run_scraping(allowed_only: bool = True, routes=None) -> list[dict]:
    all_quotes = []
    slugs = _get_allowed_slugs() if allowed_only else list(SCRAPER_REGISTRY.keys())
    for slug in slugs:
        scraper_cls = SCRAPER_REGISTRY.get(slug)
        if not scraper_cls:
            continue
        logger.info(f"Scraping {slug}...")
        try:
            async with scraper_cls(headless=settings.headless, timeout=settings.scrape_timeout_seconds) as scraper:
                quotes = await scraper.scrape_all_routes(routes=routes)
                all_quotes.extend([q.to_dict() for q in quotes])
                logger.info(f"{slug}: got {len(quotes)} quotes")
        except Exception as e:
            logger.error(f"{slug} scraping failed: {e}")
    return all_quotes


def store_quotes(quotes: list[dict], run_uid: str) -> int:
    from apix.db.models import RawFareSnapshot
    stored = 0
    today = date.today()
    with session_scope() as s:
        valid_quotes = [q for q in quotes if q.get("total_fare")]
        
        raw_objects = []
        for q in valid_quotes:
            route_key = f"{q['origin']}-{q['destination']}"
            raw_objects.append(RawFareSnapshot(
                source_slug=q["source_slug"],
                source_type=q.get("source_type") or SOURCES_BY_SLUG[q["source_slug"]].source_type.value,
                provenance=q.get("provenance", "LIVE_SCRAPE"),
                origin=q["origin"],
                destination=q["destination"],
                route_key=route_key,
                travel_date=q["travel_date"] if isinstance(q["travel_date"], date) else date.fromisoformat(q["travel_date"]),
                observation_date=today,
                observed_at=datetime.now(timezone.utc),
                booking_window_days=q["booking_window"],
                carrier_code=q.get("carrier_code"),
                flight_number=q.get("flight_number"),
                fare_class=q.get("fare_class"),
                base_fare=q.get("base_fare"),
                taxes=q.get("taxes"),
                convenience_fee=q.get("convenience_fee"),
                total_fare=q["total_fare"],
                availability_status=q.get("availability", "available"),
            ))
            
        if raw_objects:
            s.add_all(raw_objects)
            s.flush()
            
            cleaned_objects = []
            for i, q in enumerate(valid_quotes):
                route_key = f"{q['origin']}-{q['destination']}"
                cleaned_objects.append(CleanedFare(
                    raw_id=raw_objects[i].id,
                    source_slug=q["source_slug"],
                    source_type=q.get("source_type") or SOURCES_BY_SLUG[q["source_slug"]].source_type.value,
                    provenance=q.get("provenance", "LIVE_SCRAPE"),
                    origin=q["origin"],
                    destination=q["destination"],
                    route_key=route_key,
                    travel_date=q["travel_date"] if isinstance(q["travel_date"], date) else date.fromisoformat(q["travel_date"]),
                    observation_date=today,
                    observed_at=datetime.now(timezone.utc),
                    booking_window_days=q["booking_window"],
                    carrier_code=q.get("carrier_code"),
                    flight_number=q.get("flight_number"),
                    fare_class=q.get("fare_class"),
                    base_fare=q.get("base_fare"),
                    taxes=q.get("taxes"),
                    convenience_fee=q.get("convenience_fee"),
                    total_fare=q["total_fare"],
                    availability_status=q.get("availability", "available"),
                    is_outlier=q.get("is_outlier", False),
                    included_in_index=not q.get("is_outlier", False),
                ))
            s.add_all(cleaned_objects)
            stored += len(valid_quotes)
    logger.info(f"Stored {stored} fare observations")
    return stored


async def run_pipeline(
    allowed_only: bool = True,
    include_reconstruction: bool = True,
    routes=None,
    dry_run: bool = False,
) -> dict:
    run_uid = str(uuid.uuid4())[:12]
    report = {"run_uid": run_uid, "started_at": datetime.now(timezone.utc).isoformat()}

    # 1. Scrape
    logger.info("=== Phase 1: Scraping ===")
    live_quotes = await run_scraping(allowed_only=allowed_only, routes=routes)
    report["live_quotes"] = len(live_quotes)

    # 2. Reconstruct
    reconstructed_quotes = []
    if include_reconstruction:
        logger.info("=== Phase 2: Reconstruction ===")
        gated = _get_gated_slugs()
        recon_fares = generate_reconstructed_fares(gated, live_quotes)
        reconstructed_quotes = [q.to_dict() for q in recon_fares]
        report["reconstructed_quotes"] = len(reconstructed_quotes)

    # 3. Clean
    logger.info("=== Phase 3: Cleaning ===")
    all_quotes = live_quotes + reconstructed_quotes
    cleaned = clean_pipeline(all_quotes)
    report["cleaned_quotes"] = len(cleaned)

    # 4. Store
    if not dry_run:
        logger.info("=== Phase 4: Storing ===")
        stored = store_quotes(cleaned, run_uid)
        report["stored"] = stored

        # 5. Compute index
        logger.info("=== Phase 5: Computing index ===")
        try:
            from apix.index.compute import compute_daily_index
            index_result = compute_daily_index(run_uid)
            report["index"] = index_result
        except Exception as e:
            logger.error(f"Index computation failed: {e}")
            report["index_error"] = str(e)

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    return report
