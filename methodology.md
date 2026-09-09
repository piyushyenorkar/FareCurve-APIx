# SkyIndex — Complete Methodology & System Architecture
### Real-time Airfare Price Index (APIx) for CPI Augmentation
**SIH Problem Statement 26056 | MoSPI — Data Informatics & Innovation Division (DIID)**

---

## 1. Problem Definition & Motivation

India's Consumer Price Index (CPI), published by NSO under MoSPI, is the primary inflation measure used by RBI for monetary policy. The **"Transport & Communication"** sub-group currently collects airfare data through **manual price-collection from a limited set of outlets** — a method that fundamentally cannot capture dynamic pricing, where the same route can vary **200–400%** depending on advance-booking window, day-of-week, and demand surges.

> [!IMPORTANT]
> **The core gap:** Manual collection captures a single price at a single point in time. It structurally misses the entire **lead-time elasticity curve** — the pattern of how prices change as the booking date approaches the travel date. This means RBI is setting monetary policy on structurally incomplete inflation data for air travel.

---

## 2. Proposed Solution — SkyIndex Platform

SkyIndex is an end-to-end automated platform that:
1. **Scrapes** live airfares daily from Indian airline websites and OTAs
2. **Cleans & normalises** the collected price quotes
3. **Computes** a Real-time Airfare Price Index (APIx) at daily, weekly, and monthly frequencies
4. **Forecasts** future price trends with explainable statistical models
5. **Exposes** a consumable REST API for NSO/RBI integration
6. **Visualises** everything on an interactive analytical dashboard

---

## 3. End-to-End Architecture

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        A1["✈️ Airlines<br/>IndiGo · Air India<br/>AI Express · Akasa<br/>SpiceJet"]
        A2["🌐 OTAs<br/>MakeMyTrip · Ixigo<br/>Cleartrip · Goibibo<br/>EaseMyTrip · Yatra"]
        A3["📊 Government<br/>DGCA Traffic Data<br/>PPAC ATF Prices<br/>MoSPI CPI Baskets"]
    end

    subgraph Pipeline["Automated Pipeline — GitHub Actions (Cron)"]
        B1["🤖 Multi-Source<br/>Scraper Engine<br/>(Playwright)"]
        B2["🧹 Data Cleaning<br/>& Normalisation<br/>(pandas)"]
        B3["📐 Index<br/>Computation<br/>(APIx Engine)"]
        B4["🔮 Forecasting<br/>& Anomaly<br/>Detection"]
    end

    subgraph Storage["PostgreSQL — Supabase"]
        C1[("raw_fare_snapshots<br/>cleaned_fare_data<br/>daily_index<br/>anomalies<br/>forecasts<br/>data_quality_log")]
    end

    subgraph API["Backend API — FastAPI on Render"]
        D1["REST Endpoints<br/>/api/index · /api/forecast<br/>/api/anomalies · /api/fares<br/>/api/quality · /docs"]
    end

    subgraph Dashboard["Frontend — Next.js on Vercel"]
        E1["📈 Overview<br/>📍 Route Explorer<br/>📉 Booking Curve<br/>🔮 Forecasts<br/>⚠️ Anomalies<br/>✅ Data Quality<br/>⛽ ATF Impact"]
    end

    subgraph Consumers["End Consumers"]
        F1["🏛️ NSO / MoSPI<br/>CPI Integration"]
        F2["🏦 RBI<br/>Monetary Policy"]
        F3["📊 Researchers<br/>& Analysts"]
    end

    A1 & A2 --> B1
    A3 --> B3
    B1 --> B2 --> B3 --> B4
    B1 & B2 & B3 & B4 --> C1
    C1 --> D1
    D1 --> E1
    D1 --> F1 & F2 & F3
```

---

## 4. Detailed Data Flow Pipeline

```mermaid
flowchart TB
    subgraph PHASE1["PHASE 1 — Data Acquisition"]
        S1["Scheduled Trigger<br/>(GitHub Actions Cron<br/>3× daily: 06:00, 12:00, 18:00 IST)"]
        S2["Plugin-Based Scraper Engine<br/>• 1 module per source<br/>• Common BaseScraper interface<br/>• Playwright headless browser"]
        S3["Multi-Source Extraction<br/>5 Airlines + 6 OTAs<br/>6 Routes × 5 Booking Windows<br/>= 150 fare queries per run"]
        S1 --> S2 --> S3
    end

    subgraph PHASE2["PHASE 2 — Data Cleaning"]
        C1["Deduplication<br/>(same source + route +<br/>date + window)"]
        C2["Outlier Detection<br/>(IQR / Z-Score ±3σ<br/>from rolling mean)"]
        C3["Fare Decomposition<br/>(Base Fare ÷ Taxes ÷<br/>Convenience Fee)"]
        C4["Availability Handling<br/>(sold_out / cancelled<br/>→ stored, not dropped)"]
        C1 --> C2 --> C3 --> C4
    end

    subgraph PHASE3["PHASE 3 — Index Construction"]
        I1["Route Weight Assignment<br/>(DGCA Passenger Traffic<br/>normalised to Σ=1)"]
        I2["Price Relative Computation<br/>P_today ÷ P_base_period<br/>(Laspeyres-style)"]
        I3["Weighted Aggregation<br/>APIx = Σ(w_i × PR_i) × 100<br/>Daily / Weekly / Monthly"]
        I1 --> I2 --> I3
    end

    subgraph PHASE4["PHASE 4 — Analytics & Forecasting"]
        F1["Holt-Winters<br/>Exponential Smoothing<br/>(per route + window)"]
        F2["Anomaly Detection<br/>Rolling μ ± 2.5σ<br/>Cross-source verification"]
        F3["Buy/Wait Signal<br/>Forecast trend analysis<br/>with confidence bands"]
        F1 & F2 & F3
    end

    PHASE1 --> PHASE2 --> PHASE3 --> PHASE4

    PHASE4 --> DB[("PostgreSQL<br/>Supabase")]
    DB --> API["FastAPI<br/>REST API"]
    API --> DASH["Next.js<br/>Dashboard"]
```

---

## 5. Route Basket & Booking Windows

### 5.1 Representative City-Pairs (DGCA Traffic-Weighted)

| Route | City Pair | DGCA Annual Pax (M) | Normalised Weight |
|-------|-----------|---------------------|-------------------|
| DEL-BOM | Delhi → Mumbai | 10.2M | 0.22 |
| DEL-BLR | Delhi → Bengaluru | 7.8M | 0.17 |
| BOM-BLR | Mumbai → Bengaluru | 5.1M | 0.11 |
| DEL-CCU | Delhi → Kolkata | 5.5M | 0.12 |
| BLR-HYD | Bengaluru → Hyderabad | 4.8M | 0.10 |
| MAA-DEL | Chennai → Delhi | 4.3M | 0.09 |
| DEL-HYD | Delhi → Hyderabad | 4.6M | 0.10 |
| BOM-CCU | Mumbai → Kolkata | 4.0M | 0.09 |

### 5.2 Advance-Purchase Windows

| Window | Meaning | Why It Matters |
|--------|---------|----------------|
| **T+1** | 1 day before travel | Last-minute premium — peak dynamic pricing |
| **T+7** | 7 days before | Short-term booking — moderate premium |
| **T+15** | 15 days before | Standard advance booking |
| **T+30** | 30 days before | Early booking — typically lower fares |
| **T+45** | 45 days before | Maximum advance — baseline price level |

> This 5-window structure captures the **complete lead-time elasticity curve** per route — the single most important innovation over manual CPI collection.

---

## 6. Scraper Architecture (Plugin System)

```mermaid
classDiagram
    class BaseScraper {
        <<abstract>>
        +name: str
        +source_type: str
        +scrape(origin, dest, travel_date) FareResult[]
        +check_robots_txt() bool
        +rate_limit() void
    }
    
    class IndiGoScraper {
        +name = "IndiGo"
        +source_type = "airline"
        +scrape()
    }
    
    class AirIndiaScraper {
        +name = "Air India"
        +source_type = "airline"
        +scrape()
    }
    
    class MakeMyTripScraper {
        +name = "MakeMyTrip"
        +source_type = "ota"
        +scrape()
    }
    
    class CleartripScraper {
        +name = "Cleartrip"
        +source_type = "ota"
        +scrape()
    }
    
    class ReconstructionEngine {
        +name = "Reconstruction"
        +source_type = "reconstructed"
        +reconstruct_from_patterns()
    }

    BaseScraper <|-- IndiGoScraper
    BaseScraper <|-- AirIndiaScraper
    BaseScraper <|-- MakeMyTripScraper
    BaseScraper <|-- CleartripScraper
    BaseScraper <|-- ReconstructionEngine

    class ComplianceGate {
        +check_robots_txt(url)
        +enforce_rate_limit(host)
        +log_request(host, status)
    }

    BaseScraper --> ComplianceGate : respects
```

### Ethical Scraping Safeguards

| Safeguard | Implementation |
|-----------|---------------|
| **robots.txt compliance** | `ComplianceGate` fetches and caches robots.txt per domain; scraper skips disallowed paths |
| **Rate limiting** | Max 60 requests/host/hour; configurable crawl delay (default 5s between requests) |
| **Session management** | Persistent browser contexts with realistic fingerprints to reduce redundant sessions |
| **Transparent fallback** | Sources blocked by CAPTCHA/anti-bot → clearly flagged `is_synthetic = true` in database |
| **Production path** | Documented recommendation: official MoSPI data-sharing API agreements with airlines for production deployment |

---

## 7. Index Construction Methodology (APIx)

### 7.1 Mathematical Foundation

The APIx follows a **modified Laspeyres price-relative index**, the same family of methodology used by CPI itself:

```
APIx(t) = Σᵢ [ wᵢ × (Pᵢ(t) / Pᵢ(0)) ] × 100
```

Where:
- `wᵢ` = DGCA traffic-weighted importance of route `i` (normalised: Σwᵢ = 1)
- `Pᵢ(t)` = cleaned average fare for route `i` on date `t`
- `Pᵢ(0)` = base-period average fare (reference month, e.g., June 2026)
- `100` = base index value

### 7.2 Sub-Indices Computed

| Index Level | Granularity | Use Case |
|-------------|------------|----------|
| **Overall APIx** | Single national number | Direct CPI augmentation |
| **Route-wise APIx** | Per city-pair | Sector-level inflation analysis |
| **Window-wise APIx** | Per booking window (T+1…T+45) | Lead-time elasticity measurement |
| **Route × Window** | Most granular | Full dynamic pricing surface |

### 7.3 Temporal Aggregation

| Frequency | Method | Output |
|-----------|--------|--------|
| **Daily** | Weighted mean of all fares collected that day | Real-time tracking |
| **Weekly** | 7-day rolling average of daily indices | Smoothed trend |
| **Monthly** | Calendar-month average of daily indices | CPI-compatible output for NSO |

---

## 8. Forecasting Module (FareCast)

```mermaid
flowchart LR
    H["Historical<br/>Fare Data<br/>(14+ days)"] --> M{"Data Points<br/>≥ 7?"}
    M -->|Yes| HW["Holt-Winters<br/>Exponential Smoothing<br/>(statsmodels)"]
    M -->|No| WMA["Weighted<br/>Moving Average<br/>(fallback)"]
    HW --> FC["7-Day<br/>Forecast"]
    WMA --> FC
    FC --> SIG{"% Change<br/>vs Current?"}
    SIG -->|"> +0.5%"| BUY["🔴 BUY NOW<br/>Prices Rising"]
    SIG -->|"< -0.5%"| WAIT["🟢 WAIT<br/>Prices Falling"]
    SIG -->|"Within ±0.5%"| NEUTRAL["🟡 NEUTRAL<br/>Prices Stable"]
```

**Why Holt-Winters over Deep Learning:**
- Explainable to policy-makers (judges can understand the math)
- Works well with limited data (30 days, not years)
- Fast to compute (no GPU required)
- Standard in government statistical agencies worldwide

---

## 9. Anomaly Detection (Surge Radar)

```mermaid
flowchart TB
    P["Price Data<br/>Stream"] --> RM["Compute Rolling<br/>Mean μ (14-day)"]
    RM --> RS["Compute Rolling<br/>Std Dev σ"]
    RS --> Z["Calculate<br/>Z-Score"]
    Z --> TH{"|Z| > 2.5?"}
    TH -->|No| NORMAL["✅ Normal<br/>Price Movement"]
    TH -->|Yes| XV["Cross-Source<br/>Verification"]
    XV --> CS{"Multiple sources<br/>confirm spike?"}
    CS -->|Yes| SURGE["⚠️ GENUINE SURGE<br/>(festival/demand)"]
    CS -->|No| ERROR["🚨 DATA ERROR<br/>(scraping glitch)"]
```

---

## 10. Data Quality & Trust Score

```
TrustScore = (Actual Data Points Collected / Expected Data Points) × 100
```

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 90–100% | 🟢 Excellent | All sources reporting, high confidence |
| 75–89% | 🟡 Good | Minor gaps, index still reliable |
| 50–74% | 🟠 Fair | Some sources down, use with caution |
| < 50% | 🔴 Low | Significant data gaps, flagged for review |

This self-assessment metric is logged in `data_quality_log` and displayed on the dashboard — giving NSO/RBI an honest signal of how much to trust each day's index value.

---

## 11. System Components & Technology Stack

```mermaid
graph TB
    subgraph "Data Collection Layer"
        SC["Python + Playwright<br/>Plugin-per-source architecture<br/>12 scraper modules"]
        GH["GitHub Actions<br/>Cron scheduling (3×/day)<br/>Visible run logs"]
    end

    subgraph "Processing Layer"
        CL["pandas Pipeline<br/>Dedup · Outlier flagging<br/>Fare decomposition"]
        IX["numpy + pandas<br/>Laspeyres index<br/>DGCA-weighted"]
        FC["statsmodels<br/>Holt-Winters forecasting<br/>Anomaly detection"]
    end

    subgraph "Storage Layer"
        DB[("PostgreSQL<br/>Supabase<br/>7 normalised tables")]
    end

    subgraph "API Layer"
        FA["FastAPI<br/>Auto Swagger at /docs<br/>7 REST endpoints"]
    end

    subgraph "Presentation Layer"
        NJ["Next.js + Recharts<br/>9 dashboard pages<br/>Real-time visualisation"]
    end

    subgraph "Hosting"
        H1["GitHub Actions — Scraper"]
        H2["Render — API Server"]
        H3["Vercel — Dashboard"]
        H4["Supabase — Database"]
    end

    SC --> GH --> CL --> IX --> FC --> DB --> FA --> NJ
```

---

## 12. Database Schema (7 Tables)

```mermaid
erDiagram
    RAW_FARE_SNAPSHOTS {
        uuid id PK
        string source_name
        string origin
        string destination
        date travel_date
        timestamp scrape_timestamp
        string booking_window
        string flight_number
        float base_fare
        float taxes
        float convenience_fee
        float total_fare
        string availability_status
        boolean is_synthetic
        jsonb raw_payload
    }

    CLEANED_FARE_DATA {
        uuid id PK
        boolean is_outlier
        string outlier_reason
    }

    ROUTE_WEIGHTS {
        string origin PK
        string destination PK
        int dgca_passenger_traffic
        float weight
    }

    DAILY_INDEX {
        date date PK
        string route
        string booking_window
        float index_value
        string base_period_reference
    }

    ANOMALIES {
        uuid id PK
        string route
        date date
        string flag_type
        float z_score
        string description
    }

    FORECASTS {
        string route PK
        string booking_window PK
        date forecast_date PK
        float predicted_price
        float ci_lower
        float ci_upper
        string model_used
    }

    DATA_QUALITY_LOG {
        date date PK
        int expected_points
        int actual_points
        float confidence_pct
        text notes
    }

    RAW_FARE_SNAPSHOTS ||--o{ CLEANED_FARE_DATA : "cleaned into"
    CLEANED_FARE_DATA ||--o{ DAILY_INDEX : "aggregated into"
    ROUTE_WEIGHTS ||--o{ DAILY_INDEX : "weights"
    DAILY_INDEX ||--o{ ANOMALIES : "flags"
    DAILY_INDEX ||--o{ FORECASTS : "predicts"
```

---

## 13. API Endpoints (NSO/RBI Integration Ready)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/index/overall` | GET | National-level APIx (daily/weekly/monthly) |
| `/api/v1/index/route/{origin}/{dest}` | GET | Route-specific index with historical series |
| `/api/v1/index/booking-curve/{origin}/{dest}` | GET | Lead-time elasticity curve (T+1 to T+45) |
| `/api/v1/forecast/{origin}/{dest}` | GET | 7-day price forecast with Buy/Wait signal |
| `/api/v1/anomalies` | GET | Flagged surge events with classification |
| `/api/v1/fares/breakdown/{route}` | GET | Base fare vs taxes vs convenience fee transparency |
| `/api/v1/quality/current` | GET | Current TrustScore and data completeness |
| `/api/v1/reference/atf-correlation` | GET | ATF fuel price overlay data |
| `/api/v1/reference/compliance-matrix` | GET | Ethical scraping compliance status |
| `/docs` | GET | Auto-generated Swagger/OpenAPI documentation |

---

## 14. Dashboard Pages (9 Views)

| Page | Key Visualisation | Purpose |
|------|-------------------|---------|
| **Overview (Home)** | APIx trend line + stat cards | National index at a glance |
| **Route Explorer** | Route-specific index with per-route graphs | Drill into any city-pair |
| **Booking Curve** | Lead-time elasticity chart (T+1→T+45) | **Core USP** — dynamic pricing curve |
| **Fare Forecast** | Historical + predicted price with Buy/Wait signal | Consumer & policy value-add |
| **Anomalies** | Flagged events with severity and classification | Surge vs. data error separation |
| **Fare Transparency** | Stacked bar: Base Fare / Taxes / Convenience Fee per carrier | Price decomposition insight |
| **ATF Impact** | Dual-axis: APIx trend vs ATF fuel price correlation | Explains *why* prices move |
| **Data Quality** | TrustScore gauge + source completeness table | Self-assessment transparency |
| **Compliance** | robots.txt adherence + rate-limit audit log | Ethical scraping proof |

---

## 15. Unique Selling Propositions (USPs)

```mermaid
mindmap
  root((SkyIndex<br/>USPs))
    Booking Window Curve
      5 advance-purchase windows
      T+1 to T+45 tracking
      Lead-time elasticity captured
      Manual CPI cannot do this
    DGCA Traffic Weighting
      Real passenger volumes
      Statistically rigorous
      Same methodology as CPI
    Ethical Scraping
      robots.txt compliance
      Rate limiting
      Production path = API agreements
    FareCast Forecasting
      Holt-Winters model
      Buy/Wait signals
      7-day prediction horizon
    Surge Radar
      Z-score anomaly detection
      Cross-source verification
      Surge vs Data Error classification
    TrustScore
      Data quality self-assessment
      Per-day confidence percentage
      Government-grade transparency
    Fare Transparency
      Base fare decomposition
      Tax breakdown per carrier
      Convenience fee tracking
    FuelLens ATF Correlation
      PPAC fuel price overlay
      Explains price movements
      Causal insight layer
```

---

## 16. Validation Strategy

### 16.1 Backtesting Against DGCA Data
- Aggregate our daily index to monthly averages per route
- Compare trend direction and magnitude against DGCA's published monthly average-fare statistics
- Correlation coefficient target: **r > 0.85** to demonstrate system reliability

### 16.2 Pipeline Correctness Tests
- Unit tests for outlier detection (synthetic extreme values correctly flagged)
- Unit tests for fare decomposition (known base+tax examples parsed correctly)
- Integration test: full pipeline from raw scrape → cleaned data → index output

### 16.3 Self-Validation via TrustScore
- Daily automated confidence assessment
- Historical TrustScore trend visible on dashboard
- Honest reporting — a 92% confidence day is more credible than claiming 100%

---

## 17. Deployment Architecture

```mermaid
flowchart LR
    subgraph "GitHub"
        REPO["Source Code<br/>Repository"]
        GA["GitHub Actions<br/>Cron Workflow<br/>(scraper + pipeline)"]
    end

    subgraph "Supabase"
        PG[("PostgreSQL<br/>Database")]
    end

    subgraph "Render"
        API["FastAPI<br/>API Server<br/>(read-only from DB)"]
    end

    subgraph "Vercel"
        FE["Next.js<br/>Dashboard"]
    end

    REPO --> GA
    GA -->|"writes scraped +<br/>computed data"| PG
    PG -->|"reads data"| API
    API -->|"serves JSON"| FE
    FE -->|"user accesses"| USERS["🏛️ NSO / RBI / Analysts"]
```

> [!IMPORTANT]
> **Key architectural decision:** The scraper pipeline and the API server are **completely separated**. The scraper runs on GitHub Actions (heavy, scheduled, writes to DB). The API runs on Render (lightweight, always-on, reads from DB). This prevents headless-browser scraping from blocking or crashing the API server.

---

## 18. Scalability & Future Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Current (Prototype)** | 8 routes, 5 windows, 2-3 live sources + reconstruction | SIH 2026 |
| **Phase 2** | All domestic routes with DGCA traffic > 1M pax/year | Post-shortlist |
| **Phase 3** | Official API agreements with airlines (replacing scraping) | Production |
| **Phase 4** | International routes, real-time streaming, ML-based forecasting | Long-term |

### Production Deployment Path
At production scale for MoSPI/NSO, the system transitions from web scraping to **official data-sharing API agreements** with airlines and OTAs — which is realistically how a government statistical system would operate. The scraping prototype demonstrates the concept; the API architecture is already built to seamlessly swap in official data feeds without changing the downstream pipeline.

---

## 19. Impact Statement

| Stakeholder | Current State | With SkyIndex |
|-------------|--------------|---------------|
| **NSO/MoSPI** | Manual, infrequent fare collection | Automated daily index with 5-window granularity |
| **RBI** | Stale transport-inflation data for CPI | Real-time airfare inflation signal for monetary policy |
| **DGCA** | Monthly averages only | Daily route-level analytics with anomaly flagging |
| **Researchers** | No public dynamic-pricing dataset | Open API with historical data access |
| **Consumers** | No price-trend visibility | Buy/Wait signals based on forecast trends |
