"""Yatra OTA scraper. robots.txt: ALLOW. Multi-carrier results (richest single source)."""
from __future__ import annotations
import logging, re
from datetime import date, datetime, timezone
from apix.scrapers.base import FareScraper, FareQuote
from apix.domain import Availability

logger = logging.getLogger(__name__)

CARRIER_NAMES = {
    "IndiGo": "6E", "Air India": "AI", "SpiceJet": "SG", "Akasa Air": "QP",
    "Vistara": "UK", "Air India Express": "IX", "GoAir": "G8",
    "AirAsia India": "I5", "Star Air": "S5", "Alliance Air": "9I",
}

class YatraScraper(FareScraper):
    SOURCE_SLUG = "yatra"
    CARRIER_CODES = ()  # multi-carrier OTA

    async def _scrape_route(self, origin: str, destination: str, travel_date: date, booking_window: int) -> list[FareQuote]:
        page = await self._context.new_page()
        try:
            date_str = travel_date.strftime("%d/%m/%Y")
            url = f"https://www.yatra.com/air-search?origin={origin}&destination={destination}&depart_date={date_str}&return_date=&flight_type=O&ADT=1&CHD=0&INF=0&class=Economy"
            await page.goto(url, timeout=self.timeout * 1000, wait_until="domcontentloaded")
            await page.wait_for_timeout(10000)

            flights = await page.query_selector_all('[class*="result-row"], [class*="flight-info"], .flight-list-item, [class*="flightItem"]')
            quotes = []
            now = datetime.now(timezone.utc).isoformat()

            for flight in flights:
                try:
                    text = await flight.inner_text()
                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    price = None
                    carrier_code = "XX"
                    flight_num = dep_time = arr_time = None

                    for line in lines:
                        for name, code in CARRIER_NAMES.items():
                            if name.lower() in line.lower():
                                carrier_code = code
                                break
                        m = re.search(r"([A-Z0-9]{2})[- ]?(\d{2,4})", line)
                        if m and not flight_num:
                            flight_num = f"{m.group(1)} {m.group(2)}"
                            if m.group(1) in ("6E", "AI", "SG", "QP", "UK", "IX"):
                                carrier_code = m.group(1)
                        clean = line.replace(",", "").replace("\u20b9", "").replace("INR", "").strip()
                        try:
                            val = float(clean)
                            if 500 <= val <= 50000 and (price is None or val < price):
                                price = val
                        except ValueError:
                            pass
                        tm = re.search(r"(\d{1,2}:\d{2})", line)
                        if tm:
                            if dep_time is None: dep_time = tm.group(1)
                            else: arr_time = tm.group(1)

                    if price and price >= 500:
                        quotes.append(FareQuote(
                            source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                            travel_date=travel_date.isoformat(), observed_at=now,
                            booking_window=booking_window, carrier_code=carrier_code,
                            flight_number=flight_num, departure_time=dep_time,
                            arrival_time=arr_time, total_fare=price, fare_class="economy",
                        ))
                except Exception as e:
                    logger.debug(f"Parse error: {e}")

            if not quotes:
                quotes.append(FareQuote(
                    source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                    travel_date=travel_date.isoformat(), observed_at=now,
                    booking_window=booking_window, carrier_code="XX",
                    availability=Availability.FETCH_FAILED.value,
                ))
            return quotes
        finally:
            await page.close()
