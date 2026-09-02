import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU"];

export default function ForecastPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = route.split("-");
    api.forecast(origin, dest, 15).then((d: any) => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setLoading(false);
    });
  }, [route]);

  const signal = data?.buy_or_wait || "insufficient_data";
  const signalColor = signal === "BUY_NOW" ? "#f43f5e" : signal === "WAIT" ? "#10b981" : "#6366f1";
  const signalLabel = signal === "BUY_NOW" ? "Buy Now" : signal === "WAIT" ? "Wait" : "Neutral";

  const chartData = data?.forecast?.map((f: any) => ({
    date: f.date.slice(5),
    predicted_fare: f.predicted_fare,
  })) || [];

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Fare Forecast <InfoTooltip text="Holt-Winters exponential smoothing model predicts fare direction for the next 7 days. The Buy/Wait signal triggers when predicted change exceeds ±3%." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Holt-Winters exponential smoothing — 7-day price prediction from live data
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

        {loading ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>Loading forecast...</div>
        ) : !data || data.method === "insufficient_data" ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>
            Insufficient historical data for forecasting. Need at least 7 days of pipeline runs.
          </div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
              <div className="glass-card" style={{textAlign:"center",border:`2px solid ${signalColor}20`}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Signal</div>
                <div style={{fontSize:"1.5rem",fontWeight:900,color:signalColor}}>{signalLabel}</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Current Avg</div>
                <div style={{fontSize:"1.5rem",fontWeight:900}}>₹{data.current_avg?.toLocaleString() || "—"}</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Method</div>
                <div style={{fontSize:"1rem",fontWeight:700,color:"var(--accent-blue)"}}>{data.method?.replace(/_/g," ")}</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Window</div>
                <div style={{fontSize:"1rem",fontWeight:700}}>{data.booking_window}</div>
              </div>
            </div>
            {data.signal_reason && (
              <p style={{fontSize:"0.85rem",color:signalColor,fontWeight:600,marginBottom:"1rem",textAlign:"center"}}>{data.signal_reason}</p>
            )}
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}}/>
                  <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v.toLocaleString()} domain={["auto","auto"]}/>
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v:any)=>["₹"+Number(v).toLocaleString(),"Predicted"]}/>
                  {data.current_avg && <ReferenceLine y={data.current_avg} stroke="#94a3b8" strokeDasharray="4 4" label={{value:"Current",fill:"#94a3b8",fontSize:11}}/>}
                  <Line type="monotone" dataKey="predicted_fare" stroke={signalColor} strokeWidth={3} dot={{r:4,fill:signalColor}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
