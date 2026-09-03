import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { InfoTooltip } from "../components/InfoTooltip";

export default function QualityPage() {
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.qualityCurrent().catch(() => null),
      api.qualityHistory(30).catch(() => []),
    ]).then(([curr, hist]) => {
      if (curr) setCurrent(curr);
      if (Array.isArray(hist)) setHistory(hist);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Data Quality Monitor <InfoTooltip text="Tracks pipeline health: coverage (% of route×window cells filled), confidence score, and live vs reconstructed observation counts." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Pipeline coverage and confidence metrics — live from the database
      </p>
      {loading ? (
        <div className="glass-card animate-pulse flex flex-col gap-4 w-full">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="flex gap-4">
            <div className="h-24 bg-gray-100 rounded-xl w-full"></div>
            <div className="h-24 bg-gray-100 rounded-xl w-full"></div>
            <div className="h-24 bg-gray-100 rounded-xl w-full"></div>
          </div>
          <div className="h-[200px] bg-gray-50 rounded-xl w-full mt-4"></div>
        </div>
      ) : (
        <>
          {current && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Confidence</div>
                <div style={{fontSize:"2.5rem",fontWeight:900,color:"#10b981"}}>{current.confidence_pct?.toFixed(0) || 0}%</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Coverage</div>
                <div style={{fontSize:"2.5rem",fontWeight:900,color:"#3b82f6"}}>{current.coverage_pct?.toFixed(0) || 0}%</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Live Obs</div>
                <div style={{fontSize:"2rem",fontWeight:800}}>{current.observed_data_points || 0}</div>
              </div>
              <div className="glass-card" style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)"}}>Reconstructed</div>
                <div style={{fontSize:"2rem",fontWeight:800,color:"#8b5cf6"}}>{current.reconstructed_data_points || 0}</div>
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div className="glass-card">
              <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>Coverage Trend (30 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
                  <XAxis dataKey="log_date" tick={{fill:"#64748b",fontSize:10}} tickFormatter={(v:string)=>v.slice(5)}/>
                  <YAxis tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>v+"%"}/>
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v:any)=>[v+"%","Coverage"]}/>
                  <Bar dataKey="coverage_pct" fill="#3b82f6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
