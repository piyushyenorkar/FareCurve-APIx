import { AlertTriangle, CheckCircle, Calendar } from "lucide-react";

const MOCK = [
  {route:"DEL-BOM",window:"T+1",date:"2026-08-28",fare:12500,mean_fare:5500,z_score:3.8,pct:127,classification:"GENUINE_SURGE",source:"yatra",carrier:"6E",explanation:"Confirmed fare surge on DEL-BOM: 6E fares 127% above average, corroborated by 3 sources."},
  {route:"BLR-HYD",window:"T+7",date:"2026-08-30",fare:8200,mean_fare:3200,z_score:4.1,pct:156,classification:"SEASONAL_SPIKE",source:"akasa",carrier:"QP",explanation:"Seasonal fare increase during Ganesh Chaturthi travel period."},
  {route:"DEL-CCU",window:"T+15",date:"2026-08-25",fare:14000,mean_fare:5800,z_score:3.2,pct:141,classification:"DATA_ERROR",source:"spicejet",carrier:"SG",explanation:"Single source anomaly, not confirmed by others. Flagged for review."},
  {route:"BOM-GOI",window:"T+1",date:"2026-08-31",fare:9500,mean_fare:3500,z_score:5.1,pct:171,classification:"GENUINE_SURGE",source:"yatra",carrier:"AI",explanation:"Weekend surge on leisure route, corroborated by 4 sources."},
  {route:"DEL-SXR",window:"T+7",date:"2026-08-29",fare:11000,mean_fare:4200,z_score:4.5,pct:162,classification:"SEASONAL_SPIKE",source:"airindia",carrier:"AI",explanation:"Peak tourism season fare increase for Kashmir route."},
];

const classColors: Record<string,{bg:string,text:string,label:string}> = {
  GENUINE_SURGE: {bg:"rgba(244,63,94,0.12)",text:"#fb7185",label:"Genuine Surge"},
  SEASONAL_SPIKE: {bg:"rgba(245,158,11,0.12)",text:"#fbbf24",label:"Seasonal"},
  DATA_ERROR: {bg:"rgba(139,92,246,0.12)",text:"#a78bfa",label:"Data Error"},
};

export default function AnomaliesPage() {
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Anomaly Detection</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        Surge classification: Genuine (2+ source corroboration) vs Data Error vs Seasonal
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
        {Object.entries(classColors).map(([k,v])=>{
          const count = MOCK.filter(m=>m.classification===k).length;
          return (
            <div key={k} className="glass-card" style={{textAlign:"center"}}>
              <div style={{fontSize:"2rem",fontWeight:800,color:v.text}}>{count}</div>
              <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>{v.label}</div>
            </div>
          );
        })}
      </div>
      <div className="glass-card">
        <table className="data-table">
          <thead><tr>
            <th>Route</th><th>Date</th><th>Window</th><th>Fare</th><th>Mean</th><th>Z-Score</th><th>Class</th><th>Source</th>
          </tr></thead>
          <tbody>
            {MOCK.map((a,i)=>{
              const cc = classColors[a.classification] || classColors.DATA_ERROR;
              return (
                <tr key={i}>
                  <td style={{fontWeight:700}}>{a.route}</td>
                  <td>{a.date}</td>
                  <td>{a.window}</td>
                  <td style={{color:"var(--accent-rose)",fontWeight:700}}>₹{a.fare.toLocaleString()}</td>
                  <td>₹{a.mean_fare.toLocaleString()}</td>
                  <td style={{fontWeight:700}}>{a.z_score.toFixed(1)}σ</td>
                  <td><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{background:cc.bg,color:cc.text}}>{cc.label}</span></td>
                  <td>{a.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
