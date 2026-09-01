"""Akasa Air scraper. robots.txt: ALLOW (no Disallow at all)."""
from __future__ import annotations
import logging
from datetime import date, datetime, timezone
from apix.scrapers.base import FareScraper, FareQuote
from apix.domain import Availability

logger = logging.getLogger(__name__)

CITY_MAP = {
    "DEL": "New Delhi", "BOM": "Mumbai", "BLR": "Bengaluru",
    "HYD": "Hyderabad", "CCU": "Kolkata", "MAA": "Chennai",
    "GOI": "Goa", "PNQ": "Pune", "AMD": "Ahmedabad",
    "LKO": "Lucknow", "JAI": "Jaipur", "PAT": "Patna",
    "GAU": "Guwahati", "COK": "Kochi", "SXR": "Srinagar",
    "IXC": "Chandigarh",
}

class AkasaScraper(FareScraper):
    SOURCE_SLUG = "akasa"
    CARRIER_CODES = ("QP",)

    async def _scrape_route(self, origin: str, destination: str, travel_date: date, booking_window: int) -> list[FareQuote]:
        page = await self._context.new_page()
        try:
            url = f"https://www.akasaair.com/booking/flight-select?origin={origin}&destination={destination}&date={travel_date.strftime('%d-%m-%Y')}&adults=1&children=0&infants=0&tripType=O&class=Economy"
            await page.goto(url, timeout=self.timeout * 1000, wait_until="networkidle")
            await page.wait_for_timeout(5000)

            flights = await page.query_selector_all('[data-testid*="flight-card"], .flight-card, .flight-row, [class*="flightCard"], [class*="flight-item"]')
            if not flights:
                flights = await page.query_selector_all('.fare-card, .search-result, [class*="result"]')

            quotes = []
            now = datetime.now(timezone.utc).isoformat()
            for flight in flights:
                try:
                    text = await flight.inner_text()
                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    price = None
                    flight_num = None
                    dep_time = None
                    arr_time = None
                    for line in lines:
                        if "QP" in line and any(c.isdigit() for c in line):
                            flight_num = line.strip()
                        clean = line.replace(",", "").replace("\u20b9", "").replace("INR", "").strip()
                        try:
                            val = float(clean)
                            if 500 <= val <= 50000:
                                if price is None or val < price:
                                    price = val
                        except ValueError:
                            pass
                        import re
                        time_match = re.search(r"(\d{1,2}:\d{2})", line)
                        if time_match:
                            if dep_time is None:
                                dep_time = time_match.group(1)
                            else:
                                arr_time = time_match.group(1)

                    if price and price >= 500:
                        quotes.append(FareQuote(
                            source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                            travel_date=travel_date.isoformat(), observed_at=now,
                            booking_window=booking_window, carrier_code="QP",
                            flight_number=flight_num, departure_time=dep_time,
                            arrival_time=arr_time, total_fare=price,
                            fare_class="economy",
                        ))
                except Exception as e:
                    logger.debug(f"Failed to parse flight card: {e}")

            if not quotes:
                quotes.append(FareQuote(
                    source_slug=self.SOURCE_SLUG, origin=origin, destination=destination,
                    travel_date=travel_date.isoformat(), observed_at=now,
                    booking_window=booking_window, carrier_code="QP",
                    availability=Availability.FETCH_FAILED.value,
                ))
            return quotes
        finally:
            await page.close()
