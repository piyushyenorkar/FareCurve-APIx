import { useState } from "react";
import { Code, Copy, Check, CheckCircle, ExternalLink, Server, Shield, Database, Activity, TerminalSquare, Search } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { ChartAIButton } from "../components/ChartAIButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/index/latest",
    title: "Current Headline Index",
    description: "Returns the latest computed APIx value, date, and observation count.",
    category: "Index",
    example: '{\n  "date": "2026-09-07",\n  "value": 123.7,\n  "mean_fare": 5842,\n  "observations": 770,\n  "base_value": 100.0\n}',
  },
  {
    method: "GET",
    path: "/api/v1/index/overall?frequency=daily&limit=90",
    title: "Historical Index Series",
    description: "Returns daily/weekly/monthly index values. Supports frequency=daily|weekly|monthly and limit parameter.",
    category: "Index",
    params: [
      { name: "frequency", type: "string", default: "daily", desc: "Aggregation: daily, weekly, monthly" },
      { name: "limit", type: "int", default: "90", desc: "Number of records (1-365)" },
    ],
    example: '[\n  { "date": "2026-09-01", "value": 118.2, "mean_fare": 5420 },\n  { "date": "2026-09-02", "value": 120.1, "mean_fare": 5580 }\n]',
  },
  {
    method: "GET",
    path: "/api/v1/index/route/{origin}/{dest}",
    title: "Per-Route Index",
    description: "Historical index for a specific city-pair (e.g., DEL/BOM).",
    category: "Index",
    example: '[\n  { "date": "2026-09-07", "value": 127.3, "mean_fare": 6200, "observations": 55 }\n]',
  },
  {
    method: "GET",
    path: "/api/v1/index/booking-curve/{origin}/{dest}",
    title: "Booking Window Curve",
    description: "Price at each advance-purchase window (T+1, T+7, T+15, T+30, T+45). Optional carrier filter.",
    category: "Index",
    params: [
      { name: "carrier", type: "string", default: "all", desc: "IATA code: 6E, AI, SG, QP, IX" },
    ],
    example: '{\n  "route": "DEL-BOM",\n  "curve": [\n    { "window": "T+1", "avg_fare": 8200, "min_fare": 6800, "max_fare": 12400 },\n    { "window": "T+45", "avg_fare": 4100, "min_fare": 3200, "max_fare": 5600 }\n  ]\n}',
  },
  {
    method: "GET",
    path: "/api/v1/fares/raw?route=DEL-BOM&carrier=6E",
    title: "Raw Fare Observations",
    description: "Individual fare quotes with full metadata: origin, destination, carrier, booking window, base fare, taxes, total.",
    category: "Fares",
    params: [
      { name: "route", type: "string", default: "all", desc: "Route key (e.g., DEL-BOM)" },
      { name: "carrier", type: "string", default: "all", desc: "IATA carrier code" },
    ],
    example: '[\n  {\n    "route_key": "DEL-BOM",\n    "carrier": "6E",\n    "booking_window_days": 7,\n    "base_fare": 3800,\n    "taxes": 850,\n    "total_fare": 4650,\n    "observation_date": "2026-09-07"\n  }\n]',
  },
  {
    method: "GET",
    path: "/api/v1/anomalies?limit=50",
    title: "Detected Price Anomalies",
    description: "Fares flagged as statistical outliers by the IQR/Z-score pipeline.",
    category: "Quality",
    example: '[\n  {\n    "route_key": "DEL-BOM",\n    "carrier": "AI",\n    "total_fare": 24500,\n    "z_score": 3.8,\n    "reason": "Z-score > 3.0 threshold"\n  }\n]',
  },
  {
    method: "GET",
    path: "/api/v1/quality/current",
    title: "Data Quality Score",
    description: "Current pipeline health: coverage %, anomaly rate, freshness.",
    category: "Quality",
    example: '{\n  "coverage_pct": 87.5,\n  "anomaly_rate_pct": 1.2,\n  "total_observations": 770,\n  "last_pipeline_run": "2026-09-07T05:00:01Z"\n}',
  },
  {
    method: "GET",
    path: "/api/v1/reference/compliance-matrix",
    title: "Compliance Matrix",
    description: "robots.txt audit for every source website. Shows ALLOW/DENY verdict with governing rules.",
    category: "Compliance",
    example: '[\n  {\n    "name": "Akasa Air",\n    "type": "airline",\n    "url": "akasaair.com",\n    "verdict": "ALLOW",\n    "rule": "No restrictive Disallow"\n  }\n]',
  },
  {
    method: "GET",
    path: "/api/v1/reference/atf-correlation",
    title: "ATF Fuel Correlation",
    description: "Aviation Turbine Fuel price series overlaid with APIx for cost-driver analysis.",
    category: "Reference",
    example: '{\n  "correlation_coefficient": 0.72,\n  "apix_history": [...],\n  "atf_history": [...]\n}',
  },
];

const CATEGORIES = ["Index", "Fares", "Quality", "Compliance", "Reference"];
const CATEGORY_ICONS: Record<string, any> = {
  Index: Activity,
  Fares: Database,
  Quality: Shield,
  Compliance: Shield,
  Reference: Server,
};

export default function APIDocsPage() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [tryResult, setTryResult] = useState<Record<string, string>>({});
  const [loadingTry, setLoadingTry] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");

  const copyToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const tryEndpoint = async (endpoint: typeof ENDPOINTS[0]) => {
    const key = endpoint.path;
    setLoadingTry(prev => ({ ...prev, [key]: true }));
    try {
      const cleanPath = endpoint.path.replace("{origin}", "DEL").replace("{dest}", "BOM");
      const res = await fetch(`${API_BASE}${cleanPath}`);
      const data = await res.json();
      setTryResult(prev => ({ ...prev, [key]: JSON.stringify(data, null, 2).slice(0, 1000) }));
    } catch (e: any) {
      setTryResult(prev => ({ ...prev, [key]: `Error: ${e.message}` }));
    }
    setLoadingTry(prev => ({ ...prev, [key]: false }));
  };

  const filtered = filter === "all" ? ENDPOINTS : ENDPOINTS.filter(e => e.category === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
          <span className="gradient-text">API for NSO & RBI <InfoTooltip text="RESTful JSON endpoints that the National Statistical Office and Reserve Bank of India can consume directly for CPI augmentation." /></span>
        </h1>
        <ChartAIButton contextQuery="Explain the API endpoints available for NSO and RBI consumption." />
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
        Production-ready REST API — JSON responses consumable by any statistical system
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "999px", padding: "6px 14px", fontSize: "0.75rem", fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></div>
          Base URL: {API_BASE}
        </div>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Format: JSON · Auth: None (open data) · Rate limit: 100 req/min</span>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{
          padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
          background: filter === "all" ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "#fff",
          border: filter === "all" ? "none" : "1px solid #e2e8f0",
          color: filter === "all" ? "#fff" : "#64748b", cursor: "pointer",
        }}>All Endpoints</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
            background: filter === c ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "#fff",
            border: filter === c ? "none" : "1px solid #e2e8f0",
            color: filter === c ? "#fff" : "#64748b", cursor: "pointer",
          }}>{c}</button>
        ))}
      </div>

      {/* Endpoints */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filtered.map((ep) => (
          <div key={ep.path} className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "0.7rem", fontWeight: 800, padding: "4px 10px", borderRadius: 6, fontFamily: "monospace" }}>{ep.method}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{ep.title}</span>
                  <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: "0.65rem", fontWeight: 600, padding: "3px 8px", borderRadius: 999 }}>{ep.category}</span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: "600px" }}>{ep.description}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => copyToClipboard(`${API_BASE}${ep.path}`, ep.path)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {copiedPath === ep.path ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy URL</>}
                </button>
                <button
                  onClick={() => tryEndpoint(ep)}
                  disabled={loadingTry[ep.path]}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {loadingTry[ep.path] ? "Loading..." : <><ExternalLink size={12} /> Try it</>}
                </button>
              </div>
            </div>

            {/* Path */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 16px", fontFamily: "monospace", fontSize: "0.8rem", color: "#334155", marginBottom: "0.75rem", border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8" }}>{API_BASE}</span>{ep.path}
            </div>

            {/* Parameters */}
            {ep.params && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Parameters</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {ep.params.map(p => (
                    <div key={p.name} style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", padding: "4px 0" }}>
                      <code style={{ color: "#7c3aed", fontWeight: 600, minWidth: "100px" }}>{p.name}</code>
                      <span style={{ color: "#94a3b8", minWidth: "50px" }}>{p.type}</span>
                      <span style={{ color: "#64748b" }}>{p.desc}</span>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>default: {p.default}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example Response */}
            <details>
              <summary style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6", cursor: "pointer", marginBottom: "6px" }}>
                Example Response
              </summary>
              <pre style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: 10, padding: "16px", fontSize: "0.75rem", overflow: "auto", maxHeight: "200px", fontFamily: "monospace" }}>
                {ep.example}
              </pre>
            </details>

            {/* Live result */}
            {tryResult[ep.path] && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: "4px" }}>Live Response</div>
                <pre style={{ background: "#0f172a", color: "#4ade80", borderRadius: 10, padding: "16px", fontSize: "0.72rem", overflow: "auto", maxHeight: "250px", fontFamily: "monospace", border: "1px solid #166534" }}>
                  {tryResult[ep.path]}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Integration Guide */}
      <div className="glass-card" style={{ marginTop: "1.5rem", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Quick Integration Guide</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>Python (for NSO/MoSPI)</div>
            <pre style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: 10, padding: "16px", fontSize: "0.75rem", fontFamily: "monospace" }}>
{`import requests

r = requests.get("${API_BASE}/api/v1/index/latest")
apix = r.json()
print(f"APIx: {apix['value']}")
print(f"Date: {apix['date']}")`}
            </pre>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>cURL (for RBI systems)</div>
            <pre style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: 10, padding: "16px", fontSize: "0.75rem", fontFamily: "monospace" }}>
{`curl -s ${API_BASE}/api/v1/index/overall \\
  ?frequency=monthly \\
  | python -m json.tool`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
