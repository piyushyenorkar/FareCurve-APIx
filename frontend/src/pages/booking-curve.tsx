import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area, LineChart, Line, Legend } from "recharts";
import { Plane, Filter, Search } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { AirportSearch } from "../components/AirportSearch";
import { CustomDropdown } from "../components/CustomDropdown";

const ROUTES = ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL", "DEL-HYD", "BOM-CCU", "DEL-PNQ", "DEL-AMD", "BOM-GOI", "DEL-GOI", "DEL-LKO", "DEL-SXR", "DEL-JAI", "DEL-MAA"];
const COLORS = ["#f43f5e","#f97316","#eab308","#10b981","#06b6d4"];
const LABELS: Record<string,string> = {"T+1":"Last minute","T+7":"1 week","T+15":"2 weeks","T+30":"1 month","T+45":"45 days"};

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

export default function BookingCurvePage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [airline, setAirline] = useState("ALL");
  const [ota, setOta] = useState("ALL");
  const [customOrigin, setCustomOrigin] = useState("");
  const [customDest, setCustomDest] = useState("");

  const handleCustomRoute = () => {
    if (customOrigin.length >= 3 && customDest.length >= 3) {
      setRoute(`${customOrigin.substring(0,3).toUpperCase()}-${customDest.substring(0,3).toUpperCase()}`);
    }
  };

  const [curve, setCurve] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("");

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = route.split("-");
    const endpoint = airline === "ALL"
      ? `/api/v1/index/booking-curve/${origin}/${dest}`
      : `/api/v1/index/booking-curve/${origin}/${dest}?carrier=${airline}`;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${endpoint}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data && data.curve) {
          setCurve(data.curve.map((c: any) => ({
            ...c,
            label: LABELS[c.window] || c.window,
          })));
          setPeriod(data.period || "");
        } else {
          setCurve([]);
        }
        setLoading(false);
      }).catch(() => { setCurve([]); setLoading(false); });
  }, [route, airline, ota]);

  // Calculate elasticity data from the curve
  const elasticityData = useMemo(() => {
    if (curve.length < 2) return [];
    const sorted = [...curve].sort((a, b) => b.days_before_travel - a.days_before_travel); // T+45 → T+1
    return sorted.map((c, i) => {
      if (i === 0) return { ...c, elasticity: 0, pctChange: 0 };
      const prev = sorted[i - 1];
      const pctChange = prev.avg_fare ? ((c.avg_fare - prev.avg_fare) / prev.avg_fare) * 100 : 0;
      const dayDiff = prev.days_before_travel - c.days_before_travel;
      return {
        ...c,
        pctChange: Math.round(pctChange * 10) / 10,
        elasticity: dayDiff > 0 ? Math.round((pctChange / dayDiff) * 100) / 100 : 0,
        priceJump: Math.round(c.avg_fare - prev.avg_fare),
      };
    });
  }, [curve]);

  // Multi-airline comparison data
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  useEffect(() => {
    if (airline !== "ALL") return;
    const [origin, dest] = route.split("-");
    const carriers = ["6E", "AI", "SG", "QP"];
    Promise.all(
      carriers.map(c =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/index/booking-curve/${origin}/${dest}?carrier=${c}`)
          .then(r => r.json())
          .then(d => ({ carrier: c, curve: d?.curve || [] }))
          .catch(() => ({ carrier: c, curve: [] }))
      )
    ).then(results => {
      // Build comparison: for each window, show each airline's fare
      const windows = ["T+1", "T+7", "T+15", "T+30", "T+45"];
      const comp = windows.map(w => {
        const row: any = { window: w };
        results.forEach(r => {
          const pt = r.curve.find((c: any) => c.window === w);
          row[r.carrier] = pt?.avg_fare || null;
        });
        return row;
      });
      setComparisonData(comp);
    });
  }, [route, airline, ota]);

  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
        <span className="gradient-text">Booking Curve & Elasticity <InfoTooltip text="Compares average fares at different booking windows. The elasticity curve shows how steeply prices change per day as departure approaches." /></span>
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Lead-time pricing behavior — how much more you pay by booking late
      </p>

        <div className="text-[11px] uppercase font-bold text-gray-500 mb-2 ml-1 tracking-wider">Top DGCA High-Traffic Routes</div>
      {/* Route + Airline Filters */}
                  {/* Top DGCA Routes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {ROUTES.map(r => (
          <button key={r} onClick={() => setRoute(r)} style={{
            padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
            background: r === route ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "rgba(255,255,255,0.04)",
            border: r === route ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: r === route ? "#fff" : "var(--text-secondary)",
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
          <AirportSearch placeholder="Origin (DEL)" value={customOrigin} onChange={setCustomOrigin} />
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>✈</span>
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
        {period && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Period: {period}</p>}
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          {route} Fare by Booking Window {airline !== "ALL" ? `— ${AIRLINE_OPTIONS.find((a: any) => a.value === airline)?.label}` : ""}
        <InfoTooltip text="Average fares plotted against booking windows. Displays how prices rise leading up to departure." />
        </h2>
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4 mt-4 w-full">
            <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
          </div>
        ) : curve.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No data available for this route yet. Run the pipeline first.</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={curve} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="window" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => "₹" + v.toLocaleString()} />
              <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2, strokeDasharray: "4 4" }} contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: "12px" }} formatter={(v: any, n: any) => ["₹" + Number(v).toLocaleString(), n]} />
              <Line type="monotone" dataKey="avg_fare" name="Avg Fare" stroke="#3b82f6" strokeWidth={4} dot={{ fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2, r: 6 }} activeDot={{ r: 8, fill: "#0f172a", stroke: "#ffffff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Cards */}
      {curve.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${curve.length},1fr)`, gap: "1rem", marginBottom: "1.5rem" }}>
          {curve.map((c, i) => (
            <div key={c.window} className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{c.label || c.window}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: COLORS[i % COLORS.length] }}>₹{Number(c.avg_fare).toLocaleString()}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{c.window} · {c.observations || 0} obs</div>
            </div>
          ))}
        </div>
      )}

      {/* Lead-Time Elasticity Curve */}
      {elasticityData.length > 1 && (
        <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Lead-Time Elasticity Curve <InfoTooltip text="Shows the % price increase per day as departure approaches. Steeper curve = more aggressive dynamic pricing. This is the key metric PS asks for." />
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Price change velocity — how aggressively fares rise as departure nears
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={elasticityData}>
              <defs>
                <linearGradient id="elasticityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="window" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => v + "%"} label={{ value: "% Change", angle: -90, position: "insideLeft", style: { fill: "#94a3b8", fontSize: 11 } }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: "12px" }}
                formatter={(v: any, name: any) => {
                  if (name === "pctChange") return [`${v}%`, "% Price Change"];
                  return [v, name];
                }} />
              <Area type="monotone" dataKey="pctChange" stroke="#f43f5e" fill="url(#elasticityGrad)" strokeWidth={2.5} name="pctChange" dot={{ r: 5, fill: "#f43f5e" }} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Elasticity insight cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1rem" }}>
            {elasticityData.filter(e => e.priceJump).map((e, i) => (
              <div key={i} style={{ background: "#fafafa", borderRadius: "12px", padding: "1rem", textAlign: "center", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{e.window}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: e.pctChange > 0 ? "#ef4444" : "#10b981" }}>
                  {e.pctChange > 0 ? "+" : ""}{e.pctChange}%
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                  {e.priceJump > 0 ? "+" : ""}₹{e.priceJump?.toLocaleString()} jump
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Airline Comparison (only when "All Airlines" selected) */}
      {airline === "ALL" && comparisonData.length > 0 && comparisonData.some(d => d["6E"] || d["AI"] || d["SG"] || d["QP"] || d["IX"] || d["UK"]) && (
        <div className="glass-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Airline Pricing Comparison <InfoTooltip text="Compares how different airlines price the same route across booking windows. Shows which airline is most aggressive with last-minute pricing." />
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            {route} — fare curves across carriers
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="window" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => "₹" + v.toLocaleString()} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v: any) => ["₹" + Number(v).toLocaleString()]} />
              <Legend />
              <Line type="monotone" dataKey="6E" name="IndiGo" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="AI" name="Air India" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="SG" name="SpiceJet" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="QP" name="Akasa" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="IX" name="AI Express" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="UK" name="Vistara" stroke="#9d174d" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
