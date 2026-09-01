"""IndiGo scraper. robots.txt: DENY - Disallow: /search.html.
Code is fully functional but compliance gate blocks execution by default.
Set APIX_RESPECT_ROBOTS=false to enable (e.g. with official NSO/RBI authorization)."""
from __future__ import annotations
import logging, re
from datetime import date, datetime, timezone
from apix.scrapers.base import FareScraper, FareQuote
from apix.domain import Availability

logger = logging.getLogger(__name__)

class IndiGoScraper(FareScraper):
    SOURCE_SLUG = "indigo"
    CARRIER_CODES = ('6E',)
    GATED = True  # Blocked by robots.txt

    async def _scrape_route(self, origin: str, destination: str, travel_date: date, booking_window: int) -> list[FareQuote]:
        page = await self._context.new_page()
        try:
            url = f"https://www.goindigo.in/search.html?origin={origin}&destination={destination}&date={travel_date.strftime("%Y-%m-%d")}&adults=1"
            await page.goto(url, timeout=self.timeout * 1000, wait_until="domcontentloaded")
            await page.wait_for_timeout(8000)

            flights = await page.query_selector_all('[class*="flight"], [class*="fare"], [class*="result"], [data-testid*="flight"]')
            quotes = []
            now = datetime.now(timezone.utc).isoformat()

            for flight in flights:
                try:
                    text = await flight.inner_text()
                    lines = [l.strip() for l in text.split("\\n") if l.strip()]
                    price = None
                    flight_num = dep_time = arr_time = None

                    for line in lines:
                        m = re.search(r"([A-Z0-9]{2})[- ]?(\\d+)", line)
                        if m and not flight_num:
                            flight_num = f"{m.group(1)} {m.group(2)}"
                        clean = line.replace(",", "").replace("\\u20b9", "").replace("INR", "").strip()
                        try:
                            val = float(clean)
                            if 500 <= val <= 50000 and (price is None or val < price):
                                price = val
                        except ValueError:
                            pass
                        tm = re.search(r"(\\d{1,2}:\\d{2})", line)
                        if tm:
                            if dep_time is None: dep_time = tm.group(1)
                            else: arr_time = tm.group(1)

                    if price and price >= 500:
                        quotes.append(FareQuote(
                            source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                            travel_date=travel_date.isoformat(), observed_at=now,
                            booking_window=booking_window, carrier_code="6E",
                            flight_number=flight_num, departure_time=dep_time,
                            arrival_time=arr_time, total_fare=price, fare_class="economy",
                        ))
                except Exception as e:
                    logger.debug(f"Parse error: {e}")

            if not quotes:
                quotes.append(FareQuote(
                    source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                    travel_date=travel_date.isoformat(), observed_at=now,
                    booking_window=booking_window, carrier_code="6E",
                    availability=Availability.FETCH_FAILED.value,
                ))
            return quotes
        finally:
            await page.close()
