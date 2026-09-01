# APIx — Primary Research Findings

All findings below were **empirically verified by live HTTP request** on 2026-08-31 from a
residential Indian IP. Nothing here is assumed. Re-verify with `apix compliance refresh`
and `apix reference selftest` before the demo.

---

## 1. MoSPI eSankhyiki API — the dataset the PS points at

The PS gives `https://esankhyiki.mospi.gov.in` as the "Dataset Link" without saying what to
do with it. Here is what is actually there.

**Base URL:** `https://api.mospi.gov.in`
**Auth:** none required for the data endpoints (the WPI user manual describes a
`/api/users/usersignup` + `/api/users/login` bearer-token flow, but the data endpoints
answer unauthenticated as of 2026-08-31 — we support both paths).
**TLS quirk:** the server requires *legacy SSL renegotiation*
(`OP_LEGACY_SERVER_CONNECT`, `0x4`) and presents a chain that fails default verification.
Any client must opt in explicitly. See `apix/reference/mospi.py`.

### 1.1 The exact CPI cell we augment

| Level | Code | Name |
|---|---|---|
| Division | 7 | Transport |
| Group | 24 | Passenger transport services |
| Class | 58 | Passenger transport by air |
| Sub-class | 125 | Passenger transport by air, domestic |
| **Item** | **294** | **Airfare** |
| COICOP | `07.3.3.1.2.01` | |

Verified live call:

```
GET https://api.mospi.gov.in/api/cpi/getCPIData
      ?base_year=2024&level=Item&item_code=294
      &state_code=1&sector_code=3&year=2025,2026
      &series=Current&format=JSON
```

Verified response shape (abridged):

```json
{"data":[{"base_year":"2024","series":"Current","year":"2026","month":"July",
  "state":"All India","sector":"Combined","division":"Transport",
  "group":"Passenger transport services","class":"Passenger transport by air",
  "sub_class":"Passenger transport by air, domestic","item":"Airfare",
  "code":"07.3.3.1.2.01","index":"125.46","inflation":"22.94","imputation":"N"}]}
```

Observed monthly series, All-India / Combined, base 2024=100:

| Month | Index | YoY inflation |
|---|---|---|
| 2025-11 | *see live* | |
| 2025-12 | 124.23 | — |
| 2026-01 | 122.71 | 6.65 |
| 2026-02 | 122.43 | −7.01 |
| 2026-03 | 123.55 | 14.20 |
| 2026-04 | 123.27 | 11.11 |
| 2026-05 | 127.62 | 15.06 |
| 2026-06 | 126.09 | 10.14 |
| 2026-07 | 125.46 | 22.94 |

Note the `imputation` flag — **MoSPI itself marks imputed cells.** Our confidence-score
feature mirrors that vocabulary deliberately, so an NSO reader recognises it instantly.

### 1.2 Endpoint inventory (all verified to exist)

| Purpose | Endpoint |
|---|---|
| CPI, new series 2024=100 (unified) | `/api/cpi/getCPIData` |
| CPI group level, 2012=100 | `/api/cpi/getCPIIndex` |
| CPI item level, 2012=100 | `/api/cpi/getItemIndex` |
| CPI filter/metadata tree | `/api/cpi/getCpiFilterByLevelAndBaseYear?base_year=2024&level=Item` |
| WPI (gives us official ATF) | `/api/wpi/getWpiRecords` |
| WPI filter/metadata | `/api/wpi/getWpiFilter` |

`level` accepts `Group`, `SubGroup`, `Class`, `SubClass`, `Item`.
`state_code` 1 = All India, 2–37 = states/UTs. `sector_code` 1 = Rural, 2 = Urban,
3 = Combined. `series` = `Current` | `Back`.

### 1.3 What this unlocks

Three things nobody gets from a scraper alone:

1. **Validation against the actual target.** We don't just backtest against DGCA average
   fares — we backtest against the CPI series our output is meant to feed.
2. **Nowcast framing.** CPI Airfare for month *M* publishes around the 12th of *M+1*.
   Our APIx produces a daily estimate of that number ~40 days earlier. That is a
   *nowcast*, which is a word RBI economists use and care about.
3. **State-level extension.** `state_code` gives 37 series, so our origin-state-weighted
   APIx can be validated per state, not just All-India.

---

## 2. robots.txt compliance matrix — measured, not assumed

The PS requires compliance with "robots.txt and terms of service". We fetched and parsed
all 11 sources. **7 of 11 disallow the fare-search path.** This is the single most
important operational fact in the project and most teams will not check it.

| # | Source | Fare-search path | Governing rule | Verdict |
|---|---|---|---|---|
| 1 | Akasa Air | `/booking/*` | `User-Agent: *` with **no `Disallow`** | ✅ ALLOW |
| 2 | SpiceJet | `/booking/*` | `User-agent: *` → `Disallow:` (empty = allow all) | ✅ ALLOW |
| 3 | Air India | `/in/en/booking/*` | only `/bin/`, DAM images, `google-flight-booking.html` blocked | ✅ ALLOW |
| 4 | Yatra | `/flight-search` | `Allow: /`; only `/flights-india-vx/`, `/pwa/`, affiliate paths blocked | ✅ ALLOW |
| 5 | IndiGo | `/search.html` | `Disallow: /search.html`, `/booking/*`, `/book/*`, `/bookings/*` | ⛔ DENY |
| 6 | Air India Express | `/flight-availability` | `Disallow: /flight-availability` | ⛔ DENY |
| 7 | MakeMyTrip | `/flight/search` | `Disallow: /flight/search*`, `/flight/fis*`, `/air/*` | ⛔ DENY |
| 8 | EaseMyTrip | `/flight-search/listing` | `Disallow: /flight-search/listing*` | ⛔ DENY |
| 9 | Cleartrip | `/flights/search` | `Disallow: /flights/search*` (and `/m/` mirror) | ⛔ DENY |
| 10 | Ixigo | `/flights/search` | `Disallow: /flights/search`, `/api/`, `/m/` | ⛔ DENY |
| 11 | Goibibo | `/flights/...?mode=` | `Disallow: /flights/*?mode=*` — the search URL carries `mode` | ⛔ DENY |

Secondary observations worth a slide:

- **SpiceJet's robots.txt is malformed.** It carries `Disallow: https://www.spicejet.com/api/v1`
  — absolute URLs are not valid `Disallow` values under RFC 9309, which specifies
  path-relative patterns. A permissive parser ignores the line entirely. **We deliberately
  interpret it conservatively** and treat `/api/v1` as disallowed anyway, because
  intent is legible even when syntax is wrong. `apix/compliance/robots.py`
  documents this as `NONSTANDARD_ABSOLUTE_DISALLOW`.
- **IndiGo runs Akamai bot defence at the TLS layer.** `curl` (schannel) completes the
  handshake, is asked to renegotiate twice, then hangs until timeout with 0 bytes. Node's
  fetch succeeds. So IndiGo is doubly out of reach: disallowed *and* actively defended.
  We report this honestly rather than defeating it.
- **Air India explicitly names AI crawlers** — `GPTBot`, `ClaudeBot`, `PerplexityBot`,
  `Google-Extended`, `xAI-Bot` each get their own group. All are `Allow: *` with the same
  four exclusions. An operator who thought carefully about automated access.
- **MakeMyTrip's robots.txt contains a maintenance comment** explaining that a crawler
  reads only its single most-specific matching group and does not inherit `*`. They are
  right, and our parser implements exactly that (RFC 9309 §2.2.1). It is worth citing in
  the deck as evidence we read the spec, not just the file.

### 2.1 Consequence for the architecture

We ship **11 adapters** but the runtime is **compliance-gated**: an adapter physically
cannot issue a request unless the live robots.txt verdict for its target path is ALLOW.
Coverage for the 7 gated sources comes from two legitimate substitutes:

1. **Official aggregator APIs** — Amadeus Self-Service and Duffel both expose real,
   ToS-sanctioned flight-offer search with free sandbox/test tiers. These are the
   *production-correct* answer for a government system and we wire them as first-class
   adapters.
2. **Anchored reconstruction** — for gated carriers, a generative model calibrated on
   real published anchors (CPI item 294, DGCA TMU fare levels, ATF, DGCA seasonality)
   produces plausible fares that are **hard-labelled `RECONSTRUCTED` in the database, in
   the API payload, and on every chart**. Never mixed silently into a LIVE series.

---

## 3. DGCA — what is and is not publishable

| Artefact | Granularity | Latency | Machine-readable? |
|---|---|---|---|
| Monthly Domestic Traffic Report | airline-wise pax, load factor, OTP, complaints | ~3 weeks | PDF, semi-structured |
| Tariff Monitoring Unit (TMU) fare monitoring | **78 selected routes**, avg fare by booking bucket | monthly, released via Parliament replies / press | PDF / tabled answers |
| AAI Traffic News | **airport-wise** domestic pax + ATM | monthly | XLS/PDF annexures |
| Annual Review of Traffic | airport-wise, annual | annual | PDF |
| City-pair (O&D) passenger volumes | route-level | irregular | **not published as a routine feed** |

Two facts that matter enormously for the pitch:

1. **DGCA's Tariff Monitoring Unit already does this job by hand.** Reported publicly:
   the TMU "monitors airfares on selected 78 routes on a random basis **by using airlines
   websites** on a monthly basis." That is a government team manually opening airline
   websites. Our system is not a hypothetical improvement to an abstract process — it is
   the automation of a named, existing, manual unit inside the regulator. Put that on
   slide 2.
2. **City-pair volumes are not a routine open feed**, so DGCA-traffic-weighted routing
   cannot be a live API pull. We therefore ship `seed/route_weights.csv` where **every row
   carries its own `source_citation` and `source_url`**, plus a loader that recomputes
   weights from AAI airport-wise pax when a fresher annexure appears. Weights are
   versioned (`weight_vintage`) so any published index number is reproducible against the
   exact weight set used. This is how a real statistical agency handles it.

---

## 4. ATF (Aviation Turbine Fuel) — the correlation layer

PPAC and IOCL both gate their price pages behind JavaScript/redirect walls
(`ppac.gov.in/prices/atf-price` → 404; `iocl.com/aviation-fuel-price` → 307 to a JS
challenge). Rather than fight that, we take ATF from **the MoSPI WPI series via the same
authenticated-free API we already use** — official, versioned, and citable, with IOCL
city-wise retail price as an optional enrichment.

This keeps the whole reference layer on one government API surface, which is a much
stronger sustainability story than three fragile scrapers.

---

## 5. Environment facts (this machine, 2026-08-31)

| Thing | Status |
|---|---|
| Python | 3.13.12 ✅ |
| Node | v22.19.0 ✅ |
| npm | 10.9.3 ✅ |
| git | 2.51.0.windows.1 ✅ |
| Docker | binary present, **daemon not running** ⚠️ |
| Local Postgres | not installed ⚠️ |

Consequence: Postgres is the deployment target and all DDL is Postgres-first, but the
ORM layer uses `.with_variant()` so the full pipeline and test suite run on SQLite
without a server. Swap `APIX_DATABASE_URL` to the Supabase/Neon string and nothing else
changes.
