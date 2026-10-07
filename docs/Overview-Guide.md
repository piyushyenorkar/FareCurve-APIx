# SIH26056 — Real-time Airfare Price Index (APIx)
## Full Implementation & MVP Build Guide

---

## 1. High-Level Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  SCRAPER JOBS    │────▶│   DATABASE (Postgres) │◀────│  BACKEND API     │
│  (GitHub Actions │     │   Supabase / Neon     │     │  FastAPI on      │
│   scheduled cron)│     │                       │     │  Render          │
└─────────────────┘     └──────────────────────┘     └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │  FRONTEND         │
                                                        │  Next.js on       │
                                                        │  Vercel            │
                                                        └──────────────────┘
```

**Core idea:** scraping and API-serving are two *separate* concerns, running on two different systems. This is the single most important architectural decision in this whole project — details on why, below.

---

## 2. Tech Stack — Final Recommendation

| Layer | Technology | Why |
|---|---|---|
| Scraper | Python + Playwright | Handles JS-rendered pages, faster & more modern than Selenium, has async support |
| Scraper scheduling | GitHub Actions (cron workflow) | Free, reliable, gives you visible run-logs to show judges as "proof of automation" — Render free tier sleeps, so an in-app scheduler is unreliable |
| Data cleaning | Python + pandas | Standard for this kind of tabular cleaning/outlier work |
| Database | PostgreSQL via **Supabase** or **Neon** (not Render's own Postgres) | Render's free Postgres **expires after 90 days** — bad for a project that needs to keep running through Grand Finale in December. Supabase/Neon free tiers don't have that expiry problem |
| Index computation | Python (pandas/numpy), scheduled job | Runs right after cleaning, in the same pipeline |
| Forecasting | `statsmodels` (Holt-Winters / exponential smoothing) or simple weighted moving average | Lightweight, explainable to judges — don't reach for deep learning here, it's overkill and harder to defend in Q&A |
| Backend API | FastAPI (Python) | Auto-generates Swagger/OpenAPI docs at `/docs` — huge plus for demo, literally shows "NSO/RBI can consume this" live |
| Backend hosting | Render (Web Service) | Fine for this — it's just serving data, not doing heavy scraping work |
| Frontend | Next.js (React) | Matches your Vercel plan, good SSR support for dashboards |
| Charts | Recharts or Plotly.js | Recharts is simpler to integrate in React; Plotly gives more advanced chart types (good for the booking-window curve) |
| Frontend hosting | Vercel | Your original plan — correct, no change needed |

---

## 3. Is Vercel + Render okay?

**Short answer: yes for frontend+API, but you need to add two more pieces.**

1. **Don't run the scraper inside your Render backend.** Headless-browser scraping (Playwright) is heavy — memory-hungry, slow, and blocks whatever else that process is doing. Render's free web services also go to sleep after inactivity, so an internal scheduler (like APScheduler) won't reliably fire on schedule. Instead: put the scraper + cleaning + index-computation scripts in a **separate GitHub Actions workflow** that runs on a cron schedule (e.g., 3 times a day) and writes straight to your Postgres database. This is free, doesn't sleep, and gives you a visible history of scrape runs in your repo's Actions tab — genuinely useful to show judges as proof the system runs autonomously.

2. **Don't use Render's built-in free Postgres.** It auto-deletes after 90 days on the free tier. Use **Supabase** (has a generous free tier, plus gives you instant REST access as a bonus) or **Neon** (serverless Postgres, also free-tier friendly, scales to zero when idle so it's cheap).

So your real stack becomes: **Vercel (frontend) + Render (API only) + GitHub Actions (scraper/scheduler) + Supabase/Neon (database)** — all free-tier, all reliable enough for a hackathon-through-Grand-Finale timeline.

---

## 4. Component-by-Component Implementation

### 4.1 Scraper Service — Step 1 Detailed

This confirms and expands everything discussed earlier, so nothing gets missed:

**Tooling:** Python + Playwright (`pip install playwright`, then `playwright install chromium`). Playwright opens a real (headless) browser, so it correctly handles JavaScript-rendered content that a simple `requests.get()` can't see.

**Handling JS-rendered pages:** Use Playwright's `page.wait_for_selector()` to wait until price elements actually appear in the DOM before reading them, instead of a fixed `sleep()` — more reliable and faster.

**Handling CAPTCHA — important, be realistic about this:**
- Do **not** try to build a CAPTCHA-solving/bypass mechanism — it's ethically grey territory and not something to put engineering effort into for a government-facing tool anyway.
- Instead, **design around it**: keep request rate low, reuse sessions/cookies instead of opening fresh sessions repeatedly, and use realistic browser fingerprints (Playwright's default headless context is often flagged — use `playwright-stealth` or a persistent browser context to look more like a real user).
- For your prototype, **pick 2–3 sources that don't trigger CAPTCHA under light, infrequent scraping** (test this early, in week one — don't discover this on demo day). For sources that do block you, that becomes a documented "Future Scope" item: *"at production scale, this would move to an official data-sharing API agreement with the airline/OTA rather than scraping — which is realistically how a government system would operate anyway."* This is honest engineering maturity, and judges respect it far more than a shaky bypass hack.

**IP rotation:** For your actual demo scale (a handful of routes, checked a few times a day), a single IP is very likely fine — you don't need to build real proxy-rotation infrastructure in 36 hours. Mention proxy pools as a "production scaling" line in your architecture slide, but don't burn hackathon time implementing it.

**What to scrape per page:** origin, destination, travel date, carrier name, flight number (if visible), fare class, base fare, taxes (if shown separately), total fare, availability status.

**Scheduling:** GitHub Actions workflow file (`.github/workflows/scrape.yml`) triggered on a cron schedule (e.g., `0 6,12,18 * * *` — 3x daily), running your Python scraper script, connecting to Supabase/Neon via connection string stored in GitHub Secrets.

---

### 4.2 Data Cleaning Pipeline — Step 2 Detailed

Runs as a Python/pandas job right after each scrape completes (can be the same GitHub Action, next step in the workflow).

1. **Deduplication** — drop exact duplicate rows (same source + route + travel_date + booking_window scraped twice)
2. **Outlier removal** — use IQR or z-score method: flag any price more than 3 standard deviations from that route's rolling mean as `is_outlier = true` (don't delete it — keep it, just mark it, so your anomaly-detection USP feature can use it later)
3. **Sold-out/cancelled handling** — if a page shows no price (sold out), store the row with `availability_status = 'sold_out'` and `total_fare = null` instead of skipping it silently — this is useful data too (shows demand pressure)
4. **Base fare vs tax separation** — where the source page shows a breakdown explicitly, extract it directly. Where it doesn't, store `total_fare` only and leave `base_fare`/`taxes` as null rather than guessing — don't fabricate numbers, be transparent about what you can and can't separate

---

### 4.3 Database Schema

```sql
-- Raw scraped data (before cleaning)
raw_fare_snapshots (
  id, source_name, source_type, origin, destination,
  travel_date, scrape_timestamp, booking_window,
  flight_number, fare_class, base_fare, taxes,
  convenience_fee, total_fare, availability_status,
  raw_payload JSONB
)

-- After cleaning
cleaned_fare_data (
  same fields as above + is_outlier BOOLEAN, outlier_reason TEXT
)

-- Route importance weights (from DGCA traffic data)
route_weights (
  origin, destination, dgca_passenger_traffic, weight
)

-- The actual index numbers
daily_index (
  date, route (nullable = overall), booking_window (nullable = aggregate),
  index_value, base_period_reference
)

-- Anomaly flags
anomalies (
  id, route, date, booking_window, flag_type ('surge'/'data_error'),
  z_score, description
)

-- Forecast outputs
forecasts (
  route, booking_window, forecast_date, predicted_price,
  confidence_interval_lower, confidence_interval_upper, model_used
)

-- Data-quality tracking (for your confidence-score USP)
data_quality_log (
  date, expected_data_points, actual_data_points,
  confidence_pct, notes
)
```

---

### 4.4 Index Computation — Step 3 Detailed

This is the part that makes it a real "index" and not just a price database.

1. **Get route weights**: DGCA publishes passenger-traffic data by route (check `esankhyiki.mospi.gov.in`, the dataset link given in the PS, and DGCA's own monthly/quarterly statistics pages — busier routes like DEL-BOM should carry more weight than smaller ones)
2. **Normalize weights** so they sum to 1 across your route basket
3. **Compute a weighted price relative** for each route (today's price ÷ base-period price), similar in spirit to how CPI itself is constructed (a Laspeyres-style weighted index)
4. **Aggregate** into a single daily APIx number, plus route-wise and booking-window-wise sub-indices for the dashboard

---

### 4.5 Extra USP Features — Implementation Notes

| Feature | How to build it (kept simple, explainable) |
|---|---|
| **Forecast** | Weighted moving average or `statsmodels` Holt-Winters exponential smoothing per route+booking-window. Don't use deep learning — harder to explain in Q&A, and moving-average is genuinely fine at this data scale |
| **Anomaly/surge detection** | Rule-based: rolling mean ± 2–3 std dev per route. If flagged price is corroborated by another independent source scraped same day → label `'surge'`; if only one source shows it and others disagree → label `'data_error'` |
| **Confidence score** | `(actual_data_points_collected / expected_data_points) × 100` per period, stored in `data_quality_log`, shown as a gauge on the dashboard |
| **Tax/fee transparency** | Direct from scraped breakdown where available (see 4.2) — display as a stacked bar per route |
| **ATF correlation** | Petroleum Planning & Analysis Cell (PPAC) publishes monthly ATF price data publicly — pull this monthly and overlay as a second line on your price-trend chart. This turns your index from "a number" into "an explained number," which is a strong visual for the PPT |

---

### 4.6 Backend API (FastAPI on Render)

Key endpoints:
```
GET /api/index/overall?frequency=daily|weekly|monthly
GET /api/index/route/{origin}/{destination}
GET /api/index/booking-curve/{origin}/{destination}
GET /api/forecast/{origin}/{destination}
GET /api/anomalies?from=&to=
GET /api/data-quality
GET /api/fares/raw   (for transparency/audit — filterable)
```
FastAPI auto-generates a Swagger UI at `/docs` — **show this live in your demo**, it's the clearest possible proof that "NSO/RBI can consume this via API" isn't just a PPT claim.

---

### 4.7 Frontend Dashboard (Next.js on Vercel)

Recommended pages:
1. **Overview** — headline APIx number, trend chart (daily/weekly/monthly toggle)
2. **Route Explorer** — pick a route, see the booking-window curve (X-axis: days before travel, Y-axis: price) — this is your #1 USP, make it the most visually polished chart in the whole dashboard
3. **Forecast view** — predicted price trend for the selected route
4. **Anomalies feed** — list of flagged surge events with plain-language explanation
5. **Data Quality panel** — confidence-score gauge, per-source completeness
6. **Live API docs** — embed/link to the FastAPI Swagger page

---

## 5. Build Order (MVP-First, Then Layer USPs)

Build in this order so you *always* have a working demo, even if you run out of time on the later stretch features:

1. **Core pipeline first**: scraper (2–3 sources) → cleaning → database → basic index number. Get this working end-to-end before touching anything else.
2. **Basic API + basic dashboard**: just the Overview page showing the real index trend, hooked to real data.
3. **Booking-window curve view** — your headline USP, build this next, not last.
4. **Ethical-scraping documentation** — write up your rate-limiting/robots.txt approach clearly (this is mostly a documentation task, cheap to do properly).
5. **Traffic-weighted index** — swap equal-weighting for DGCA-traffic weighting.
6. **Extra USPs in priority order**: confidence score → anomaly detection → forecast → tax breakdown → ATF correlation. If time runs out, stop here — you'll still have a strong, differentiated demo with the first 1–2 extras done well, which beats 5 extras done half-broken.

---

## 6. Validation — "How do we prove it actually works?"

1. **Backtest against DGCA data**: DGCA does publish average-airfare figures periodically (including in Parliament replies and monthly/quarterly stats) and route-level passenger-traffic data. Take your system's monthly-aggregated index for a route and compare the *trend direction and rough magnitude* against DGCA's published numbers — you're checking correlation, not exact match, since DGCA's methodology and yours differ.
2. **Pipeline correctness tests**: write a few basic unit tests — does the outlier-detector correctly flag a synthetic extreme value? Does the cleaning step correctly separate a known base-fare+tax example? This is cheap to do and genuinely useful if a judge asks "how do you know your cleaning logic is correct."
3. **Confidence score as self-validation**: your own data-quality metric doubles as an honest signal — if a demo day shows 92% confidence, that's a believable, defensible number, more convincing than claiming perfection.
4. **API contract check**: confirm your endpoints return consistent, correctly-typed JSON — small thing, but broken API responses during a live demo are an easy way to lose points.

---

## 7. Demo Day Strategy (Being Honest About 36-Hour Limits)

You will **not** realistically have 11 live sources fully scraping in a hackathon window — and you don't need to. Be upfront in your architecture slide:
- 2–3 sources: **fully live**, real scraped data, real pipeline, real index
- Remaining sources: **plugin-ready architecture** — show the same scraper interface/class structure would extend to them, but demo with realistic seed/historical data clearly labeled as such

Judges care far more about *architectural soundness and a real working slice* than a fragile system faking all 11 sources. Transparency here is a strength, not a weakness — it directly reinforces your "ethical, sustainable, production-minded" positioning from the USP.

---

## 8. Quick Checklist Before You Start Coding

- [ ] Repo set up with `/scraper`, `/backend`, `/frontend` folders
- [ ] Supabase or Neon Postgres instance created, connection string in `.env` / GitHub Secrets
- [ ] Test-scrape 1 source manually first — confirm it doesn't hit CAPTCHA under light load, *before* committing to it
- [ ] Database schema created (Section 4.3)
- [ ] GitHub Actions cron workflow scaffolded and tested (even with a dummy script first)
- [ ] FastAPI skeleton deployed to Render, confirm `/docs` loads
- [ ] Next.js skeleton deployed to Vercel, confirm it can hit the Render API




but in this there are many things which is not mentioned in detailed in Overview-Guide.md i want you to go through detailed of every features of the integration be specific of every details
which website we are going to scrap where data should come and all everything it is not mentioned so thats why i want you to be research on more detail as you have @SIH-PS-26056.md & Context-of-PS.md file to see for reference so see that and go it for more details through it if anything you want from me or any access you want ask me like connecting databases envs and the hosting deploying anything whatever i can help that you cant do by your own ask me, plan the detailed execution guide to execute this project properly for getting shorlisted and win without missing any of the above mentioned details from the @SIH-PS-26056.md & Context-of-PS.md file and importantly make sure the code is also written for every feature of the project properly
also make sure the project will be scalable and sustainable in future
and also assure that project should be perfect and every features and USP working correctly as it is in files mentioned 
think build think build and make the marvelous project 