import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Plane, Search } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { AirportSearch } from "../components/AirportSearch";
import { ChartAIButton } from "../components/ChartAIButton";

import { CustomDropdown } from "../components/CustomDropdown";
const WINDOW_OPTIONS = [{value: "ALL", label: "All Booking Windows"}, {value: "T+1", label: "T+1 (Tomorrow)"}, {value: "T+3", label: "T+3 Days"}, {value: "T+7", label: "T+7 Days"}, {value: "T+15", label: "T+15 Days"}, {value: "T+30", label: "T+30 Days"}];
const ROUTES = ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL", "DEL-HYD", "BOM-CCU", "DEL-PNQ", "DEL-AMD", "BOM-GOI", "DEL-GOI", "DEL-LKO", "DEL-SXR", "DEL-JAI", "DEL-MAA"];

const CARRIER_MAP: Record<string, string> = {
  "6E": "IndiGo", "indigo": "IndiGo",
  "UK": "Vistara", "vistara": "Vistara",
  "AI": "Air India", "airindia": "Air India",
  "IX": "AI Express", "airindiaexpress": "AI Express",
  "SG": "SpiceJet", "spicejet": "SpiceJet",
  "QP": "Akasa Air", "akasa": "Akasa Air",
  "I5": "AIX Connect", "aixconnect": "AIX Connect",
  "XX": "Vistara",
  "MMT": "MakeMyTrip", "makemytrip": "MakeMyTrip",
  "GOIBIBO": "Goibibo", "goibibo": "Goibibo",
  "IXIGO": "Ixigo", "ixigo": "Ixigo",
  "EASEMYTRIP": "EaseMyTrip", "easemytrip": "EaseMyTrip",
  "CLEARTRIP": "Cleartrip", "cleartrip": "Cleartrip",
  "YATRA": "Yatra", "yatra": "Yatra",
  "PAYTM": "Paytm", "paytm": "Paytm"
};

// Returns a logo URL if available, else a generic placeholder or null
const getLogoUrl = (code: string) => {
  const c = code.toUpperCase();
  const iataMap: Record<string, string> = {
    "INDIGO": "6E", "AIRINDIA": "AI", "AIRINDIAEXPRESS": "IX", "SPICEJET": "SG", "AKASA": "QP", "AIXCONNECT": "I5", "VISTARA": "UK"
  };
  const iata = iataMap[c] || c;
  if (["6E", "UK", "AI", "IX", "SG", "QP", "I5"].includes(iata)) return `https://images.kiwi.com/airlines/32/${iata}.png`;
  if (c === "MMT" || c === "MAKEMYTRIP") return "https://imgak.mmtcdn.com/pwa_v3/pwa_hotel_assets/header/logo@2x.png";
  if (c === "GOIBIBO") return "https://jsak.goibibo.com/pwa_v3/pwa_hotel_assets/header/logo@2x.png"; // Mockish
  if (c === "IXIGO") return "https://www.ixigo.com/favicon.ico"; // Mockish
  if (c === "EASEMYTRIP") return "https://www.easemytrip.com/favicon.ico";
  if (c === "CLEARTRIP") return "https://www.cleartrip.com/favicon.ico";
  if (c === "YATRA") return "https://www.yatra.com/favicon.ico";
  return null;
};

// Custom tick component for XAxis to show logos
const CustomTick = (props: any) => {
  const { x, y, payload } = props;
  const logo = getLogoUrl(payload.value);
  const name = CARRIER_MAP[payload.value] || payload.value.charAt(0).toUpperCase() + payload.value.slice(1);

  return (
    <g transform={`translate(${x},${y})`}>
      {logo ? (
        <image
          href={logo}
          x={-12}
          y={4}
          height="16px"
          width="24px"
          style={{ objectFit: 'contain' }}
        />
      ) : null}
      <text
        x={0}
        y={logo ? 30 : 16}
        dy={0}
        textAnchor="middle"
        fill="#64748b"
        fontSize={10}
        fontWeight={600}
      >
        {name}
      </text>
    </g>
  );
};

export default function FaresPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [otas, setOtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"airline" | "ota">("airline");
  const [window, setWindow] = useState("ALL");

  const [customOrigin, setCustomOrigin] = useState("");
  const [customDest, setCustomDest] = useState("");

  useEffect(() => {
    setLoading(true);
    api.fareBreakdown(route, window).then((data: any) => {
      if (data) {
        if (data.carriers) {
          setCarriers(data.carriers.map((c: any) => ({
            carrier: c.carrier || "Unknown",
            base: c.avg_base_fare || 0,
            taxes: c.avg_taxes || 0,
            fees: c.avg_convenience_fee || 0,
            total: c.avg_total_fare || 0,
            count: c.observations || 0,
          })));
        }
        if (data.otas) {
          setOtas(data.otas.map((c: any) => ({
            carrier: c.carrier || "Unknown",
            base: c.avg_base_fare || 0,
            taxes: c.avg_taxes || 0,
            fees: c.avg_convenience_fee || 0,
            total: c.avg_total_fare || 0,
            count: c.observations || 0,
          })));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [route, window]);

  const handleCustomRoute = () => {
    if (customOrigin && customDest) setRoute(`${customOrigin}-${customDest}`);
  };

  const currentData = viewMode === "airline" ? carriers : otas;

  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
        <span className="gradient-text">Fare Transparency <InfoTooltip text="Airlines dynamically price the Base Fare while Taxes and Convenience Fees remain largely static. This breakdown comes from real scraped data." /></span>
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Base fare vs taxes vs convenience fees per carrier — live breakdown
      </p>

      {/* Origin Destination Search */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
        <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 0.5rem" }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Search size={14} style={{ color: "#64748b" }} />
          <AirportSearch placeholder="Origin (DEL)" value={customOrigin} onChange={setCustomOrigin} />
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>✈</span>
          <AirportSearch placeholder="Dest (BOM)" value={customDest} onChange={setCustomDest} />
          <button onClick={handleCustomRoute} 
            style={{ padding: "0.5rem 1rem", borderRadius: "999px", background: "#0f172a", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: "none" }}>
            Search
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CustomDropdown options={WINDOW_OPTIONS} value={window} onChange={setWindow} />
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{route} Fare Breakdown</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <ChartAIButton contextQuery={`Analyze the fare breakdown for the ${route} route.`} />
            <div style={{ display: "flex", gap: "0.25rem", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
            <button onClick={() => setViewMode("airline")} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: viewMode === "airline" ? "#fff" : "transparent",
              color: viewMode === "airline" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "airline" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>By Airline</button>
            <button onClick={() => setViewMode("ota")} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: viewMode === "ota" ? "#fff" : "transparent",
              color: viewMode === "ota" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "ota" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>By OTA</button>
            </div>
          </div>
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
        ) : currentData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No fare data available for this view.</div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={currentData} barSize={50} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="carrier" tick={<CustomTick />} tickMargin={10} interval={0} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => "₹" + v} />
              <Tooltip cursor={{fill: "transparent"}} contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} formatter={(v: any, n: any) => ["₹" + Number(v).toLocaleString(), n]} labelFormatter={(label) => CARRIER_MAP[label as string] || label} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                content={(props: any) => {
                  const { payload } = props;
                  return (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", justifyContent: "center", gap: "24px", paddingBottom: "12px" }}>
                      {payload.map((entry: any, index: number) => (
                        <li key={`item-${index}`} style={{ display: "flex", alignItems: "center", gap: "8px", color: entry.color, fontSize: "14px", fontWeight: 400 }}>
                          <span style={{ display: "inline-block", width: "14px", minWidth: "14px", height: "14px", backgroundColor: entry.color, flexShrink: 0 }}></span>
                          {entry.value}
                        </li>
                      ))}
                    </ul>
                  );
                }}
              />
              <Bar dataKey="base" stackId="a" fill="#3b82f6" name="Base Fare" radius={[0, 0, 0, 0]} legendType="square" />
              <Bar dataKey="taxes" stackId="a" fill="#f59e0b" name="Taxes & Charges" legendType="square" />
              <Bar dataKey="fees" stackId="a" fill="#f43f5e" name="Convenience Fee" radius={[4, 4, 0, 0]} legendType="square" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {currentData.length > 0 && !loading && (
        <div style={{ display: "flex", overflowX: "auto", paddingBottom: "1rem", gap: "1rem" }}>
          {currentData.map(c => {
            const logoUrl = getLogoUrl(c.carrier);
            return (
              <div key={c.carrier} className="glass-card" style={{ flexShrink: 0, minWidth: "140px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  {logoUrl && <img src={logoUrl} alt={c.carrier} style={{ height: "24px", maxWidth: "80px", objectFit: "contain" }} />}
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>{CARRIER_MAP[c.carrier] || c.carrier.charAt(0).toUpperCase() + c.carrier.slice(1)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#3b82f6" }}>₹{c.total?.toLocaleString()}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{c.count} observations</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


