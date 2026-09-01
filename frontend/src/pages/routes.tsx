import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = [
  "DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL",
  "DEL-HYD","BOM-CCU","BOM-HYD","DEL-PNQ","DEL-AMD","DEL-GOI",
  "BLR-CCU","DEL-MAA","BOM-MAA","BOM-GOI","DEL-LKO","DEL-JAI",
  "DEL-PAT","DEL-GAU","DEL-SXR","BOM-PNQ",
];

const mockHistory = (base: number) => Array.from({length: 30}, (_, i) => ({
  date: new Date(1735689600000 - (29-i)*86400000).toISOString().split("T")[0],
  value: base + Math.sin(i/5)*10 + ((i * 17) % 100) / 100*8,
  fare: 3000 + base*30 + ((i * 17) % 100) / 100*500,
}));

export default function RoutesPage() {
  const [selected, setSelected] = useState("DEL-BOM");
  const data = mockHistory(ROUTES.indexOf(selected)*0.5 + 3);
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Route Explorer <InfoTooltip text="Deep dive into specific origin-destination pairs to analyze carrier competition." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Per-route index values and fare trends across 22 domestic routes
      </p>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"2rem"}}>
        {ROUTES.map(r=>(
          <button key={r} onClick={()=>setSelected(r)} style={{
            padding:"0.5rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:600,
            background: r===selected ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "rgba(255,255,255,0.04)",
            border: r===selected ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: r===selected ? "#fff" : "var(--text-secondary)",
            cursor:"pointer",transition:"all 0.2s",
          }}>
            <Plane size={12} style={{display:"inline",marginRight:4}} />{r}
          </button>
        ))}
      </div>
      <div className="glass-card" style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{selected} Index Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>v?.slice(5)||""}/>
            <YAxis tick={{fill:"#64748b",fontSize:11}}/>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
            <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} fill="url(#rg)" dot={false} name="Index"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
