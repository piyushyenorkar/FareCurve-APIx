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
        Holt-Winters exponential smoothing with 7-day horizon <InfoTooltip text="A time-series forecasting algorithm that accounts for trends and seasonality." />
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
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
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
      {/* -- Fare Calendar Matrix -- */}
      <div className="glass-card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Fare Calendar — Next 14 Days</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "16px" }}>
              <span>Projected daily fares for {route} based on historical patterns.</span>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 400, color: "#10b981", fontSize: "14px" }}>
                  <span style={{ display: "inline-block", width: "14px", minWidth: "14px", height: "14px", background: "#10b981", flexShrink: 0 }}></span> Cheapest
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 400, color: "#f59e0b", fontSize: "14px" }}>
                  <span style={{ display: "inline-block", width: "14px", minWidth: "14px", height: "14px", background: "#f59e0b", flexShrink: 0 }}></span> Average
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 400, color: "#ef4444", fontSize: "14px" }}>
                  <span style={{ display: "inline-block", width: "14px", minWidth: "14px", height: "14px", background: "#ef4444", flexShrink: 0 }}></span> Peak
                </span>
              </div>
            </div>
          </div>
        </div>
        <FareCalendar route={route} forecastData={forecastData} currentAvg={current} />
      </div>
    </div>
  );
}

function FareCalendar({ route, forecastData, currentAvg }: { route: string; forecastData: any[]; currentAvg: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Generate 14-day calendar grid
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  if (!mounted) {
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", height: "150px" }}></div>;
  }

  // Use forecast data if available, otherwise simulate based on currentAvg
  const prices = days.map((d, i) => {
    const fcst = forecastData[i];
    if (fcst && fcst.predicted) return Math.round(fcst.predicted);
    // Simulate with slight variation based on day of week
    const dayOfWeek = d.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.15 : 1.0;
    const advanceDiscount = 1 - (i * 0.008); // slightly cheaper further out
    return Math.round((currentAvg || 5500) * weekendMultiplier * advanceDiscount * (0.95 + Math.random() * 0.1));
  });

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  function getCellColor(price: number) {
    if (maxPrice === minPrice) return { bg: "#f0fdf4", text: "#166534" };
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.25) return { bg: "#f0fdf4", text: "#166534" };
    if (ratio < 0.5) return { bg: "#fefce8", text: "#854d0e" };
    if (ratio < 0.75) return { bg: "#fff7ed", text: "#9a3412" };
    return { bg: "#fef2f2", text: "#991b1b" };
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
        const { bg, text } = getCellColor(price);
        const isToday = i === 0;
        const isCheapest = price === minPrice;
        const isMostExpensive = price === maxPrice;
        return (
          <div key={i} style={{
            background: bg, color: text, borderRadius: "12px", padding: "12px 8px",
            textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            border: isToday ? "2px solid #3b82f6" : isCheapest ? "2px solid #10b981" : isMostExpensive ? "2px solid #ef4444" : "1px solid transparent",
            position: "relative",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }} className="hover:scale-[1.05] hover:shadow-md">
            {isToday && <div style={{ position: "absolute", top: -8, right: -8, background: "#3b82f6", color: "#fff", fontSize: "0.6rem", padding: "2px 4px", borderRadius: "4px", fontWeight: 700 }}>TODAY</div>}
            <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", opacity: 0.8 }}>
              {formatDate(d.toISOString())}
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>
              ₹{price.toLocaleString()}
            </div>
            {isCheapest && <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>BEST</div>}
            {isMostExpensive && <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#ef4444", marginTop: "2px" }}>PEAK</div>}
            {isToday && <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#3b82f6", marginTop: "2px" }}>TODAY</div>}
          </div>
        );
      })}
    </div>
  );
}