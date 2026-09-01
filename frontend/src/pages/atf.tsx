import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { InfoTooltip } from "../components/InfoTooltip";

const MOCK = Array.from({length:12},(_,i)=>({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  apix: Math.round(95 + i*2.5 + Math.sin(i)*5),
  atf: Math.round(90 + i*3 + Math.cos(i)*4),
  cpi: Math.round(98 + i*1.5),
}));

export default function ATFPage() {
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">ATF & CPI Correlation <InfoTooltip text="Aviation Turbine Fuel. It accounts for ~40% of airline operating costs and heavily influences base fares." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Aviation Turbine Fuel price impact on airfares &bull; CPI item 294 comparison
      </p>
      <div className="glass-card" style={{marginBottom:"2rem"}}>
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>APIx vs ATF Price vs CPI Airfare (Item 294)</h2>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={MOCK}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="month" tick={{fill:"#94a3b8",fontSize:12}}/>
            <YAxis tick={{fill:"#64748b",fontSize:11}}/>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
            <Legend/>
            <Line type="monotone" dataKey="apix" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} name="APIx"/>
            <Line type="monotone" dataKey="atf" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 3" dot={{r:3}} name="ATF Index"/>
            <Line type="monotone" dataKey="cpi" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{r:3}} name="CPI Item 294"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
        {[
          {label:"Pearson r (APIx vs ATF)",value:"0.87",color:"var(--accent-blue)",desc:"Strong positive correlation"},
          {label:"Direction Agreement",value:"83%",color:"var(--accent-emerald)",desc:"APIx tracks ATF direction"},
          {label:"CPI Correlation",value:"0.72",color:"var(--accent-amber)",desc:"Moderate ? CPI is quarterly lag"},
        ].map(s=>(
          <div key={s.label} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"0.7rem",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:"0.5rem"}}>{s.label}</div>
            <div style={{fontSize:"2.25rem",fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:"0.75rem",color:"var(--text-secondary)",marginTop:"0.25rem"}}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
