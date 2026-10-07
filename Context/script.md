# FareCurve — SIH Demo Video Script (FINAL v3 — Professional Tone)
### Problem Statement 26056 | MoSPI DIID | Team Starcy
### Total Duration: ~2:56 (leaves ~4 sec buffer)

> **Say clearly:** "Fare-Curve" (not "Fair Cove"). "T-plus-one to T-plus-forty-five" (not "P-plus").

---

## 0:00 – 0:28 | PROBLEM STATEMENT
**[SCREEN: PS title slide]**
> "Namaste. We are Team Starcy, and this is FareCurve — our solution for SIH Problem Statement 26056. India's CPI includes air fares, yet this data is still collected manually, even as over 90% of tickets are now booked online, with prices changing daily. FareCurve solves this — scraping fares from 5 airlines and 6 OTAs to build a real-time Airfare Price Index for NSO and RBI, enabling more accurate calculation of CPI, interest rates, and inflation."

## 0:28 – 0:47 | ARCHITECTURE
**[SCREEN: Architecture slide]**
> "Our system operates in 5 phases — Acquisition, Cleaning, Index Engine, Analytics, and API & Delivery — running three times daily. Each source is first checked against robots.txt. Where permitted, we scrape live fares. Where denied, our Reconstruction Engine estimates the fare using DGCA data, clearly labelled as reconstructed."

## 0:47 – 0:57 | HOME
**[SCREEN: Home page]**
> "This is our Home dashboard — today's APIx stands at 123.05, with 95% confidence, tracked across 22 routes and over 45,620 daily quotes."

## 0:57 – 1:03 | ROUTE EXPLORER
**[SCREEN: Route Explorer, DEL-BOM]**
> "Route Explorer displays APIx by route. For Delhi-Mumbai, that stands at 142.10, based on 426 observations."

## 1:03 – 1:17 | BOOKING CURVE — core USP
**[SCREEN: Booking Curve, DEL-BOM]**
> "This is our core differentiator — the Booking Curve. For Delhi-Mumbai, a last-minute fare costs ₹11,666, while booking 45 days in advance brings it down to just ₹4,075. This T+1 to T+45 curve is precisely what manual collection can never capture."

## 1:17 – 1:27 | SECTOR HEATMAP
**[SCREEN: Sector Heatmap]**
> "The Sector Heatmap plots every route on a live map, colour-coded by price band and weighted by DGCA traffic data. 15 routes are currently in surge."

## 1:27 – 1:35 | RAW FARES
**[SCREEN: Raw Fares, By Airline]**
> "Raw Fares decomposes every fare into base fare, tax, and convenience fee — across all airlines and OTAs, filterable by booking window."

## 1:35 – 1:45 | ATF IMPACT
**[SCREEN: ATF Impact page]**
> "This page overlays our index against ATF — Aviation Turbine Fuel prices — showing precisely how much of the fare increase is fuel-driven."

## 1:45 – 1:51 | FORECAST + ANOMALIES
**[SCREEN: Forecast, then quick cut to Anomalies]**
> "Our Forecast module predicts fares 7 days ahead with a Buy or Wait signal — helping government agencies time procurement and advisory decisions. Meanwhile, Anomaly Detection flags spikes only when multiple sources confirm them."

## 1:51 – 2:03 | COMPLIANCE — #1 differentiator
**[SCREEN: Compliance Matrix, scroll slowly]**
> "This is our strongest differentiator — the Compliance Dashboard. We audit all 12 sources — 6 airlines and 6 OTAs. Currently, 4 sources permit live scraping, while 8 deny it — and that's precisely where our Reconstruction Engine, described earlier, comes into play."

## 2:03 – 2:14 | DATA QUALITY
**[SCREEN: Data Quality Monitor]**
> "Data Quality tracks pipeline health over 30 days — 95% confidence, 100% coverage. We also back-test against DGCA's own reference fares, achieving a 0.77 correlation and 86% direction agreement."

## 2:14 – 2:28 | CONTEXTUAL AI — one-click insight, everywhere
**[SCREEN: Stay on Data Quality page, on the DGCA Back-Test Validation chart → click the AI icon → show it auto-generating a question about the correlation → show the redirect into FareCurve AI with the answer already loading]**
> "Every page — every graph, even this DGCA chart — includes a one-click AI icon that automatically generates the relevant question and opens the answer in chat, powered by Groq LLaMA 3. Analysts can also type their own questions at any time."

## 2:28 – 2:39 | API FOR NSO & RBI
**[SCREEN: API page — Compliance Matrix + Integration Guide]**
> "The complete index is also available as a REST API. NSO and RBI can retrieve daily APIx values and route-level breakdowns through simple GET requests, supported by ready-made Python and cURL integration guides."

## 2:39 – 2:56 | CLOSING
**[SCREEN: Closing slide]**
> "Three things set us apart. First, the complete price curve — from 45 days out to the last minute. Second, ethical, audited scraping. Third, validation against 30 days of real data. India's CPI asks one question about airfare. FareCurve asks it three times a day, in multiple ways. Thank you — Smart India Hackathon 2026."

---

## Timing Cheat Sheet
| Section | Duration |
|---|---|
| Problem Statement | 28s |
| Architecture | 19s |
| Home | 10s |
| Route Explorer | 6s |
| Booking Curve | 14s |
| Sector Heatmap | 10s |
| Raw Fares | 8s |
| ATF Impact | 10s |
| Forecast + Anomalies | 6s |
| Compliance | 12s |
| Data Quality | 11s |
| Contextual AI (one-click) | 14s |
| API | 11s |
| Closing | 17s |
| **Total** | **~2:56** |

## Why the Contextual AI Feature Matters (Judge's-Eye View)
This is one of your strongest "wow" moments — it directly addresses a real friction point for NSO/RBI analysts: **they don't need to know what question to ask.** One click on any graph or page auto-generates the relevant question and jumps straight to an answer. Placed right after Data Quality, on the same page, no navigation needed — it flows straight out of the correlation number you just mentioned, and pre-empts the exact question a judge might ask ("why 0.77 and not higher?").

## Final Pre-Recording Checklist
- [ ] Confirm on-screen numbers still match: APIx 123.05, Route Explorer 142.10, ₹11,666/₹4,075, 15 surge routes, 4/8 compliance split, 95%/100%, 0.77 correlation, 86% direction agreement
- [ ] Test the AI icon click-through on the DGCA Back-Test chart before recording — confirm it actually auto-generates a relevant question and loads a real answer, not a blank/error state
- [ ] Test Search, View Logs, and Export Data buttons
- [ ] Time this with a stopwatch at least 2-3 times
- [ ] If you go over 3:00 during rehearsal, "Forecast + Anomalies" is the one section that can be cut without losing anything core to the problem statement