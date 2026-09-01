"""Abstract base for all fare scrapers.

Every adapter subclasses FareScraper and implements _scrape_route().
The base handles: Playwright lifecycle, structured output, error tracking.
"""
from __future__ import annotations
import asyncio, logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta, timezone
from typing import Any
from apix.domain import Availability, Provenance, ROUTE_BASKET, BOOKING_WINDOWS

logger = logging.getLogger(__name__)


@dataclass
class FareQuote:
    """One fare observation from one source for one flight."""
    source_slug: str
    origin: str
    destination: str
    travel_date: str
    observed_at: str
    booking_window: int
    carrier_code: str
    flight_number: str | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    base_fare: float | None = None
    taxes: float | None = None
    convenience_fee: float | None = None
    total_fare: float | None = None
    fare_class: str | None = None
    fare_brand: str | None = None
    availability: str = Availability.AVAILABLE.value
    provenance: str = Provenance.LIVE_SCRAPE.value
    currency: str = "INR"
    stops: int = 0
    duration_minutes: int | None = None
    raw_data: dict | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class FareScraper(ABC):
    """Base class for all scrapers."""
    SOURCE_SLUG: str = ""
    CARRIER_CODES: tuple[str, ...] = ()

    def __init__(self, headless: bool = True, timeout: float = 45.0):
        self.headless = headless
        self.timeout = timeout
        self._browser = None
        self._context = None
        self._pw = None

    async def __aenter__(self):
        from playwright.async_api import async_playwright
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=self.headless)
        self._context = await self._browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-IN",
        )
        return self

    async def __aexit__(self, *args):
        if self._context: await self._context.close()
        if self._browser: await self._browser.close()
        if self._pw: await self._pw.stop()

    async def scrape_all_routes(
        self,
        routes: list[tuple[str, str]] | None = None,
        windows: tuple[int, ...] = BOOKING_WINDOWS,
    ) -> list[FareQuote]:
        routes = routes or [(r.origin, r.destination) for r in ROUTE_BASKET]
        all_quotes: list[FareQuote] = []
        today = date.today()
        for origin, dest in routes:
            for window in windows:
                travel_date = today + timedelta(days=window)
                try:
                    quotes = await self._scrape_route(origin, dest, travel_date, window)
                    all_quotes.extend(quotes)
                    logger.info(f"{self.SOURCE_SLUG}: {origin}-{dest} T+{window} -> {len(quotes)} quotes")
                except Exception as e:
                    logger.error(f"{self.SOURCE_SLUG}: {origin}-{dest} T+{window} failed: {e}")
                    all_quotes.append(FareQuote(
                        source_slug=self.SOURCE_SLUG, origin=origin, destination=dest,
                        travel_date=travel_date.isoformat(),
                        observed_at=datetime.now(timezone.utc).isoformat(),
                        booking_window=window,
                        carrier_code=self.CARRIER_CODES[0] if self.CARRIER_CODES else "XX",
                        availability=Availability.FETCH_FAILED.value,
                    ))
                await asyncio.sleep(3.0)
        return all_quotes

    @abstractmethod
    async def _scrape_route(self, origin: str, destination: str, travel_date: date, booking_window: int) -> list[FareQuote]:
        ...
