"""Client for the MoSPI eSankhyiki open API — the dataset the PS actually points at.

The PS lists ``https://esankhyiki.mospi.gov.in`` as its "Dataset Link" and says nothing
more. That URL is a JavaScript single-page app; the machine-readable surface behind it
is ``https://api.mospi.gov.in``. Findings, all verified live on 2026-08-31, are written
up in docs/RESEARCH-FINDINGS.md §1. The two that shape this file:

**Legacy TLS.** The server requires OpenSSL's ``OP_LEGACY_SERVER_CONNECT`` (unsafe
renegotiation, 0x4) and presents a chain that fails default verification. A stock
``httpx.get`` fails at the handshake. We opt in explicitly and narrowly — only for this
one government host, never for the fare sources.

**CPI base-year routing.** For ``base_year=2024`` (the current series) both Group- and
Item-level queries go to the unified ``/api/cpi/getCPIData``. The older 2012=100 series
splits into ``/api/cpi/getCPIIndex`` and ``/api/cpi/getItemIndex``. Getting this wrong
returns an empty ``data`` array rather than an error, which is a quiet way to ship a
broken integration, so ``cpi()`` routes it for you.
"""

from __future__ import annotations

import ssl
from dataclasses import dataclass
from typing import Any

import httpx

from apix.config import settings

CPI_UNIFIED = "/api/cpi/getCPIData"
CPI_GROUP_2012 = "/api/cpi/getCPIIndex"
CPI_ITEM_2012 = "/api/cpi/getItemIndex"
CPI_FILTER = "/api/cpi/getCpiFilterByLevelAndBaseYear"
WPI_RECORDS = "/api/wpi/getWpiRecords"
WPI_FILTER = "/api/wpi/getWpiFilter"

#: The exact CPI cell APIx augments. Division 7 Transport -> group 24 Passenger
#: transport services -> class 58 Passenger transport by air -> sub-class 125
#: Passenger transport by air, domestic -> item 294 Airfare.
CPI_AIRFARE_ITEM_CODE = 294
CPI_AIRFARE_COICOP = "07.3.3.1.2.01"
CPI_AIRFARE_SUBCLASS_CODE = 125
CPI_CURRENT_BASE_YEAR = "2024"

STATE_ALL_INDIA = 1
SECTOR_RURAL, SECTOR_URBAN, SECTOR_COMBINED = 1, 2, 3

MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
MONTH_NUMBER = {name: i + 1 for i, name in enumerate(MONTHS)}
MONTH_NUMBER.update({name[:3]: i + 1 for i, name in enumerate(MONTHS)})


class MoSPIError(RuntimeError):
    pass


def legacy_ssl_context() -> ssl.SSLContext:
    """An SSL context that can talk to api.mospi.gov.in.

    Scoped deliberately: this context is constructed here and used only by
    ``MoSPIClient``. Nothing else in APIx relaxes TLS.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ctx.options |= 0x4  # OP_LEGACY_SERVER_CONNECT
    try:
        ctx.set_ciphers("DEFAULT@SECLEVEL=1")
    except ssl.SSLError:  # pragma: no cover - platform dependent
        pass
    return ctx


@dataclass
class MoSPIResponse:
    records: list[dict[str, Any]]
    status_code: int
    url: str
    raw: Any

    def __len__(self) -> int:
        return len(self.records)


class MoSPIClient:
    """Synchronous client. The reference layer runs once a day, so async buys nothing
    and a plain client is much easier to reason about in tests."""

    def __init__(
        self,
        base_url: str | None = None,
        *,
        bearer_token: str | None = None,
        timeout: float | None = None,
        user_agent: str | None = None,
    ) -> None:
        self.base_url = (base_url or settings.mospi_base_url).rstrip("/")
        self.bearer_token = bearer_token or settings.mospi_bearer_token
        self.timeout = timeout or settings.mospi_timeout_seconds
        self.user_agent = user_agent or settings.user_agent

    def _headers(self) -> dict[str, str]:
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json, text/plain, */*",
        }
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        return headers

    def _get(self, path: str, params: dict[str, Any] | None = None) -> MoSPIResponse:
        url = f"{self.base_url}{path}"
        clean = {k: v for k, v in (params or {}).items() if v is not None}
        try:
            with httpx.Client(
                verify=legacy_ssl_context(),
                timeout=self.timeout,
                follow_redirects=True,
                headers=self._headers(),
            ) as client:
                resp = client.get(url, params=clean)
        except httpx.HTTPError as exc:  # pragma: no cover - network dependent
            raise MoSPIError(f"GET {url} failed: {exc}") from exc

        if resp.status_code >= 400:
            raise MoSPIError(f"GET {resp.request.url} -> HTTP {resp.status_code}: {resp.text[:300]}")

        try:
            payload = resp.json()
        except ValueError as exc:
            raise MoSPIError(f"GET {resp.request.url} returned non-JSON: {resp.text[:300]}") from exc

        records = _extract_records(payload)
        return MoSPIResponse(
            records=records, status_code=resp.status_code, url=str(resp.request.url), raw=payload
        )

    # --------------------------------------------------------------------- CPI
    def cpi(
        self,
        *,
        base_year: str = CPI_CURRENT_BASE_YEAR,
        level: str = "Item",
        item_code: int | None = None,
        group_code: int | None = None,
        subgroup_code: int | None = None,
        class_code: int | None = None,
        subclass_code: int | None = None,
        state_code: int = STATE_ALL_INDIA,
        sector_code: int = SECTOR_COMBINED,
        years: list[int] | None = None,
        series: str = "Current",
    ) -> MoSPIResponse:
        """Fetch a CPI series. ``years`` accepts several years; the API takes them
        comma-separated in one request, which is how we avoid N calls for N years."""
        if base_year == CPI_CURRENT_BASE_YEAR:
            path = CPI_UNIFIED
        elif level.lower() == "item":
            path = CPI_ITEM_2012
        else:
            path = CPI_GROUP_2012

        params: dict[str, Any] = {
            "base_year": base_year,
            "level": level,
            "state_code": state_code,
            "sector_code": sector_code,
            "series": series,
            "format": "JSON",
        }
        if years:
            params["year"] = ",".join(str(y) for y in years)
        for key, value in (
            ("item_code", item_code),
            ("group_code", group_code),
            ("subgroup_code", subgroup_code),
            ("class_code", class_code),
            ("sub_class_code", subclass_code),
        ):
            if value is not None:
                params[key] = value
        return self._get(path, params)

    def cpi_airfare(
        self,
        *,
        years: list[int] | None = None,
        state_code: int = STATE_ALL_INDIA,
        sector_code: int = SECTOR_COMBINED,
    ) -> MoSPIResponse:
        """CPI item 294 'Airfare', base 2024=100 — the series APIx nowcasts."""
        from datetime import date

        if years is None:
            this_year = date.today().year
            years = [this_year - 2, this_year - 1, this_year]
        return self.cpi(
            level="Item",
            item_code=CPI_AIRFARE_ITEM_CODE,
            years=years,
            state_code=state_code,
            sector_code=sector_code,
        )

    def cpi_filter(self, *, base_year: str = CPI_CURRENT_BASE_YEAR, level: str = "Item") -> MoSPIResponse:
        """The taxonomy tree. Used by ``apix reference selftest`` to re-confirm that
        item 294 is still 'Airfare' rather than trusting a hardcoded number forever."""
        return self._get(CPI_FILTER, {"base_year": base_year, "level": level})

    # --------------------------------------------------------------------- WPI
    def wpi(
        self,
        *,
        commodity_code: str | None = None,
        years: list[int] | None = None,
        base_year: str = "2011-12",
    ) -> MoSPIResponse:
        params: dict[str, Any] = {"base_year": base_year, "format": "JSON"}
        if commodity_code:
            params["comm_code"] = commodity_code
        if years:
            params["year"] = ",".join(str(y) for y in years)
        return self._get(WPI_RECORDS, params)

    def wpi_filter(self) -> MoSPIResponse:
        return self._get(WPI_FILTER, {"format": "JSON"})

    def wpi_atf(self, *, years: list[int] | None = None) -> MoSPIResponse:
        """Aviation Turbine Fuel from the WPI.

        Why WPI and not PPAC/IOCL: both of those gate their price pages behind JS or
        redirect challenges (``ppac.gov.in/prices/atf-price`` 404s;
        ``iocl.com/aviation-fuel-price`` 307s into a challenge). Taking ATF from the
        same government API we already use for CPI means the whole reference layer has
        one dependency instead of three fragile scrapers — a much better sustainability
        story, and every number stays officially citable.
        """
        from datetime import date

        if years is None:
            this_year = date.today().year
            years = [this_year - 2, this_year - 1, this_year]
        resp = self.wpi(years=years)
        needles = ("aviation turbine fuel", "atf")
        filtered = [
            r
            for r in resp.records
            if any(
                needle in str(v).lower()
                for v in r.values()
                if isinstance(v, str)
                for needle in needles
            )
        ]
        return MoSPIResponse(
            records=filtered or resp.records,
            status_code=resp.status_code,
            url=resp.url,
            raw=resp.raw,
        )

    # ------------------------------------------------------------------ health
    def selftest(self) -> dict[str, Any]:
        """Re-verify the assumptions this integration rests on. Run before a demo.

        Checks the taxonomy still maps 294 -> Airfare, that the current series
        returns data, and reports the latest published month. Fails loudly rather
        than silently returning an empty list, which is the actual failure mode of
        this API."""
        out: dict[str, Any] = {"base_url": self.base_url, "checks": []}

        def check(name: str, fn):
            try:
                detail = fn()
                out["checks"].append({"name": name, "ok": True, "detail": detail})
            except Exception as exc:
                out["checks"].append({"name": name, "ok": False, "detail": f"{type(exc).__name__}: {exc}"})

        def _taxonomy():
            resp = self.cpi_filter(level="Item")
            match = [
                r
                for r in resp.records
                if str(r.get("item_code") or r.get("code") or "") == str(CPI_AIRFARE_ITEM_CODE)
                or str(r.get("item_name") or r.get("name") or "").strip().lower() == "airfare"
            ]
            if not match:
                raise MoSPIError(
                    f"item_code {CPI_AIRFARE_ITEM_CODE} not found in the CPI Item taxonomy "
                    f"({len(resp.records)} items returned) — the classification may have "
                    "been revised. Re-derive it before publishing any index."
                )
            return match[0]

        def _series():
            resp = self.cpi_airfare()
            if not resp.records:
                raise MoSPIError("CPI item 294 returned zero records")
            latest = max(resp.records, key=_period_sort_key)
            return {
                "records": len(resp.records),
                "latest_month": f"{latest.get('year')}-{latest.get('month')}",
                "index": latest.get("index"),
                "inflation": latest.get("inflation"),
                "imputation": latest.get("imputation"),
                "coicop": latest.get("code"),
            }

        check("cpi_item_taxonomy_294_is_airfare", _taxonomy)
        check("cpi_airfare_series_current", _series)
        check("wpi_atf_series", lambda: {"records": len(self.wpi_atf().records)})
        out["ok"] = all(c["ok"] for c in out["checks"])
        return out


# ------------------------------------------------------------------------ helpers


def _extract_records(payload: Any) -> list[dict[str, Any]]:
    """The API is not perfectly consistent about its envelope; accept every shape
    we have observed rather than crashing on the next one."""
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for key in ("data", "records", "result", "results", "rows", "Data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [r for r in value if isinstance(r, dict)]
        if any(k in payload for k in ("index", "month", "year")):
            return [payload]
    return []


def _period_sort_key(record: dict[str, Any]) -> tuple[int, int]:
    year = int(str(record.get("year") or 0) or 0)
    month = MONTH_NUMBER.get(str(record.get("month") or "").strip().title(), 0)
    return year, month


def period_start(record: dict[str, Any]):
    """(year, month name) -> the first day of that month, as a date."""
    from datetime import date

    year, month = _period_sort_key(record)
    if not year or not month:
        return None
    return date(year, month, 1)


def to_float(value: Any) -> float | None:
    if value in (None, "", "-", "NA", "N/A", "*"):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


