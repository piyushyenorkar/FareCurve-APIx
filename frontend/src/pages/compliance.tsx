import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ShieldCheck, ShieldX } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";

export default function CompliancePage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complianceMatrix().then((data: any) => {
      if (Array.isArray(data)) setSources(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allowed = sources.filter(s=>s.verdict==="ALLOW").length;
  const denied = sources.filter(s=>s.verdict==="DENY").length;

  const getLogo = (name: string, type: string) => {
    const norm = (name || "").toLowerCase();
    const t = (type || "").toLowerCase();
    if (t === "airline") {
      if (norm.includes("indigo")) return "https://images.kiwi.com/airlines/32/6E.png";
      if (norm.includes("air india") && !norm.includes("express")) return "https://images.kiwi.com/airlines/32/AI.png";
      if (norm.includes("spicejet")) return "https://images.kiwi.com/airlines/32/SG.png";
      if (norm.includes("akasa")) return "https://images.kiwi.com/airlines/32/QP.png";
      if (norm.includes("express") || norm.includes("connect")) return "https://images.kiwi.com/airlines/32/IX.png";
      if (norm.includes("vistara")) return "https://images.kiwi.com/airlines/32/UK.png";
    } else if (t === "ota") {
      if (norm.includes("yatra")) return "https://www.google.com/s2/favicons?domain=yatra.com&sz=64";
      if (norm.includes("make") || norm.includes("mmt")) return "https://www.google.com/s2/favicons?domain=makemytrip.com&sz=64";
      if (norm.includes("ease")) return "https://www.google.com/s2/favicons?domain=easemytrip.com&sz=64";
      if (norm.includes("cleartrip")) return "https://www.google.com/s2/favicons?domain=cleartrip.com&sz=64";
      if (norm.includes("ixigo")) return "https://www.google.com/s2/favicons?domain=ixigo.com&sz=64";
      if (norm.includes("goibibo")) return "https://www.google.com/s2/favicons?domain=goibibo.com&sz=64";
    }
    return null;
  };

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Compliance Matrix</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        RFC 9309 robots.txt compliance audit &bull; Every scrape decision is traceable — live from backend
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-emerald)"}}>{allowed}</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>Allowed Sources</div>
        </div>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-rose)"}}>{denied}</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>Gated Sources (robots.txt DENY) <InfoTooltip text="Websites that explicitly disallow automated scraping. We use mathematical reconstruction here instead." /></div>
        </div>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-blue)"}}>{sources.length}</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>PS-defined Sources</div>
        </div>
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
      ) : (
        <div className="glass-card" style={{ overflowX: "auto" }}>
          <table className="data-table w-full text-left" style={{ minWidth: "1000px" }}>
            <thead><tr>
              <th style={{width: "20%"}}>Source</th>
              <th style={{width: "10%"}}>Type</th>
              <th style={{width: "20%"}}>URL</th>
              <th style={{width: "12%"}}>Verdict</th>
              <th style={{width: "28%"}}>Governing Rule</th>
              <th style={{width: "10%"}}>Status</th>
            </tr></thead>
            <tbody>
              {sources.map(s=>(
                <tr key={s.slug}>
                  <td style={{fontWeight:700}}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const logoUrl = getLogo(s.name, s.type);
                        return logoUrl ? <img src={logoUrl} alt="" className="w-5 h-5 object-contain" /> : null;
                      })()}
                      {s.name}
                    </div>
                  </td>
                  <td><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{background:"rgba(59,130,246,0.12)",color:"#60a5fa"}}>{s.type?.toUpperCase()}</span></td>
                  <td style={{color:"var(--accent-cyan)", fontSize:"0.85rem"}}>{s.url}</td>
                  <td><span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold " + (s.verdict === "ALLOW" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                    {s.verdict==="ALLOW"?<ShieldCheck size={12} style={{marginRight:4}}/>:<ShieldX size={12} style={{marginRight:4}}/>}
                    {s.verdict}
                  </span></td>
                  <td style={{fontSize:"0.8rem",color:"var(--text-secondary)", lineHeight: "1.4", padding: "0.5rem"}}>{s.rule}</td>
                  <td>{s.verdict==="DENY"
                    ? <span style={{color:"var(--accent-violet)",fontSize:"0.8rem", fontWeight:600}}>Reconstructed</span>
                    : <span style={{color:"var(--accent-emerald)",fontSize:"0.8rem", fontWeight:600}}>Live Scraping</span>
                  }</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
