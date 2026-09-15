# FareCurve — SIH Demo Video Script
### Problem Statement 26056 | MoSPI DIID | Team Starcy
### Total Duration: ~3 minutes 30 seconds

---

> [!IMPORTANT]
> **Recording Tips Before You Start:**
> - Use **OBS Studio** or **Windows Game Bar** (Win+G) to record.
> - Resolution: **1920×1080** at 30 fps minimum.
> - Record your **screen + voice** (use a headset mic for clear audio).
> - Close all unnecessary tabs, notifications, and taskbar popups.
> - Have **two browser tabs** ready: Dashboard (localhost:3000 or Vercel URL) and Swagger Docs (localhost:8000/docs or Render URL).
> - Have **one terminal** open with the pipeline command ready to run.
> - Speak slowly, clearly, and confidently. Pause 1 second between sections.
> - Practice the full script 2–3 times before the final recording.

---

## SECTION 1 — PROBLEM STATEMENT (0:00 – 0:40)

**[SCREEN: Show the SIH PS page or a clean slide with the PS title]**

> *"Namaste! We are Team Starcy, and this is FareCurve — our solution for Smart India Hackathon Problem Statement 26056, given by the Ministry of Statistics and Programme Implementation."*

> *"So what is the problem? India's Consumer Price Index — the CPI — is the number the Reserve Bank of India uses to measure inflation and set interest rates. Inside the CPI, there is a sub-group for Transport and Communication, which includes domestic air travel fares."*

> *"But here is the issue — right now, these airfare prices are collected manually, by government staff visiting a few ticketing offices. In 2026, over 90 percent of domestic air tickets are sold online. And airline pricing is dynamic — the same Delhi to Mumbai flight can cost ₹4,000 if you book 45 days early, or ₹12,000 if you book the night before. Manual collection completely misses this reality."*

> *"MoSPI wants us to build an automated system that scrapes airfares from 5 airlines and 6 OTAs, cleans the data, computes a Real-time Airfare Price Index, and provides a dashboard and API that the NSO and RBI can directly consume. That is exactly what we built."*

---

## SECTION 2 — ARCHITECTURE OVERVIEW (0:40 – 1:10)

**[SCREEN: Switch to the Technical Architecture slide (technicalapproachslide.html) or show it as an image]**

> *"Our system runs in 5 phases. Let me walk you through each one quickly."*

> *"Phase 1 — Data Acquisition. A cron job triggers 3 times a day. For each of the 11 sources, our system first checks the website's robots.txt file. If scraping is allowed, we use Playwright — a headless browser — to scrape live fares. If it is denied, we use our Reconstruction Engine, which generates statistically calibrated estimates anchored on published DGCA fare data. Every reconstructed fare is clearly labelled — it is never mixed silently with real data."*

> *"Phase 2 — Data Cleaning. We remove duplicates, flag outliers using modified Z-scores, and decompose each fare into base fare, taxes, and convenience fees."*

> *"Phase 3 — Index Engine. We compute the APIx using the Laspeyres formula — the same formula family used by the actual CPI — with route weights from DGCA passenger traffic data."*

> *"Phase 4 — Analytics. Price trends, lead-time elasticity, sector heatmaps, anomaly detection, and forecasting."*

> *"Phase 5 — API and Dashboard. Everything is served through a FastAPI REST API with auto-generated Swagger documentation, and visualized on a 12-page Next.js dashboard. Let me show you."*

---

## SECTION 3 — LIVE DASHBOARD WALKTHROUGH (1:10 – 2:50)

### 3A — Home Page (1:10 – 1:25)

**[SCREEN: Open Dashboard → Home Page (localhost:3000)]**

> *"This is our home page. At the top you can see today's APIx value — our real-time airfare price index. Below it is the daily trend chart showing how the index moves over time. The confidence score tells you what percentage of the expected data points were actually collected — so consumers always know how reliable today's number is."*

---

### 3B — Raw Fares Page (1:25 – 1:45)

**[SCREEN: Click on "Raw Fares" in the sidebar]**

> *"This is the Raw Fares page. Here you can select any route — let me pick Delhi to Mumbai — and instantly see how fares compare across different airlines and OTAs."*

**[SCREEN: Click on DEL-BOM quick-select button, then toggle "By Airline" / "By OTA"]**

> *"Notice the stacked bar chart — it breaks down each fare into Base Fare, Taxes, and Convenience Fees. You can toggle between viewing by Airline or by OTA. You can also filter by booking window — T+1, T+7, T+15, T+30 — to see how the price changes based on when you book. This is the lead-time elasticity data that manual CPI collection completely misses."*

---

### 3C — Booking Curve Page (1:45 – 1:55)

**[SCREEN: Click on "Booking Curve" in the sidebar]**

> *"This is the Booking Curve page — our lead-time elasticity visualisation. It shows how fares change from T+45 all the way down to T+1 for any selected route. You can clearly see that last-minute fares are 2 to 3 times higher than advance bookings. This curve is the core information gap that the problem statement identifies."*

---

### 3D — Sector Heatmap (1:55 – 2:05)

**[SCREEN: Click on "Sector Heatmap" in the sidebar]**

> *"This is our Sector Heatmap. It plots all routes on an India map. The colour shows price intensity — green means below average, red means above average. Line styles indicate DGCA traffic volume — solid for high traffic routes like Delhi-Mumbai, dashed for medium, and dotted for low traffic routes. This gives policymakers a geographical view of pricing patterns across the country."*

---

### 3E — Forecast Page (2:05 – 2:15)

**[SCREEN: Click on "Forecasts" in the sidebar, select a route]**

> *"Our forecasting engine uses Holt-Winters exponential smoothing to predict fares 7 days ahead. It also generates an automated Buy Now, Wait, or Neutral signal — helping analysts understand where prices are heading."*

---

### 3F — Anomalies Page (2:15 – 2:22)

**[SCREEN: Click on "Anomalies" in the sidebar]**

> *"The Anomaly Detection page classifies unusual fare spikes. If two or more sources confirm the surge, it is marked as a Genuine Surge — likely a festival or demand event. If only one source shows it, it is flagged as a Data Error. This cross-source corroboration ensures data quality."*

---

### 3G — Compliance Page (2:22 – 2:32)

**[SCREEN: Click on "Compliance" in the sidebar]**

> *"This is our Compliance Dashboard — and this is one of our biggest USPs. It shows the full robots.txt audit for all 11 sources. Out of 11 sources named in the problem statement, 7 explicitly block scraping in their robots.txt. We respect every single rule. For each denied source, we show the exact robots.txt line that blocked us. The reconstruction engine fills the gap transparently."*

---

### 3H — Data Quality Page (2:32 – 2:38)

**[SCREEN: Click on "Data Quality" in the sidebar]**

> *"The Data Quality page shows daily pipeline health — how many observations were live versus reconstructed, the coverage percentage, and confidence score history. As the problem statement requires, we have over 30 days of back-tested results validated against published DGCA monthly average-fare data, using Pearson correlation and direction agreement metrics. Full transparency for auditors."*

---

### 3I — FareCurve AI (2:38 – 2:50)

**[SCREEN: Click on "FareCurve AI" in the sidebar, type a question]**

> *"Finally, FareCurve AI — powered by Groq and LLaMA 3, an open-source model. Policy analysts can ask questions in plain English."*

**[SCREEN: Type "How does T+1 vs T+30 impact base fares on DEL-BOM?" and show the response streaming in]**

> *"It responds in under 2 seconds. For a government deployment, this model can be hosted entirely on Indian servers with no data leaving the country."*

---

## SECTION 4 — API FOR NSO & RBI (2:50 – 3:05)

**[SCREEN: Switch to the Swagger Docs tab (localhost:8000/docs)]**

> *"The entire system is also available as a REST API. This is the auto-generated Swagger documentation. NSO and RBI can consume the index programmatically — daily APIx values, route-level breakdowns, fare forecasts, anomaly alerts — all available as simple GET requests returning clean JSON. No dashboard needed — they can plug this directly into their CPI computation pipeline."*

**[SCREEN: Click on GET /api/v1/index/overall, hit "Try it out" → "Execute", show the JSON response]**

---

## SECTION 5 — CLOSING & USPs (3:05 – 3:30)

**[SCREEN: Switch back to the Architecture slide or a closing slide]**

> *"To summarise — FareCurve gives India a real-time airfare price index that can directly augment the CPI. Three things make us different:"*

> *"First — Ethical Compliance. Our system checks robots.txt for every source, documents every access decision, and never violates a single rule."*

> *"Second — Lead-Time Elasticity. We capture fares across 5 advance-purchase windows — from T+1 to T+45 — the full pricing curve that no manual method can capture."*

> *"Third — Full Provenance. Every single data point carries its source, its method, and its quality flag. An auditor can trace any number in our index back to the exact timestamp and source that produced it."*

> *"Our REST API is production-ready for NSO and RBI to consume. Thank you."*

---

## Screen Recording Checklist

Use this checklist to prepare before hitting record:

- [ ] Dashboard running on Vercel URL or localhost:3000
- [ ] Backend running on Render URL or localhost:8000
- [ ] Data loaded and charts are showing (not empty)
- [ ] Architecture slide open in a separate tab
- [ ] Swagger Docs (localhost:8000/docs) open in a separate tab
- [ ] FareCurve AI tested — make sure Groq key is working
- [ ] Headset mic connected and tested
- [ ] Notifications off (Do Not Disturb mode on Windows)
- [ ] Browser zoom at 100%, no bookmarks bar, clean look
- [ ] Practice the full script at least 2 times before recording
- [ ] Total time target: **3 minutes 20 seconds to 3 minutes 40 seconds**

---

## Page Navigation Order (Exact Sequence)

| # | Page | URL Path | Time |
|---|------|----------|------|
| 1 | Architecture Slide | technicalapproachslide.html | 0:40 |
| 2 | Home | `/` | 1:10 |
| 3 | Raw Fares | `/fares` | 1:25 |
| 4 | Booking Curve | `/booking-curve` | 1:45 |
| 5 | Sector Heatmap | `/heatmap` | 1:55 |
| 6 | Forecasts | `/forecast` | 2:05 |
| 7 | Anomalies | `/anomalies` | 2:15 |
| 8 | Compliance | `/compliance` | 2:22 |
| 9 | Data Quality | `/quality` | 2:32 |
| 10 | FareCurve AI | `/ai` | 2:38 |
| 11 | Swagger Docs | `localhost:8000/docs` | 2:50 |
| 12 | Closing Slide | — | 3:05 |

---

> [!TIP]
> **Pro Tips for Maximum Judge Impact:**
> - When showing the Raw Fares page, **click the filter buttons live** — don't just talk about them. Judges want to see interactivity.
> - When showing FareCurve AI, **type the question live on camera** so judges see it is real-time, not pre-recorded.
> - On the Compliance page, **scroll slowly** so judges can read the ALLOW/DENY column — this is your biggest differentiator.
> - On Swagger Docs, **actually execute one API call** — show the real JSON response. This proves the API is live and functional.
> - Speak at a **slightly slower pace** than normal conversation — judges are processing visuals and audio simultaneously.
