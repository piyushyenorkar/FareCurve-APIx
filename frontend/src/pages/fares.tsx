import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Plane } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

const ROUTES = ["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU","BLR-HYD","MAA-DEL","DEL-HYD","BOM-CCU"];

const CARRIER_MAP: Record<string, string> = {
  "6E": "IndiGo",
  "UK": "Vistara",
  "AI": "Air India",
  "IX": "AI Express",
  "SG": "SpiceJet",
  "QP": "Akasa Air",
  "I5": "AIX Connect",
  "XX": "Vistara"
};

export default function FaresPage() {
  const [route, setRoute] = useState("DEL-BOM");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.fareBreakdown(route).then((data: any) => {
      if (data && data.carriers) {
        setCarriers(data.carriers.map((c: any) => ({
          carrier: c.carrier || "Unknown",
          name: c.carrier || "Unknown",
          base: c.avg_base_fare || 0,
          taxes: c.avg_taxes || 0,
          fees: c.avg_convenience_fee || 0,
          total: c.avg_total_fare || 0,
          count: c.observations || 0,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [route]);

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Fare Transparency <InfoTooltip text="Airlines dynamically price the Base Fare while Taxes and Convenience Fees remain largely static. This breakdown comes from real scraped data." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Base fare vs taxes vs convenience fees per carrier — live breakdown
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

        <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>{route} Fare Breakdown by Carrier</h2>
        {loading ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>Loading fare data...</div>
        ) : carriers.length === 0 ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>No fare data available for this route yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={carriers} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
              <XAxis dataKey="carrier" tick={{fill:"#64748b",fontSize:12}} tickFormatter={(val) => CARRIER_MAP[val] ? `${CARRIER_MAP[val]} (${val})` : val}/>
              <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>"₹"+v}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v:any,n:any)=>["₹"+Number(v).toLocaleString(),n]}/>
              <Legend/>
              <Bar dataKey="base" stackId="a" fill="#3b82f6" name="Base Fare" radius={[0,0,0,0]}/>
              <Bar dataKey="taxes" stackId="a" fill="#f59e0b" name="Taxes & Charges"/>
              <Bar dataKey="fees" stackId="a" fill="#f43f5e" name="Convenience Fee" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {carriers.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(carriers.length,5)},1fr)`,gap:"1rem"}}>
          {carriers.map(c=>(
            <div key={c.carrier} className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"1.5rem",fontWeight:900,color:"#3b82f6",marginBottom:"0.25rem"}}>{c.carrier}</div>
              <div style={{fontSize:"1.25rem",fontWeight:700}}>₹{c.total?.toLocaleString()}</div>
              <div style={{fontSize:"0.7rem",color:"var(--text-muted)"}}>{c.count} observations</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
