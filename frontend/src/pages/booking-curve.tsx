import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU"];
const COLORS = ["#f43f5e","#f97316","#eab308","#10b981","#06b6d4"];
const LABELS: Record<string,string> = {"T+1":"Last minute","T+7":"1 week","T+15":"2 weeks","T+30":"1 month","T+45":"45 days"};

export default function BookingCurvePage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [curve, setCurve] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("");

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = route.split("-");
    api.bookingCurve(origin, dest).then((data: any) => {
      if (data && data.curve) {
        setCurve(data.curve.map((c: any) => ({
          ...c,
          label: LABELS[c.window] || c.window,
        })));
        setPeriod(data.period || "");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [route]);

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Booking Curve Analysis <InfoTooltip text="Compares average fares at different booking windows (days before travel). T+1 = last-minute, T+45 = 45 days ahead. Data from the live pipeline." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        How fares change based on when you book — live data from the pipeline
      </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"2rem"}}>
        {ROUTES.map(r=>(
          <button key={r} onClick={()=>setRoute(r)} style={{
            padding:"0.5rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:600,
            background: r===route ? "linear-gradient(135deg,#3b82f6,#06b6d4)" : "rgba(255,255,255,0.04)",
            border: r===route ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: r===route ? "#fff" : "var(--text-secondary)",
            cursor:"pointer",transition:"all 0.2s",
          }}>
            <Plane size={12} style={{display:"inline",marginRight:4}} />{r}
          </button>
        ))}
      </div>
      <div className="glass-card" style={{marginBottom:"1.5rem"}}>

        {period && <p style={{fontSize:"0.75rem",color:"var(--text-muted)",marginBottom:"1rem"}}>Period: {period}</p>}
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{route} Fare by Booking Window</h2>
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4 mt-4 w-full">
            <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
            <div className="flex gap-4 mt-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-100 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : curve.length === 0 ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>No data available for this route yet. Run the pipeline first.</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={curve} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
              <XAxis dataKey="window" tick={{fill:"#64748b",fontSize:12}}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v.toLocaleString()}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} formatter={(v:any,n:any)=>["₹"+Number(v).toLocaleString(),n]}/>
              <Bar dataKey="avg_fare" name="Avg Fare" radius={[8,8,0,0]}>
                {curve.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {curve.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:`repeat(${curve.length},1fr)`,gap:"1rem"}}>
          {curve.map((c,i)=>(
            <div key={c.window} className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)",marginBottom:"0.5rem"}}>{c.label || c.window}</div>
              <div style={{fontSize:"1.5rem",fontWeight:900,color:COLORS[i % COLORS.length]}}>₹{Number(c.avg_fare).toLocaleString()}</div>
              <div style={{fontSize:"0.7rem",color:"var(--text-muted)",marginTop:"0.25rem"}}>{c.window} • {c.observations || 0} obs</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
