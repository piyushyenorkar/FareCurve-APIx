import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus, Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL"];

export default function ForecastPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [histData, setHistData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [signalData, setSignalData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = route.split("-");
    
    api.forecast(origin, dest, 15).then((fcst: any) => {
      if (fcst) {
        setSignalData(fcst);
        
        if (Array.isArray(fcst.history)) {
          const recentHist = fcst.history.map((d: any) => ({
            date: d.date?.slice(5) || d.date,
            actual: d.actual,
            type: "actual"
          }));
          setHistData(recentHist);
        }
        
        if (Array.isArray(fcst.forecast)) {
          setForecastData(fcst.forecast.map((d: any) => ({
            date: d.date?.slice(5) || d.date,
            predicted: d.predicted_fare,
            type: "forecast"
          })));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [route]);

  const signal = signalData.buy_or_wait || "NEUTRAL";
  const current = signalData.current_avg || 0;
  
  // Combine for charting exactly like old mock did
  let combined: any[] = [];
  if (histData.length > 0) {
    const lastHist = histData[histData.length - 1];
    // Attach predicted = actual for the connection point
    const histPoints = histData.map((h, i) => ({...h, predicted: i === histData.length - 1 ? h.actual : null}));
    const fcstPoints = forecastData.map(f => ({...f, actual: null}));
    combined = [...histPoints, ...fcstPoints];
  }

  const signalColors: Record<string,{bg:string,text:string,icon:any}> = {
    BUY_NOW: {bg:"rgba(244,63,94,0.15)",text:"#fb7185",icon:TrendingUp},
    WAIT: {bg:"rgba(16,185,129,0.15)",text:"#34d399",icon:TrendingDown},
    NEUTRAL: {bg:"rgba(245,158,11,0.15)",text:"#fbbf24",icon:Minus},
    insufficient_data: {bg:"rgba(245,158,11,0.15)",text:"#fbbf24",icon:Minus},
  };
  const sc = signalColors[signal] || signalColors.NEUTRAL;
  const SignalIcon = sc.icon;

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Price Forecast & Buy/Wait Signal <InfoTooltip text="Algorithmic recommendation on whether to purchase now or wait for a price drop." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Holt-Winters exponential smoothing <InfoTooltip text="A time-series forecasting algorithm that accounts for trends and seasonality." /> with 7-day horizon
      </p>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"2rem",flexWrap:"wrap"}}>
        {ROUTES.map(r=>(
          <button key={r} onClick={()=>setRoute(r)} style={{
            padding:"0.5rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:600,
            background:r===route?"linear-gradient(135deg,#3b82f6,#06b6d4)":"rgba(255,255,255,0.04)",
            border:r===route?"none":"1px solid rgba(255,255,255,0.08)",
            color:r===route?"#fff":"var(--text-secondary)",cursor:"pointer",transition:"all 0.2s"
          }}>
            <Plane size={12} style={{display:"inline",marginRight:4}} />{r}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:"1.5rem",marginBottom:"2rem"}}>
        <div className="glass-card">
          <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{route} — Actual vs Predicted</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
              {histData.length > 0 && <ReferenceLine x={histData[histData.length-1].date} stroke="#94a3b8" strokeDasharray="5 5" label={{value:"Today",fill:"#64748b",fontSize:11}}/>}
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Actual"/>
              <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 4" dot={false} name="Predicted"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
          <div style={{fontSize:"0.75rem",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:"1rem"}}>Buy or Wait</div>
          <div style={{
            width:100,height:100,borderRadius:"50%",
            background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",
            marginBottom:"1rem",
          }}>
            <SignalIcon size={40} color={sc.text}/>
          </div>
          <div style={{fontSize:"1.25rem",fontWeight:800,color:sc.text}}>{signal.replace("_"," ")}</div>
          <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.5rem"}}>
            Current: ₹{current.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
        </div>
      </div>
    </div>
  );
}
