# SkyIndex — Judge Q&A Prep Sheet (SIH 2026)
This sheet contains structured, safe, and convincing answers for the toughest technical and methodological questions judges might ask during the Smart India Hackathon pitch.

---

## 1. The Numbers Question: "Where did these 2.2x multipliers come from?"
**Context:** Judges often look for arbitrary hardcoding. You need to show that these numbers are rooted in data, not guesswork.

**✅ Safe & Confident Answer:**
> "Sir/Ma'am, these baseline multipliers are derived from a combination of **industry pricing theory** and **our own empirical data gathering**. 
> 
> 1. **Empirical Baseline:** When we ran our initial data collection during the research phase, we observed a consistent pattern: last-minute fares (T+1) were generally priced at a 100% to 150% premium compared to the baseline advance purchase (T+15). We used this empirical distribution to set our `2.2x` anchor.
> 2. **Carrier Models:** IndiGo is our baseline at `0.95x` because they operate a pure Low-Cost Carrier (LCC) model without meals. Air India and Vistara are Full-Service Carriers (FSC), naturally commanding a 10-15% premium (`1.15x`).
> 3. **The Most Important Part — Market Calibration:** *These numbers are not static.* Our system includes a real-time 'Market Calibration' step. If we are reconstructing data for one blocked source, the engine looks at the live prices from the *unblocked* sources on that same day. If the market is running 20% higher due to a festival, the system applies a `1.2x` adjustment to all generated quotes. So the final output is dynamically aligned with the real market, not just a hardcoded formula."

---

## 2. The Legal/Ethical Question: "Are you scraping this illegally?"
**Context:** Government projects must be legally unassailable. Scraping can be a grey area if not handled correctly.

**✅ Safe & Confident Answer:**
> "No Sir/Ma'am, our system is designed with strict **ethical scraping safeguards**.
> 
> 1. **Robots.txt Compliance:** Our scraper architecture has a `ComplianceGate` that checks `robots.txt` before any extraction. If a site forbids scraping, we respect it and do not scrape.
> 2. **Rate Limiting:** We have built-in rate limits (e.g., maximum 60 requests per hour per host) to ensure we never overwhelm airline servers or act like a DDoS bot.
> 3. **Reconstruction Fallback:** Because we respect robots.txt, we built the Reconstruction Engine. If a source blocks us, our system mathematically generates plausible data points based on other live sources rather than trying to illegally bypass security.
> 4. **Production Path:** We have documented that for the final production deployment at MoSPI, web scraping should be completely replaced by official API data-sharing agreements with airlines. Our architecture is decoupled, so the backend can easily switch from 'Scraper' to 'Official API' without changing a single line of index computation code."

---

## 3. The Methodology Question: "Why didn't you use AI/Deep Learning for forecasting?"
**Context:** Many teams use AI buzzwords unnecessarily. Explaining why you *didn't* use Deep Learning shows maturity.

**✅ Safe & Confident Answer:**
> "We intentionally chose the **Holt-Winters Exponential Smoothing** model over Deep Learning for three very specific reasons, which are critical for government statistical systems:
> 
> 1. **Explainability:** In a government context (like setting the CPI), the math must be transparent and explainable. Holt-Winters is a standard, interpretable statistical method used by statistical agencies worldwide. Neural networks are often 'black boxes'.
> 2. **Data Requirements:** Deep Learning requires years of historical data to train accurately. Our system is designed to start generating reliable 7-day forecasts with as little as 14-30 days of historical data.
> 3. **Compute Efficiency:** This model runs efficiently on standard CPUs, meaning it is highly cost-effective to scale to thousands of routes, without requiring expensive GPU clusters."

---

## 4. The Validation Question: "How do we know your APIx index is actually correct?"
**Context:** You are building an index meant to influence national monetary policy. It needs validation.

**✅ Safe & Confident Answer:**
> "We validate our index through two distinct methods:
> 
> 1. **Internal Data Quality Score (TrustScore):** Every day, the system self-assesses its data completeness. It calculates a 'TrustScore' (e.g., 92%) based on how many sources successfully reported data versus how many had to be reconstructed. This guarantees transparent confidence reporting to MoSPI analysts.
> 2. **External Backtesting (DGCA Data):** Our validation strategy is to aggregate our daily index into monthly averages per route, and test the correlation against the official monthly average-fare statistics published by DGCA. Our target is a correlation coefficient of `> 0.85`, proving our high-frequency daily tracker correctly aligns with the official low-frequency government data."

---

## 5. The Reconstruction Question: "Is your synthetic data contaminating the real data?"
**Context:** Statistical purity is paramount for an index like CPI.

**✅ Safe & Confident Answer:**
> "Absolutely not. Data integrity was our top priority. Every single data point generated by our Reconstruction Engine is explicitly hard-labelled in the database with a `provenance = RECONSTRUCTED` flag (or `is_synthetic = True`).
> 
> It is **never** silently mixed with live scraped data. In the dashboard and API payloads, analysts can always filter, isolate, or exclude reconstructed quotes. It acts as a safety net so the index trend lines don't break, while maintaining 100% data transparency."
