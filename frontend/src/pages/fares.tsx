import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from "recharts";

const CARRIERS = [
  {carrier:"6E",name:"IndiGo",base:3800,taxes:720,fees:250,color:"#3b82f6"},
  {carrier:"AI",name:"Air India",base:4600,taxes:890,fees:0,color:"#f59e0b"},
  {carrier:"SG",name:"SpiceJet",base:3400,taxes:650,fees:200,color:"#f43f5e"},
  {carrier:"QP",name:"Akasa Air",base:3600,taxes:680,fees:150,color:"#8b5cf6"},
  {carrier:"IX",name:"AI Express",base:3100,taxes:600,fees:300,color:"#10b981"},
];

export default function FaresPage() {
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Fare Transparency</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Base fare vs taxes vs convenience fees per carrier ? full price breakdown
      </p>
      <div className="glass-card" style={{marginBottom:"2rem"}}>
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>DEL-BOM Fare Breakdown by Carrier</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={CARRIERS} barSize={50}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:12}}/>
            <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v}/>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} formatter={(v:any,n:any)=>["₹"+v.toLocaleString(),n]}/>
            <Legend/>
            <Bar dataKey="base" stackId="a" fill="#3b82f6" name="Base Fare" radius={[0,0,0,0]}/>
            <Bar dataKey="taxes" stackId="a" fill="#f59e0b" name="Taxes & Charges"/>
            <Bar dataKey="fees" stackId="a" fill="#f43f5e" name="Convenience Fee" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"1rem"}}>
        {CARRIERS.map(c=>(
          <div key={c.carrier} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"1.5rem",fontWeight:900,color:c.color,marginBottom:"0.25rem"}}>{c.carrier}</div>
            <div style={{fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:"0.75rem"}}>{c.name}</div>
            <div style={{fontSize:"1.25rem",fontWeight:700}}>₹{(c.base+c.taxes+c.fees).toLocaleString()}</div>
            <div style={{fontSize:"0.7rem",color:"var(--text-muted)"}}>Total avg fare</div>
          </div>
        ))}
      </div>
    </div>
  );
}
