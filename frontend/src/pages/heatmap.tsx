import { useState, useEffect, useMemo } from "react";
import { InfoTooltip } from "../components/InfoTooltip";
import { Calendar, TrendingDown, TrendingUp, Plane } from "lucide-react";

const ROUTES = ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL"];

// Helper to get next N dates formatted as "SEP 6 · SAT"
const getNextNDates = (n: number) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const dayPart = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    dates.push(`${datePart} · ${dayPart}`);
  }
  return dates;
};

// We generate 30 days of data once
const ALL_DATES = getNextNDates(30);

const generateConcept1Data = () => {
  const basePrices: Record<string, number> = {
    "DEL-BOM": 4800,
    "DEL-BLR": 6500,
    "BOM-BLR": 3500,
    "DEL-CCU": 5500,
    "BLR-HYD": 2800,
    "MAA-DEL": 6200,
  };

  const data: Record<string, Record<string, number>> = {};

  ROUTES.forEach(route => {
    data[route] = {};
    const base = basePrices[route];

    ALL_DATES.forEach((dateStr, i) => {
      let price = base;
      if (i < 3) price *= 1.4; // Last minute
      else if (i > 10 && i < 20) price *= 0.85; // Advance sweet spot
      else if (i >= 20) price *= 0.9; // Far advance

      // Weekend surge (check if string contains SAT or SUN)
      if (dateStr.includes("SAT") || dateStr.includes("SUN") || dateStr.includes("FRI")) {
        price *= 1.25;
      }

      price += Math.sin(i) * 500;
      price += Math.random() * 400 - 200;

      data[route][dateStr] = Math.round(price);
    });
  });

  return data;
};

export default function FareMatrixPage() {
  const [data, setData] = useState<Record<string, Record<string, number>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>("14D");

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(generateConcept1Data());
      setLoading(false);
    }, 500);
  }, []);

  const visibleDates = useMemo(() => {
    const days = timeFilter === "30D" ? 30 : 14;
    return ALL_DATES.slice(0, days);
  }, [timeFilter]);

  // Determine cell styling based on 3 distinct tiers
  const getCellStyles = (price: number, min: number, max: number) => {
    const ratio = (price - min) / (max - min);
    
    // 3 Discrete Tiers using Pastel Backgrounds and Dark Text
    if (ratio <= 0.25) {
      // Best Deal (Bottom 25%) - Pastel Green
      return { bg: "#d1fae5", text: "#064e3b" }; // emerald-100 and emerald-900
    } else if (ratio >= 0.75) {
      // Surge/Expensive (Top 25%) - Pastel Red
      return { bg: "#ffe4e6", text: "#881337" }; // rose-100 and rose-900
    } else {
      // Average/Normal (Middle 50%) - Pastel Yellow
      return { bg: "#fef3c7", text: "#78350f" }; // amber-100 and amber-900
    }
  };

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Fare Matrix <InfoTooltip text="Visualizes lowest available fares across dates and routes. Fares are divided into 3 distinct tiers: Best Deal, Average, and Surge Price." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Identify the cheapest days to fly across major Indian sectors at a glance.
      </p>

      <div className="glass-card" style={{ padding: "1.5rem 2rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", minWidth: "800px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={20} className="text-blue-500" />
            {timeFilter === "30D" ? "30-Day Outlook" : "14-Day Outlook"}
          </h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            {/* Legend for the 3 tiers */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#d1fae5", border: "1px solid #059669" }}></div>
                <span>Best Deal</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#fef3c7", border: "1px solid #d97706" }}></div>
                <span>Average</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ffe4e6", border: "1px solid #e11d48" }}></div>
                <span>Surge Price</span>
              </div>
            </div>

            {/* Reusing existing TimeFilter component for 14D/30D toggle */}
            <div className="flex bg-gray-100/50 p-1 rounded-full border border-gray-200 shadow-inner">
              {['14D', '30D'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                    timeFilter === t
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading || !data ? (
          <div className="animate-pulse flex flex-col gap-2 w-full">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg w-full"></div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto", paddingBottom: "10px" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: "3px", width: "100%", minWidth: "900px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 10px", textAlign: "left", width: "120px", color: "#0f172a", fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", position: "sticky", left: 0, backgroundColor: "#fff", zIndex: 10, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>Route</th>
                  {visibleDates.map(dateStr => {
                    const [datePart, dayPart] = dateStr.split(" · ");
                    return (
                      <th key={dateStr} style={{ padding: "10px 4px", textAlign: "center", borderBottom: "1px solid #f1f5f9", minWidth: "95px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>{datePart}</span>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)" }}>{dayPart}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROUTES.map((route) => {
                  // Calculate min/max for THIS route to normalize colors over the VISIBLE range
                  const prices = visibleDates.map(d => data[route][d]);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);

                  return (
                    <tr key={route}>
                      <td style={{ padding: "12px 10px", position: "sticky", left: 0, backgroundColor: "#fff", zIndex: 10, borderRight: "2px solid rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                          <Plane size={16} style={{ color: "#64748b" }} />
                          {route}
                        </div>
                      </td>
                      {visibleDates.map(dateStr => {
                        const price = data[route][dateStr];
                        const { bg, text } = getCellStyles(price, min, max);
                        
                        const isCheapest = price === min;
                        const isMostExpensive = price === max;
                        
                        // Accessibility: Lowest gets Green Ring, Highest gets Red Ring
                        let boxShadow = "inset 0 0 0 1px rgba(0,0,0,0.05)";
                        if (isCheapest) {
                          boxShadow = "inset 0 0 0 2px #fff, 0 0 0 2px #10b981"; // Green ring
                        } else if (isMostExpensive) {
                          boxShadow = "inset 0 0 0 2px #fff, 0 0 0 2px #f43f5e"; // Red ring
                        }
                        
                        return (
                          <td key={`${route}-${dateStr}`} style={{ padding: "0" }}>
                            <div 
                              style={{ 
                                background: bg,
                                color: text,
                                margin: "2px",
                                padding: "12px 8px",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                cursor: "pointer",
                                boxShadow: boxShadow,
                                position: "relative"
                              }}
                              className="hover:scale-[1.1] hover:shadow-lg hover:z-20 relative group"
                            >
                              ₹{price.toLocaleString()}
                              {/* Custom Tooltip */}
                              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30 pointer-events-none">
                                {route} on {dateStr}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="glass-card flex gap-5 items-center" style={{ padding: "1.5rem 2rem" }}>
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingDown size={28} className="text-emerald-600" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: "0.35rem" }}>Identify Price Drops</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              The matrix highlights the absolute lowest fare detected for a specific route with a bold <span className="font-bold text-emerald-600">green ring</span>, making it instantly recognizable even for colorblind users.
            </p>
          </div>
        </div>
        
        <div className="glass-card flex gap-5 items-center" style={{ padding: "1.5rem 2rem" }}>
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp size={28} className="text-rose-600" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: "0.35rem" }}>Avoid Surge Pricing</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              The highest surge prices are marked with a <span className="font-bold text-rose-600">red ring</span>. These commonly fall on weekends and festivals, indicating low elasticity.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
