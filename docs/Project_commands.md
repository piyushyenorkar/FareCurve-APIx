# APIx Command Cheat Sheet

When you open the project again, here are all the essential commands you need to get everything running and check your data.

> [!NOTE]
> All terminal commands below should be run from the root directory (`C:\AIR-INDEX`).

## 1. Start the Backend Server
This runs the FastAPI REST API (where your Groq AI route, index calculations, and data endpoints live).

```powershell
python -m apix.cli serve
```
*Alternatively:* `uvicorn apix.api.main:app --reload`
- **Swagger Docs:** http://127.0.0.1:8000/docs
- **API Base:** http://127.0.0.1:8000/api/v1/

## 2. Start the Frontend Dashboard
This runs the Next.js glassmorphism web application. Open a **second terminal window** for this.

```powershell
cd frontend
npm run dev
```
- **Dashboard UI:** http://localhost:3000
- **Backend:** python -m apix.cli serve

## 3. Run the Data Pipeline
If you want to manually trigger the scraping, cleaning, and index computation process (instead of waiting for the GitHub Action cron).

```powershell
# Run the full pipeline (Scrape -> Clean -> Index)
python -m apix.cli pipeline-run

# Just run the reconstruction engine (for gated sources)
python -m apix.cli pipeline-reconstruct

# Recompute today's index from existing data
python -m apix.cli compute-index
```

## 4. Reset or Backfill Data (For Demos)
If your charts look empty or you need a fresh batch of 30 days of realistic data to show the judges:

```powershell
# Drop and recreate the database tables
python -m apix.cli db-init

# Load the base reference data (routes, DGCA weights)
python -m apix.cli db-seed

# Generate 30 days of realistic historical data for your charts
python -m apix.cli backfill-data
```

## 5. Fetch and View Database Data
Your data is stored locally in a SQLite database at `data/apix.db`.

### Option A: Using VS Code (Recommended for Judges)
1. Install the **"SQLite Viewer"** extension in VS Code.
2. Open the file `data/apix.db` in VS Code.
3. It will open a nice table view where you can see all your `fares`, `index_values`, and `anomalies`.

### Option B: Using Command Line (Quick Look)
You can use Python to quickly print data to your terminal.

**See the latest 5 fares scraped:**
```powershell
python -c "import sqlite3, pandas as pd; conn = sqlite3.connect('data/apix.db'); print(pd.read_sql('SELECT source, origin, destination, base_fare, total_fare, provenance FROM fares ORDER BY fetched_at DESC LIMIT 5', conn))"
```

**See the latest Index values:**
```powershell
python -c "import sqlite3, pandas as pd; conn = sqlite3.connect('data/apix.db'); print(pd.read_sql('SELECT * FROM index_values ORDER BY computation_date DESC LIMIT 5', conn))"
```
