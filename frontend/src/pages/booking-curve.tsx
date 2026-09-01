import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU"];
const COLORS = ["#f43f5e","#f97316","#eab308","#10b981","#06b6d4"];

const mockCurve = (base: number) => [
  {window:"T+1",days:1,avg_fare:Math.round(base*2.2),label:"Last minute"},
  {window:"T+7",days:7,avg_fare:Math.round(base*1.5),label:"1 week"},
  {window:"T+15",days:15,avg_fare:Math.round(base),label:"2 weeks"},
  {window:"T+30",days:30,avg_fare:Math.round(base*0.85),label:"1 month"},
  {window:"T+45",days:45,avg_fare:Math.round(base*0.75),label:"45 days"},
];

export default function BookingCurvePage() {
  const [route, setRoute] = useState("DEL-BOM");
  const base = 5500 + ROUTES.indexOf(route)*200;
  const curve = mockCurve(base);
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Booking Curve Analysis</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        How fares change with booking advance: T+1 (last minute) to T+45 (early bird)
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
      <div className="glass-card" style={{marginBottom:"1.5rem"}}>
        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{route} Fare by Booking Window</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={curve} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="window" tick={{fill:"#94a3b8",fontSize:13,fontWeight:600}}/>
            <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v.toLocaleString()}/>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} formatter={(v:number)=>["₹"+v.toLocaleString(),"Avg Fare"]}/>
            <Bar dataKey="avg_fare" radius={[8,8,0,0]}>
              {curve.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"1rem"}}>
        {curve.map((c,i)=>(
          <div key={c.window} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"0.7rem",color:"var(--text-muted)",textTransform:"uppercase",fontWeight:600}}>{c.label}</div>
            <div style={{fontSize:"1.75rem",fontWeight:800,color:COLORS[i],margin:"0.5rem 0"}}>₹{c.avg_fare.toLocaleString()}</div>
            <div style={{fontSize:"0.75rem",color:"var(--text-secondary)"}}>{c.window}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
