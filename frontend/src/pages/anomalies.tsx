import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { InfoTooltip } from "../components/InfoTooltip";

const CLASS_COLORS: Record<string,string> = {
  "GENUINE_SURGE": "#f43f5e",
  "DATA_ERROR": "#f97316",
  "SEASONAL_SPIKE": "#eab308",
};
const CLASS_LABELS: Record<string,string> = {
  "GENUINE_SURGE": "Genuine Surge",
  "DATA_ERROR": "Data Error",
  "SEASONAL_SPIKE": "Seasonal Spike",
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.anomalies(100).then((data: any) => {
      if (Array.isArray(data)) setAnomalies(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const counts: Record<string,number> = {};
  for (const a of anomalies) {
    counts[a.classification] = (counts[a.classification] || 0) + 1;
  }

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Anomaly Detection <InfoTooltip text="Z-score based outlier detection (threshold: 2.5σ). Anomalies are classified as Genuine Surge (multi-source corroboration), Data Error (single source), or Seasonal Spike (festival window)." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Automated fare spike detection with cross-source corroboration — live from the pipeline
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
        {Object.entries(CLASS_LABELS).map(([key,label])=>(
          <div key={key} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",fontWeight:800,color:CLASS_COLORS[key]}}>{counts[key] || 0}</div>
            <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>{label}</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div className="glass-card" style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>Loading anomalies...</div>
      ) : anomalies.length === 0 ? (
        <div className="glass-card" style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>
          No anomalies detected in the current data window. This means fare data is clean and consistent across sources.
        </div>
      ) : (
        <div className="glass-card">
          <table className="data-table">
            <thead><tr>
              <th>Route</th><th>Window</th><th>Date</th><th>Fare</th><th>Mean</th><th>Z-Score</th><th>Type</th><th>Source</th>
            </tr></thead>
            <tbody>
              {anomalies.map((a,i)=>(
                <tr key={i}>
                  <td style={{fontWeight:700}}>{a.route}</td>
                  <td>{a.booking_window}</td>
                  <td>{a.date}</td>
                  <td style={{fontWeight:700}}>₹{a.fare?.toLocaleString()}</td>
                  <td>₹{a.mean_fare?.toLocaleString()}</td>
                  <td style={{color:CLASS_COLORS[a.classification]||"#64748b",fontWeight:700}}>{a.z_score?.toFixed(2)}</td>
                  <td><span style={{display:"inline-block",padding:"2px 10px",borderRadius:999,fontSize:"0.75rem",fontWeight:700,background:`${CLASS_COLORS[a.classification]||"#64748b"}15`,color:CLASS_COLORS[a.classification]||"#64748b"}}>{CLASS_LABELS[a.classification]||a.classification}</span></td>
                  <td style={{fontSize:"0.8rem",color:"var(--text-secondary)"}}>{a.source || a.carrier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
