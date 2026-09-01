import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const MOCK_HISTORY = Array.from({length:14},(_,i)=>({
  date: new Date(1735689600000-(13-i)*86400000).toISOString().split("T")[0],
  live: Math.round(80+((i * 17) % 100) / 100*120),
  reconstructed: Math.round(600+((i * 17) % 100) / 100*200),
  confidence: Math.round(85+((i * 17) % 100) / 100*15),
}));

export default function QualityPage() {
  const latest = MOCK_HISTORY[MOCK_HISTORY.length-1];
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Data Quality Monitor</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Coverage, confidence, and provenance transparency
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1.25rem",marginBottom:"2rem"}}>
        {[
          {label:"Confidence",value: `${latest.confidence}%`,color:"var(--accent-emerald)"},
          {label:"Live Observations",value:latest.live.toString(),color:"var(--accent-cyan)"},
          {label:"Reconstructed",value:latest.reconstructed.toString(),color:"var(--accent-violet)"},
          {label:"Total Today",value:(latest.live+latest.reconstructed).toString(),color:"var(--accent-blue)"},
        ].map(s=>(
          <div key={s.label} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"0.7rem",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:"0.5rem"}}>{s.label}</div>
            <div style={{fontSize:"2rem",fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="glass-card">
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>Provenance Mix Over Time</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={MOCK_HISTORY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>v?.slice(5)||""}/>
            <YAxis tick={{fill:"#64748b",fontSize:11}}/>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
            <Legend/>
            <Bar dataKey="live" stackId="a" fill="#06b6d4" radius={[0,0,0,0]} name="Live Scrape"/>
            <Bar dataKey="reconstructed" stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} name="Reconstructed"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
