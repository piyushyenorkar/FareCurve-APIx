import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { TimeFilter } from "../components/TimeFilter";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU","DEL-PNQ","DEL-AMD","BOM-GOI","DEL-GOI","DEL-LKO","DEL-SXR","DEL-JAI","DEL-MAA"];
const COLORS = ["#3b82f6","#8b5cf6","#f43f5e","#f97316","#10b981","#06b6d4","#eab308","#6366f1"];

export default function RoutesPage() {
  const [selected, setSelected] = useState("DEL-BOM");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>('7D');

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

  let chartData = history;
  if (timeFilter === '7D') chartData = history.slice(-3);
  else if (timeFilter === '30D') chartData = history.slice(-6);

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Route Explorer <InfoTooltip text="Per-route price index (Laspeyres weighted relative, base=100). Each route's index shows how current fares compare to the base period average." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Track individual route indices — live from the database
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <h2 style={{fontSize:"1.1rem",fontWeight:700}}>{selected} — Index Trend</h2>
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
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>No historical data for this route.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
