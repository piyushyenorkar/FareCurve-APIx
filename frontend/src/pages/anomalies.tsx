import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { AlertCircle, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { ChartAIButton } from "../components/ChartAIButton";
import { formatDate } from "../lib/formatDate";

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

const TOOLTIPS: Record<string,string> = {
  "GENUINE_SURGE": "Spike corroborated by multiple independent sources.",
  "DATA_ERROR": "Single source sharply disagrees with all peers.",
  "SEASONAL_SPIKE": "Known festival or holiday demand surge.",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <h1 style={{fontSize:"1.75rem",fontWeight:800, margin: 0}}>
          <span className="gradient-text">Anomaly Detection <InfoTooltip text="Z-score based outlier detection (threshold: 2.5σ). Anomalies are classified as Genuine Surge (multi-source corroboration), Data Error (single source), or Seasonal Spike (festival window)." /></span>
        </h1>
        <ChartAIButton contextQuery="Analyze the latest pricing anomalies, z-scores, and spike classifications." />
      </div>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Automated fare spike detection with cross-source corroboration — live from the pipeline
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
        {Object.entries(CLASS_LABELS).map(([key,label])=>(
          <div key={key} className="glass-card" style={{textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",fontWeight:800,color:CLASS_COLORS[key]}}>{counts[key] || 0}</div>
            <div style={{fontSize:"0.8rem",color:"var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem"}}>
              {label}
              <InfoTooltip text={TOOLTIPS[key]} />
            </div>
          </div>
        ))}
      </div>
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
                  <td>{formatDate(a.date)}</td>
                  <td style={{fontWeight:700}}>₹{a.fare?.toLocaleString()}</td>
                  <td>₹{a.mean_fare?.toLocaleString()}</td>
                  <td style={{color:CLASS_COLORS[a.classification]||"#64748b",fontWeight:700}}>{a.z_score?.toFixed(2)}</td>
                  <td><span style={{display:"inline-block",padding:"2px 10px",borderRadius:999,fontSize:"0.75rem",fontWeight:700,background:`${CLASS_COLORS[a.classification]||"#64748b"}15`,color:CLASS_COLORS[a.classification]||"#64748b"}}>{CLASS_LABELS[a.classification]||a.classification}</span></td>
                  <td style={{fontSize:"0.8rem",color:"var(--text-secondary)"}}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {(() => {
                        const s = (a.source || a.carrier)?.toLowerCase() || "";
                        let url = "";
                        if (s.includes("yatra")) url = "https://www.google.com/s2/favicons?domain=yatra.com&sz=64";
                        else if (s.includes("makemytrip")) url = "https://www.google.com/s2/favicons?domain=makemytrip.com&sz=64";
                        else if (s.includes("easemytrip")) url = "https://www.google.com/s2/favicons?domain=easemytrip.com&sz=64";
                        else if (s.includes("cleartrip")) url = "https://www.google.com/s2/favicons?domain=cleartrip.com&sz=64";
                        else if (s.includes("ixigo")) url = "https://www.google.com/s2/favicons?domain=ixigo.com&sz=64";
                        else if (s.includes("goibibo")) url = "https://www.google.com/s2/favicons?domain=goibibo.com&sz=64";
                        else if (s.includes("indigo") || s === "6e") url = "https://images.kiwi.com/airlines/32/6E.png";
                        else if ((s.includes("airindia") && !s.includes("express")) || s === "ai") url = "https://images.kiwi.com/airlines/32/AI.png";
                        else if (s.includes("spicejet") || s === "sg") url = "https://images.kiwi.com/airlines/32/SG.png";
                        else if (s.includes("akasa") || s === "qp") url = "https://images.kiwi.com/airlines/32/QP.png";
                        else if (s.includes("airindiaexpress") || s.includes("express") || s === "ix") url = "https://images.kiwi.com/airlines/32/IX.png";
                        else if (s.includes("vistara") || s === "uk") url = "https://images.kiwi.com/airlines/32/UK.png";
                        
                        return url ? <img src={url} alt={s} style={{ width: 16, height: 16, objectFit: "contain", borderRadius: 4 }} /> : null;
                      })()}
                      <span style={{ textTransform: "capitalize", fontWeight: 600, color: "#1e293b" }}>{a.source || a.carrier}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
