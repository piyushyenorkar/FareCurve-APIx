import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU","DEL-PNQ","DEL-AMD","BOM-GOI","DEL-GOI","DEL-LKO","DEL-SXR","DEL-JAI","DEL-MAA"];
const COLORS = ["#3b82f6","#8b5cf6","#f43f5e","#f97316","#10b981","#06b6d4","#eab308","#6366f1"];

export default function RoutesPage() {
  const [selected, setSelected] = useState("DEL-BOM");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = selected.split("-");
    api.indexRoute(origin, dest).then((data: any) => {
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
  }, [selected]);

  const latest = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Route Explorer <InfoTooltip text="Per-route price index (Laspeyres weighted relative, base=100). Each route's index shows how current fares compare to the base period average." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Track individual route indices — live from the database
      </p>
      <div className="glass-card" style={{marginBottom:"1.5rem"}}>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1.5rem"}}>
          {ROUTES.map(r=>(
            <button key={r} onClick={()=>setSelected(r)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selected===r ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {r}
            </button>
          ))}
        </div>
        {latest && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
            <div className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Route Index</div>
              <div style={{fontSize:"2rem",fontWeight:900,color:"#3b82f6"}}>{latest.value?.toFixed(2) || "—"}</div>
            </div>
            <div className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Mean Fare</div>
              <div style={{fontSize:"1.5rem",fontWeight:800}}>₹{latest.mean_fare?.toLocaleString() || "—"}</div>
            </div>
            <div className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Observations</div>
              <div style={{fontSize:"1.5rem",fontWeight:800}}>{latest.observations || 0}</div>
            </div>
          </div>
        )}
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{selected} — Index Trend</h2>
        {loading ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>No historical data for this route.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} domain={["auto","auto"]}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v:any,n:any)=>[Number(v).toFixed(2),n]}/>
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
