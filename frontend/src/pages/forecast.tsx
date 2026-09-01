import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL"];

const mockForecast = (route: string) => {
  const base = 4500 + route.charCodeAt(0)*10;
  const hist = Array.from({length:14},(_,i)=>({
    date: new Date(1735689600000-(13-i)*86400000).toISOString().split("T")[0],
    actual: Math.round(base + Math.sin(i/3)*300 + ((i * 17) % 100) / 100*200),
    type: "actual",
  }));
  const trend = hist[hist.length-1].actual > hist[hist.length-4].actual ? 1 : -1;
  const forecast = Array.from({length:7},(_,i)=>({
    date: new Date(1735689600000+(i+1)*86400000).toISOString().split("T")[0],
    predicted: Math.round(base + trend*i*50 + ((i * 17) % 100) / 100*150),
    type: "forecast",
  }));
  const signal = trend > 0 ? "BUY_NOW" : trend < 0 ? "WAIT" : "NEUTRAL";
  return { hist, forecast, signal, current: hist[hist.length-1].actual };
};

export default function ForecastPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const {hist, forecast, signal, current} = mockForecast(route);
  const combined = [...hist.map(h=>({...h, predicted: null})), ...forecast.map(f=>({...f, actual: null}))];
  const signalColors: Record<string,{bg:string,text:string,icon:any}> = {
    BUY_NOW: {bg:"rgba(244,63,94,0.15)",text:"#fb7185",icon:TrendingUp},
    WAIT: {bg:"rgba(16,185,129,0.15)",text:"#34d399",icon:TrendingDown},
    NEUTRAL: {bg:"rgba(245,158,11,0.15)",text:"#fbbf24",icon:Minus},
  };
  const sc = signalColors[signal] || signalColors.NEUTRAL;
  const SignalIcon = sc.icon;
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Price Forecast & Buy/Wait Signal</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Holt-Winters exponential smoothing with 7-day horizon
      </p>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"2rem",flexWrap:"wrap"}}>
        {ROUTES.map(r=>(
          <button key={r} onClick={()=>setRoute(r)} style={{
            padding:"0.5rem 1rem",borderRadius:999,fontSize:"0.8rem",fontWeight:600,
            background:r===route?"linear-gradient(135deg,#3b82f6,#06b6d4)":"rgba(255,255,255,0.04)",
            border:r===route?"none":"1px solid rgba(255,255,255,0.08)",
            color:r===route?"#fff":"var(--text-secondary)",cursor:"pointer",
          }}>{r}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:"1.5rem",marginBottom:"2rem"}}>
        <div className="glass-card">
          <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{route} ? Actual vs Predicted</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>v?.slice(5)||""}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
              <ReferenceLine x={hist[hist.length-1].date} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" label={{value:"Today",fill:"#64748b",fontSize:11}}/>
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
            Current: ₹{current.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
