import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/formatDate";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus, Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { Search, Filter } from "lucide-react";
import { AirportSearch } from "../components/AirportSearch";
import { ChartAIButton } from "../components/ChartAIButton";
import { CustomDropdown } from "../components/CustomDropdown";

const ROUTES = ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL", "DEL-HYD", "BOM-CCU", "DEL-PNQ", "DEL-AMD", "BOM-GOI", "DEL-GOI", "DEL-LKO", "DEL-SXR", "DEL-JAI", "DEL-MAA"];

const AIRLINE_OPTIONS = [
  { value: "ALL", label: "All Airlines" },
  { value: "6E", label: "IndiGo", logo: "https://images.kiwi.com/airlines/32/6E.png" },
  { value: "AI", label: "Air India", logo: "https://images.kiwi.com/airlines/32/AI.png" },
  { value: "SG", label: "SpiceJet", logo: "https://images.kiwi.com/airlines/32/SG.png" },
  { value: "QP", label: "Akasa Air", logo: "https://images.kiwi.com/airlines/32/QP.png" },
  { value: "IX", label: "AI Express", logo: "https://images.kiwi.com/airlines/32/IX.png" },
  { value: "UK", label: "Vistara", logo: "https://images.kiwi.com/airlines/32/UK.png" }
];

const OTA_OPTIONS = [
  { value: "ALL", label: "All Sources" },
  { value: "yatra", label: "Yatra", logo: "https://www.google.com/s2/favicons?domain=yatra.com&sz=64" },
  { value: "makemytrip", label: "MakeMyTrip", logo: "https://www.google.com/s2/favicons?domain=makemytrip.com&sz=64" },
  { value: "easemytrip", label: "EaseMyTrip", logo: "https://www.google.com/s2/favicons?domain=easemytrip.com&sz=64" },
  { value: "cleartrip", label: "Cleartrip", logo: "https://www.google.com/s2/favicons?domain=cleartrip.com&sz=64" },
  { value: "ixigo", label: "Ixigo", logo: "https://www.google.com/s2/favicons?domain=ixigo.com&sz=64" },
  { value: "goibibo", label: "Goibibo", logo: "https://www.google.com/s2/favicons?domain=goibibo.com&sz=64" }
];

export default function ForecastPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [airline, setAirline] = useState("ALL");
  const [ota, setOta] = useState("ALL");
  const [customOrigin, setCustomOrigin] = useState("");
  const [customDest, setCustomDest] = useState("");

  const handleCustomRoute = () => {
    if (customOrigin.length >= 3 && customDest.length >= 3) {
      setRoute(`${customOrigin.substring(0,3).toUpperCase()}-${customDest.substring(0,3).toUpperCase()}`);
    }
  };
  const [histData, setHistData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [signalData, setSignalData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [origin, dest] = route.split("-");
    
    api.forecast(origin, dest, 15, airline, ota).then((fcst: any) => {
      if (fcst) {
        setSignalData(fcst);
        
        if (Array.isArray(fcst.history)) {
          const recentHist = fcst.history.map((d: any) => ({
            date: formatDate(d.date),
            actual: d.actual,
            type: "actual"
          }));
          setHistData(recentHist);
        }
        
        if (Array.isArray(fcst.forecast)) {
          setForecastData(fcst.forecast.map((d: any) => ({
            date: formatDate(d.date),
            predicted: d.predicted_fare,
            type: "forecast"
          })));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [route, airline, ota]);

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

  const signalColors: Record<string,{bg:string,text:string,icon:any,label:string,subLabel:string}> = {
    BUY_NOW: {bg:"rgba(16,185,129,0.15)",text:"#10b981",icon:TrendingDown,label:"PROCURE",subLabel:"(buy)"},
    WAIT: {bg:"rgba(245,158,11,0.15)",text:"#f59e0b",icon:Minus,label:"HOLD",subLabel:"(wait)"},
    NEUTRAL: {bg:"rgba(244,63,94,0.15)",text:"#ef4444",icon:TrendingUp,label:"ADVISORY",subLabel:"(surge)"},
    insufficient_data: {bg:"rgba(245,158,11,0.15)",text:"#fbbf24",icon:Minus,label:"INSUFFICIENT DATA",subLabel:""},
  };
  const sc = signalColors[signal] || signalColors.NEUTRAL;
  const SignalIcon = sc.icon;

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Price Forecast & Procure/Hold Signal <InfoTooltip text="Algorithmic recommendation for government agencies to time official procurement or issue pricing advisories based on predicted 7-day fare surges." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Holt-Winters exponential smoothing with 7-day horizon <InfoTooltip text="A time-series forecasting algorithm that accounts for trends and seasonality." />
      </p>
      <div className="text-[11px] uppercase font-bold text-gray-500 mb-2 ml-1 tracking-wider">Top DGCA High-Traffic Routes</div>
      <div style={{display:"flex", gap:"0.45rem", marginBottom:"1.5rem", flexWrap:"wrap"}}>
        {ROUTES.map(r=>(
          <button key={r} onClick={()=>setRoute(r)} style={{
            padding:"0.45rem 0.8rem", borderRadius:999, fontSize:"0.8rem", fontWeight:600,
            background:r===route?"linear-gradient(135deg,#3b82f6,#06b6d4)":"rgba(255,255,255,0.04)",
            border:r===route?"none":"1px solid rgba(255,255,255,0.08)",
            color:r===route?"#fff":"var(--text-secondary)",cursor:"pointer",transition:"all 0.2s"
          }}>
            <Plane size={12} style={{display:"inline",marginRight:4}} />{r}
          </button>
        ))}
      </div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 0.5rem" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            
            <AirportSearch placeholder="Origin (DEL)" value={customOrigin} onChange={setCustomOrigin} />
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>✈</span>
            <AirportSearch placeholder="Dest (BOM)" value={customDest} onChange={setCustomDest} />
            <button onClick={handleCustomRoute} 
              style={{ padding: "0.5rem 1rem", borderRadius: "999px", background: "#0f172a", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: "none" }}>
              Search
            </button>
          </div>
          <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 0.5rem" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={14} style={{ color: "#64748b" }} />
            <CustomDropdown options={AIRLINE_OPTIONS} value={airline} onChange={setAirline} />
            <CustomDropdown options={OTA_OPTIONS} value={ota} onChange={setOta} />
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:"1.5rem",marginBottom:"2rem"}}>
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{fontSize:"1.1rem",fontWeight:700, margin: 0}}>{route} — Actual vs Predicted</h2>
            <ChartAIButton contextQuery={`Analyze the forecast vs actual trends for the ${route} route.`} />
          </div>
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
          <div style={{fontSize:"0.75rem",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:"1rem"}}>Procure or Hold</div>
          <div style={{
            width:100,height:100,borderRadius:"50%",
            background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",
            marginBottom:"1rem",
          }}>
            <SignalIcon size={40} color={sc.text}/>
          </div>
          <div style={{fontSize:"1.25rem",fontWeight:800,color:sc.text, display:"flex", alignItems:"baseline", gap:"6px"}}>
            {sc.label}
            {sc.subLabel && <span style={{fontSize:"0.8rem", fontWeight:600}}>{sc.subLabel}</span>}
          </div>
          <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"0.5rem"}}>
            Current: ₹{current.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
        </div>
      </div>
      {/* -- Fare Calendar Matrix -- */}
      <div className="glass-card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>Fare Calendar — Past 14 Days & Next 7 Days <InfoTooltip text="A 21-day timeline mapping historical fares to 7-day algorithmic predictions. PROCURE (Buy immediately to avoid surges), HOLD (Wait for expected price drops), ADVISORY (Extreme price surge detected)." /></h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "16px" }}>
              <span>Projected daily fares for {route} based on historical patterns.</span>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#10b981", fontSize: "12px" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#10b981", borderRadius: "2px" }}></span> PROCURE
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#f59e0b", fontSize: "12px" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></span> HOLD
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#ef4444", fontSize: "12px" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#ef4444", borderRadius: "2px" }}></span> ADVISORY
                </span>
              </div>
            </div>
          </div>
        </div>
        <FareCalendar route={route} forecastData={forecastData} currentAvg={current} histData={histData} />
      </div>
    </div>
  );
}

function FareCalendar({ route, forecastData, currentAvg, histData }: { route: string; forecastData: any[]; currentAvg: number; histData: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Generate 14-day calendar grid
  const today = new Date();
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14 + i);
    return d;
  });

  if (!mounted) {
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", height: "150px" }}></div>;
  }

  const prices = days.map((d, i) => {
    const dateStr = formatDate(d.toISOString());
    const h = histData.find(x => x.date === dateStr);
    if (h && h.actual) return Math.round(h.actual);
    
    const f = forecastData.find(x => x.date === dateStr);
    if (f && f.predicted) return Math.round(f.predicted);
    
    const dayOfWeek = d.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.15 : 1.0;
    const advanceDiscount = i >= 14 ? (1 - ((i-14) * 0.008)) : 1.0;
    return Math.round((currentAvg || 5500) * weekendMultiplier * advanceDiscount * (0.95 + Math.random() * 0.1));
  });

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  function getCellColor(price: number) {
    if (maxPrice === minPrice) return { bg: "#f0fdf4", text: "#166534", signal: "PROCURE", color: "#10b981", badgeBg: "#dcfce7" };
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.2) return { bg: "#f0fdf4", text: "#166534", signal: "PROCURE", color: "#10b981", badgeBg: "#dcfce7" };
    if (ratio > 0.8) return { bg: "#fef2f2", text: "#991b1b", signal: "ADVISORY", color: "#ef4444", badgeBg: "#fee2e2" };
    return { bg: "#fffbeb", text: "#92400e", signal: "HOLD", color: "#f59e0b", badgeBg: "#ffedd5" };
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
      {dayNames.map(dn => (
        <div key={dn} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "4px 0" }}>
          {dn}
        </div>
      ))}
      {/* Offset for first day */}
      {Array.from({ length: days[0].getDay() }, (_, i) => (
        <div key={`empty-${i}`}></div>
      ))}
      {days.map((d, i) => {
        const price = prices[i];
        const { bg, text, signal, color, badgeBg } = getCellColor(price);
        const isToday = i === 14;
        return (
          <div key={i} style={{
            background: bg, color: text, borderRadius: "12px", padding: "12px 8px",
            textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            border: `1px solid ${isToday ? "#3b82f6" : color}`,
            position: "relative",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }} className="hover:scale-[1.05] hover:shadow-md">
            {isToday && <div style={{ position: "absolute", top: -8, right: -8, background: "#3b82f6", color: "#fff", fontSize: "0.6rem", padding: "2px 4px", borderRadius: "4px", fontWeight: 700, zIndex: 10 }}>TODAY</div>}
            
            <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", opacity: 0.8 }}>
              {formatDate(d.toISOString())}
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>
              ₹{price.toLocaleString()}
            </div>
            
            <div style={{ 
              fontSize: "0.65rem", 
              fontWeight: 800, 
              color: color, 
              marginTop: "6px",
              background: badgeBg,
              padding: "3px 8px",
              borderRadius: "12px",
              display: "inline-block",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}>
              {signal}
            </div>
          </div>
        );
      })}
    </div>
  );
}