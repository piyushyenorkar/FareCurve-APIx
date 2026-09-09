import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plane, Filter, Search } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { TimeFilter } from "../components/TimeFilter";
import { AirportSearch } from "../components/AirportSearch";
import { CustomDropdown } from "../components/CustomDropdown";

const ROUTES = ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL", "DEL-HYD", "BOM-CCU", "DEL-PNQ", "DEL-AMD", "BOM-GOI", "DEL-GOI", "DEL-LKO", "DEL-SXR", "DEL-JAI", "DEL-MAA"];
const COLORS = ["#3b82f6", "#8b5cf6", "#f43f5e", "#f97316", "#10b981", "#06b6d4", "#eab308", "#6366f1"];

const AIRLINE_OPTIONS = [
  { value: "ALL", label: "All Airlines" },
  { value: "6E", label: "IndiGo", logo: "https://images.kiwi.com/airlines/32/6E.png" },
  { value: "AI", label: "Air India", logo: "https://images.kiwi.com/airlines/32/AI.png" },
  { value: "SG", label: "SpiceJet", logo: "https://images.kiwi.com/airlines/32/SG.png" },
  { value: "QP", label: "Akasa Air", logo: "https://images.kiwi.com/airlines/32/QP.png" },
  { value: "IX", label: "AI Express", logo: "https://images.kiwi.com/airlines/32/IX.png" },
  { value: "UK", label: "Vistara", logo: "https://images.kiwi.com/airlines/32/UK.png" }
];

const OTA_OPTIONS = [
  { value: "ALL", label: "All Sources" },
  { value: "yatra", label: "Yatra", logo: "https://www.google.com/s2/favicons?domain=yatra.com&sz=64" },
  { value: "makemytrip", label: "MakeMyTrip", logo: "https://www.google.com/s2/favicons?domain=makemytrip.com&sz=64" },
  { value: "easemytrip", label: "EaseMyTrip", logo: "https://www.google.com/s2/favicons?domain=easemytrip.com&sz=64" },
  { value: "cleartrip", label: "Cleartrip", logo: "https://www.google.com/s2/favicons?domain=cleartrip.com&sz=64" },
  { value: "ixigo", label: "Ixigo", logo: "https://www.google.com/s2/favicons?domain=ixigo.com&sz=64" },
  { value: "goibibo", label: "Goibibo", logo: "https://www.google.com/s2/favicons?domain=goibibo.com&sz=64" }
];




const AIRPORTS = [
  { code: "DEL", city: "Delhi" }, { code: "BOM", city: "Mumbai" }, { code: "BLR", city: "Bengaluru" },
  { code: "CCU", city: "Kolkata" }, { code: "HYD", city: "Hyderabad" }, { code: "MAA", city: "Chennai" },
  { code: "PNQ", city: "Pune" }, { code: "AMD", city: "Ahmedabad" }, { code: "GOI", city: "Goa" },
  { code: "LKO", city: "Lucknow" }, { code: "SXR", city: "Srinagar" }, { code: "JAI", city: "Jaipur" },
  { code: "PAT", city: "Patna" }, { code: "BBI", city: "Bhubaneswar" }, { code: "GAU", city: "Guwahati" },
  { code: "COK", city: "Kochi" }, { code: "TRV", city: "Thiruvananthapuram" }, { code: "IXC", city: "Chandigarh" },
  { code: "ATQ", city: "Amritsar" }, { code: "IXB", city: "Bagdogra" }
];

export default function RoutesPage() {
    const [selected, setSelected] = useState("DEL-BOM");
  const [airline, setAirline] = useState("ALL");
  const [ota, setOta] = useState("ALL");
  const [customOrigin, setCustomOrigin] = useState("");
  const [customDest, setCustomDest] = useState("");

  const handleCustomRoute = () => {
    if (customOrigin.length >= 3 && customDest.length >= 3) {
      setSelected(`${customOrigin.substring(0,3).toUpperCase()}-${customDest.substring(0,3).toUpperCase()}`);
    }
  };

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>('7D');

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = selected.split("-");
    api.indexRoute(origin, dest, airline, ota).then((data: any) => {
      if (Array.isArray(data)) {
        setHistory(data.map((d: any) => ({
          date: d.date?.slice(5) || "",
          value: d.value,
          mean_fare: d.mean_fare,
          observations: d.observations,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selected, airline, ota]);

  const latest = history.length > 0 ? history[history.length - 1] : null;

  let chartData = history;
  if (timeFilter === '7D') chartData = history.length > 7 ? history.slice(-7) : history;
  else if (timeFilter === '30D') chartData = history.length > 30 ? history.slice(-30) : history;

  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
        <span className="gradient-text">Route Explorer <InfoTooltip text="Per-route price index (Laspeyres weighted relative, base=100). Each route's index shows how current fares compare to the base period average." /></span>
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Track individual route indices — live from the database
      </p>
        <div className="text-[11px] uppercase font-bold text-gray-500 mb-2 ml-1 tracking-wider">Top DGCA High-Traffic Routes</div>
                  {/* Top DGCA Routes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {ROUTES.map(r => (
          <button key={r} onClick={() => setSelected(r)} style={{
            padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
            background: r === selected ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "rgba(255,255,255,0.04)",
            border: r === selected ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: r === selected ? "#fff" : "var(--text-secondary)",
            cursor: "pointer", transition: "all 0.2s",
          }}>
            <Plane size={12} style={{ display: "inline", marginRight: 4 }} />{r}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Custom Route Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Search size={14} style={{ color: "#64748b" }} />
          <AirportSearch placeholder="Origin (DEL)" value={customOrigin} onChange={setCustomOrigin} />
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>→</span>
          <AirportSearch placeholder="Dest (BOM)" value={customDest} onChange={setCustomDest} />
          <button onClick={handleCustomRoute} 
            style={{ padding: "0.5rem 1rem", borderRadius: "999px", background: "#0f172a", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: "none" }}>
            Search
          </button>
        </div>

                {/* Airline Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderLeft: "1px solid #e2e8f0", paddingLeft: "1rem" }}>
          <CustomDropdown 
            options={AIRLINE_OPTIONS} 
            value={airline} 
            onChange={setAirline} 
            icon={<Filter size={14} />} 
          />
        </div>

        {/* OTA Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CustomDropdown 
            options={OTA_OPTIONS} 
            value={ota} 
            onChange={setOta} 
          />
        </div>

      </div>
      <div className="glass-card" style={{ marginBottom: "1.5rem" }}>

        {latest && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>Route Index</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#3b82f6" }}>{latest.value?.toFixed(2) || "—"}</div>
            </div>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>Mean Fare</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>₹{latest.mean_fare?.toLocaleString() || "—"}</div>
            </div>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>Observations</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{latest.observations || 0}</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selected} — Index Trend</h2>
          <TimeFilter value={timeFilter} onChange={setTimeFilter} layoutIdPrefix="routesFilter" />
        </div>
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4 mt-4 w-full">
            <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
            <div className="flex gap-4 mt-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-100 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No historical data for this route.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v: any, n: any) => [Number(v).toFixed(2), n]} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
