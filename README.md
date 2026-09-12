<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=3178C6&height=200&section=header&text=FareCurve&fontSize=70&fontColor=ffffff&descAlignY=70&descAlign=62" width="100%"/>
</div>

<div align="center">
  <img src="https://img.icons8.com/fluency/96/airplane-take-off.png" alt="FareCurve Logo" height="100"/>
  
  <h1>FareCurve (APIx) — Real-time Airfare Price Index</h1>
  
  <p><strong>Automated web scraping and index engine for augmenting the Consumer Price Index (CPI).</strong></p>
  
  <p>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white" alt="Next.js"></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white" alt="React"></a>
    <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white" alt="Python"></a>
    <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-0.100-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
    <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-1.40-2EAD33?logo=playwright&logoColor=white" alt="Playwright"></a>
    <a href="https://supabase.com"><img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=postgresql&logoColor=white" alt="PostgreSQL"></a>
    <a href="https://groq.com"><img src="https://img.shields.io/badge/Groq-llama--3--70b-F55036" alt="Groq"></a>
    <br/>
    <img src="https://img.shields.io/badge/SIH_2024-PS_26056-FF9900?style=flat-square" alt="SIH PS 26056">
    <img src="https://img.shields.io/badge/MoSPI-DIID-1E3A8A?style=flat-square" alt="MoSPI">
  </p>
</div>

<hr/>

<div align="center">

## <img src="https://img.icons8.com/fluency/48/search-property.png" width="32" height="32" align="center" /> What is FareCurve?

**FareCurve (APIx)** is an end-to-end data pipeline and analytics platform designed to solve **SIH Problem Statement 26056** for the Ministry of Statistics and Programme Implementation (MoSPI). 

India's CPI currently collects airfare prices manually, structurally missing the dynamic pricing and lead-time elasticity of modern airlines. FareCurve solves this by providing a scalable, ethical web-scraping engine that gathers fares across 5 airlines and 6 OTAs, cleans the data, and computes a Laspeyres-style Real-time Airfare Price Index (APIx) across advance-purchase windows (T+1 to T+45). 

<br/>

## <img src="https://img.icons8.com/fluency/48/rocket.png" width="32" height="32" align="center" /> Features

<table align="center">
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/bot.png" width="20" align="absmiddle"/> <b>Ethical Scraper</b> — Playwright-based headless engine with a strict RFC 9309 robots.txt compliance gate.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/broom.png" width="20" align="absmiddle"/> <b>Robust Data Cleaning</b> — Modified Z-score & IQR outlier detection, deduplication, and fare tax decomposition.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/combo-chart.png" width="20" align="absmiddle"/> <b>APIx Index Engine</b> — Laspeyres-style weighted price index calibrated with published DGCA passenger traffic.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/line-chart.png" width="20" align="absmiddle"/> <b>Lead-Time Elasticity</b> — Computes and visualizes fare curves across T+1, T+7, T+15, T+30, and T+45 windows.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/map-marker.png" width="20" align="absmiddle"/> <b>Sector Heatmaps</b> — Geospatial price intensity mapping for high-traffic domestic routes.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/artificial-intelligence.png" width="20" align="absmiddle"/> <b>FareCurve AI</b> — Groq-powered natural language chat assistant for rapid policy data analysis.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/future.png" width="20" align="absmiddle"/> <b>Holt-Winters Forecasting</b> — Time-series predictions generating automated Buy/Wait signals.</td>
  </tr>
  <tr>
    <td align="left"><img src="https://img.icons8.com/fluency/48/error.png" width="20" align="absmiddle"/> <b>Anomaly Detection</b> — Cross-source corroboration to classify genuine surges vs data errors.</td>
  </tr>
</table>

<br/>

## <img src="https://img.icons8.com/fluency/48/flow-chart.png" width="32" height="32" align="center" /> Architecture

```mermaid
flowchart TD
    %% Dark Theme Colors
    classDef box fill:#222,stroke:#444,stroke-width:2px,color:#fff;
    classDef accent fill:#3178C6,stroke:#222,stroke-width:2px,color:#fff;
    classDef db fill:#008CC1,stroke:#222,stroke-width:2px,color:#fff;
    classDef python fill:#FFD43B,stroke:#306998,stroke-width:2px,color:#222;
    
    Title["FARECURVE FRONTEND (Next.js + Recharts)"]:::accent

    subgraph Frontend [" "]
        H["Heatmaps"]:::box
        B["Booking Curve"]:::box
        F["Forecasts & AI"]:::box
        P["Price Trends"]:::box
        
        State["React Context Manager"]:::accent
        
        API_cli["api.ts (REST client)"]:::box
        
        H & B & F & P --> State
        State --> API_cli
    end
    
    Title ~~~ P

    DB[("☁️ SUPABASE\nPostgreSQL\n(Fares, Indexes, Config)")]:::db
    FastAPI["☁️ FASTAPI BACKEND\nPython 3.13\n(/api/v1/)"]:::python
    Pipeline(("🤖 DATA PIPELINE\nScraper & Cleaner\n(Playwright + Pandas)")):::python

    API_cli ==> FastAPI
    FastAPI ==> DB
    Pipeline ==> DB

    Groq["🧠 GROQ API\nLLaMA-3-70B\n(Analysis)"]:::box
    Index["📊 INDEX ENGINE\nLaspeyres-style APIx\n(DGCA Weights)"]:::python

    FastAPI ==> Groq
    Index ==> DB
    Pipeline -.-> Index
```

<br/>

## <img src="https://img.icons8.com/fluency/48/layers.png" width="32" height="32" align="center" /> Tech Stack

<br/>

<table>
  <tr>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind" /><br/>
      <b>Frontend</b><br/>Next.js + React + TS
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=python,fastapi" /><br/>
      <b>Backend & API</b><br/>Python 3.13 + FastAPI
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=postgres,supabase" /><br/>
      <b>Database</b><br/>PostgreSQL (Supabase)
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/fluency/48/spider.png" height="40" /><br/>
      <b>Scraping Engine</b><br/>Playwright Headless
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/48/artificial-intelligence.png" height="40" /><br/>
      <b>Artificial Intelligence</b><br/>Groq Fast Inference
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/48/bar-chart.png" height="40" /><br/>
      <b>Data Science</b><br/>Pandas + Statsmodels
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=vercel" height="40" /><br/>
      <b>Frontend Hosting</b><br/>Vercel
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/fluency/48/cloud-sync.png" height="40" /><br/>
      <b>Backend Hosting</b><br/>Render
    </td>
  </tr>
</table>

<br/>

## <img src="https://img.icons8.com/fluency/48/console.png" width="32" height="32" align="center" /> Setup & Installation

</div>

<div align="center">

### Prerequisites

<img src="https://skillicons.dev/icons?i=python" height="30" align="center" /> <b>Python 3.10+</b> &nbsp;&nbsp;|&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=nodejs" height="30" align="center" /> <b>Node.js 18+</b> &nbsp;&nbsp;|&nbsp;&nbsp;
<img src="https://skillicons.dev/icons?i=supabase" height="30" align="center" /> <b>Supabase Postgres</b>

</div>

### 1. Clone & Install
```bash
git clone https://github.com/your-org/AIR-INDEX.git
cd AIR-INDEX

# Backend (Create Virtual Env recommended)
pip install -e .

# Frontend
cd frontend
npm install
```

### 2. Environment Variables

**Backend** (`.env` in root):
```env
APIX_DATABASE_URL=postgresql+psycopg://user:password@your-supabase-url:5432/postgres
APIX_RESPECT_ROBOTS=true
APIX_DEFAULT_CRAWL_DELAY_SECONDS=5.0
GROQ_API_KEY=your_groq_api_key
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Initialize Database & Data
From the root `AIR-INDEX` directory:
```bash
# Drop and recreate database tables
python -m apix.cli db-init

# Load the base reference data (routes, DGCA weights)
python -m apix.cli db-seed

# Run the full data pipeline (Scrape -> Clean -> Index)
python -m apix.cli pipeline-run
```

### 4. Run Locally
```bash
# Terminal 1: Backend Server (from AIR-INDEX root)
python -m apix.cli serve

# Terminal 2: Frontend Dashboard (from AIR-INDEX/frontend)
cd frontend
npm run dev
```
- **Dashboard UI:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

<div align="center">

## <img src="https://img.icons8.com/fluency/48/group.png" width="32" height="32" align="center" /> Team

Built for **Smart India Hackathon 2024** by **Team Starcy**:
- **Piyush** (Leader)
- **Debashree** 

<br/>
<img src="https://img.icons8.com/fluency/96/airplane-take-off.png" height="70" width="70" align="center" alt="FareCurve Favicon" />

</div>
