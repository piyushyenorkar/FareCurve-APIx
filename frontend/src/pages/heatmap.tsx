import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import dynamic from "next/dynamic";
import { InfoTooltip } from "../components/InfoTooltip";
import { TrendingUp, TrendingDown, Plane, MapPin } from "lucide-react";

// Leaflet must be loaded client-side only (no SSR)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });
const LeafletTooltip = dynamic(() => import("react-leaflet").then(m => m.Tooltip), { ssr: false });

// Major Indian airports with geographic coordinates
const AIRPORTS: Record<string, { lat: number; lng: number; city: string }> = {
  DEL: { lat: 28.5562, lng: 77.1000, city: "Delhi" },
  BOM: { lat: 19.0896, lng: 72.8656, city: "Mumbai" },
  BLR: { lat: 13.1986, lng: 77.7066, city: "Bengaluru" },
  HYD: { lat: 17.2403, lng: 78.4294, city: "Hyderabad" },
  CCU: { lat: 22.6520, lng: 88.4463, city: "Kolkata" },
  MAA: { lat: 12.9941, lng: 80.1709, city: "Chennai" },
  PNQ: { lat: 18.5822, lng: 73.9197, city: "Pune" },
  AMD: { lat: 23.0225, lng: 72.5714, city: "Ahmedabad" },
  GOI: { lat: 15.3808, lng: 73.8314, city: "Goa" },
  LKO: { lat: 26.7606, lng: 80.8893, city: "Lucknow" },
  SXR: { lat: 33.9871, lng: 74.7742, city: "Srinagar" },
  JAI: { lat: 26.8242, lng: 75.8122, city: "Jaipur" },
};

const ROUTE_WEIGHTS: Record<string, number> = {
  "DEL-BOM": 9, "BOM-BLR": 7, "DEL-BLR": 7, "DEL-CCU": 5, "BLR-HYD": 5, 
  "MAA-DEL": 5, "DEL-HYD": 5, "BOM-CCU": 4, "DEL-PNQ": 4, "DEL-AMD": 4,
  "BOM-GOI": 4, "DEL-GOI": 4, "DEL-LKO": 3, "DEL-SXR": 2, "DEL-JAI": 3, "DEL-MAA": 4
};

const ROUTE_BASKET = [
  "DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL",
  "DEL-HYD","BOM-CCU","DEL-PNQ","DEL-AMD","BOM-GOI","DEL-GOI",
  "DEL-LKO","DEL-SXR","DEL-JAI","DEL-MAA"
];

function getColor(index: number): string {
  if (index < 95) return "#10b981";
  if (index < 105) return "#3b82f6";
  if (index < 115) return "#f59e0b";
  if (index < 130) return "#f97316";
  return "#ef4444";
}

function getArcMidpoint(a: [number, number], b: [number, number], offset = 0.08): [number, number] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return mid;
  mid[0] += (-dx / len) * offset * len;
  mid[1] += (dy / len) * offset * len;
  return mid;
}

export default function HeatmapPage() {
  const [routeData, setRouteData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isBaseFare, setIsBaseFare] = useState(false);

  useEffect(() => {
    import("leaflet/dist/leaflet.css");
    Promise.all(
      ROUTE_BASKET.map(async (rk) => {
        const [o, d] = rk.split("-");
        try {
          const data = await api.indexRoute(o, d);
          const latest = Array.isArray(data) && data.length > 0 ? data[data.length - 1] : null;
          return { route: rk, value: latest?.value || null, mean_fare: latest?.mean_fare || null, observations: latest?.observations || 0 };
        } catch {
          return { route: rk, value: null, mean_fare: null, observations: 0 };
        }
      })
    ).then((results) => {
      const map: Record<string, any> = {};
      results.forEach((r) => { map[r.route] = r; });
      setRouteData(map);
      setLoading(false);
    });
  }, []);

  
  const displayData = useMemo(() => {
    const newData: Record<string, any> = {};
    for (const route of Object.keys(routeData)) {
      const data = routeData[route];
      newData[route] = {
        ...data,
        value: data.value ? (isBaseFare ? Number((data.value * 0.82).toFixed(1)) : data.value) : null,
        mean_fare: data.mean_fare ? (isBaseFare ? Math.round(data.mean_fare * 0.82) : data.mean_fare) : null
      };
    }
    return newData;
  }, [routeData, isBaseFare]);

  const stats = useMemo(() => {
    const values = Object.values(displayData).filter(r => r.value).map(r => r.value);
    if (values.length === 0) return { avg: "—", min: "—", max: "—", surge: 0, cheap: 0 };
    return {
      avg: (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1),
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      surge: values.filter((v: number) => v > 120).length,
      cheap: values.filter((v: number) => v < 100).length,
    };
  }, [displayData]);

  return (
    <div>
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            <span className="gradient-text">Sector Heatmap <InfoTooltip text="Geographic visualization of route-level price indices across India. Color shows how current fares compare to base period. Green = cheap, Red = surge." /></span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Live route indices overlaid on India's aviation network — powered by real pipeline data
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Analysis Mode</span>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
            <span className={`text-sm font-semibold transition-colors ${!isBaseFare ? 'text-blue-600' : 'text-gray-400'}`}>Gross Fare</span>
            <button 
              onClick={() => setIsBaseFare(!isBaseFare)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${!isBaseFare ? 'bg-blue-600' : 'bg-emerald-500'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isBaseFare ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-sm font-semibold transition-colors ${isBaseFare ? 'text-emerald-600' : 'text-gray-400'}`}>Base Fare Only</span>
          </div>
        </div>
      </div>


      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Avg Index", value: stats.avg, color: "#3b82f6" },
          { label: "Cheapest", value: stats.min, color: "#10b981" },
          { label: "Most Expensive", value: stats.max, color: "#ef4444" },
          { label: "Surge Routes", value: stats.surge, color: "#f97316" },
          { label: "Below Base", value: stats.cheap, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ textAlign: "center", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>{s.label}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: "0", overflow: "hidden", borderRadius: "16px", marginBottom: "1.5rem" }}>
        {loading ? (
          <div className="animate-pulse" style={{ height: "550px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.9rem", fontWeight: 600 }}>Loading route data...</div>
          </div>
        ) : (
          <div style={{ height: "550px", width: "100%" }}>
            <MapContainer
              center={[22.5, 79.5] as any}
              zoom={5}
              style={{ height: "100%", width: "100%", borderRadius: "16px" }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                
              />
              {ROUTE_BASKET.map((rk) => {
                const [o, d] = rk.split("-");
                const ao = AIRPORTS[o], ad = AIRPORTS[d];
                if (!ao || !ad) return null;
                const data = displayData[rk];
                const indexVal = data?.value || 100;
                const color = getColor(indexVal);
                const start: [number, number] = [ao.lat, ao.lng];
                const end: [number, number] = [ad.lat, ad.lng];
                const mid = getArcMidpoint(start, end, 0.15);
                return (
                  <Polyline
                    key={rk}
                    positions={[start, mid, end] as any}
                    pathOptions={{
                      color: data?.value ? color : "#cbd5e1",
                      weight: selectedRoute === rk ? 6 : 4,
                      opacity: selectedRoute && selectedRoute !== rk ? 0.2 : 0.8,
                      dashArray: !data?.value ? "10 10" : (ROUTE_WEIGHTS[rk] >= 7 ? undefined : (ROUTE_WEIGHTS[rk] >= 4 ? "8 6" : "2 6"))
                    }}
                    eventHandlers={{ click: () => setSelectedRoute(selectedRoute === rk ? null : rk) }}
                  >
                    <LeafletTooltip sticky>
                      <div style={{ fontFamily: "Inter, sans-serif", minWidth: "180px" }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "6px" }}>{rk}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                          <span style={{ color: "#64748b" }}>Index:</span>
                          <span style={{ fontWeight: 700, color }}>{indexVal.toFixed(1)}</span>
                        </div>
                        {data?.mean_fare && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                            <span style={{ color: "#64748b" }}>Mean Fare:</span>
                            <span style={{ fontWeight: 700 }}>₹{Math.round(data.mean_fare).toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#64748b" }}>Observations:</span>
                          <span style={{ fontWeight: 700 }}>{data?.observations || 0}</span>
                        </div>
                      </div>
                    </LeafletTooltip>
                  </Polyline>
                );
              })}
              {Object.entries(AIRPORTS).map(([code, ap]) => (
                <CircleMarker
                  key={code}
                  center={[ap.lat, ap.lng] as any}
                  radius={8}
                  pathOptions={{ fillColor: "#1e293b", fillOpacity: 0.9, color: "#ffffff", weight: 2 }}
                >
                  <LeafletTooltip permanent direction="top" offset={[0, -12] as any}>
                    <span style={{ fontWeight: 700, fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{code}</span>
                  </LeafletTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

            <div className="glass-card" style={{ padding: "1.25rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>Index Legend:</span>
            {[
              { label: "< 95 (Cheap)", color: "#10b981" },
              { label: "95-105 (Base)", color: "#3b82f6" },
              { label: "105-115 (Moderate)", color: "#f59e0b" },
              { label: "115-130 (High)", color: "#f97316" },
              { label: "> 130 (Surge)", color: "#ef4444" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 14, height: 4, borderRadius: 2, background: item.color }}></div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>DGCA Traffic Volume:</span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: "#94a3b8" }}></div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>High (e.g. DEL-BOM)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="4" strokeDasharray="8 6" /></svg>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Medium</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="4" strokeDasharray="2 6" /></svg>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Low (e.g. DEL-SXR)</span>
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Click a route · Gray = no data</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1.5rem" }}>
        {ROUTE_BASKET.map((rk) => {
          const data = displayData[rk];
          const val = data?.value || 0;
          const color = getColor(val);
          const isSelected = selectedRoute === rk;
          return (
            <div key={rk} onClick={() => setSelectedRoute(isSelected ? null : rk)} className="glass-card"
              style={{ padding: "1rem 1.25rem", cursor: "pointer", border: isSelected ? `2px solid ${color}` : "1px solid #e2e8f0", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{rk}</span>
                {val > 100 ? <TrendingUp size={16} style={{ color }} /> : <TrendingDown size={16} style={{ color }} />}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color }}>{val ? val.toFixed(1) : "—"}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                {data?.mean_fare ? `₹${Math.round(data.mean_fare).toLocaleString()} avg` : "Awaiting data"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
