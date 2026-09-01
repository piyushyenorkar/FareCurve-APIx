import { ShieldCheck, ShieldX, ExternalLink } from "lucide-react";

const SOURCES = [
  {slug:"akasa",name:"Akasa Air",type:"carrier",url:"akasaair.com",verdict:"ALLOW",rule:"No Disallow",gated:false},
  {slug:"spicejet",name:"SpiceJet",type:"carrier",url:"spicejet.com",verdict:"ALLOW",rule:"Disallow: (empty)",gated:false},
  {slug:"airindia",name:"Air India",type:"carrier",url:"airindia.com",verdict:"ALLOW",rule:"Booking paths open",gated:false},
  {slug:"yatra",name:"Yatra",type:"ota",url:"yatra.com",verdict:"ALLOW",rule:"No Disallow for search",gated:false},
  {slug:"indigo",name:"IndiGo",type:"carrier",url:"goindigo.in",verdict:"DENY",rule:"Disallow: /search",gated:true},
  {slug:"airindiaexpress",name:"Air India Express",type:"carrier",url:"airindiaexpress.com",verdict:"DENY",rule:"Disallow: /flight-availability",gated:true},
  {slug:"makemytrip",name:"MakeMyTrip",type:"ota",url:"makemytrip.com",verdict:"DENY",rule:"Disallow: /flight/search*",gated:true},
  {slug:"easemytrip",name:"EaseMyTrip",type:"ota",url:"easemytrip.com",verdict:"DENY",rule:"Disallow: /flight-search*",gated:true},
  {slug:"cleartrip",name:"Cleartrip",type:"ota",url:"cleartrip.com",verdict:"DENY",rule:"Disallow: /flights/search*",gated:true},
  {slug:"ixigo",name:"Ixigo",type:"ota",url:"ixigo.com",verdict:"DENY",rule:"Disallow: /flights/search",gated:true},
  {slug:"goibibo",name:"Goibibo",type:"ota",url:"goibibo.com",verdict:"DENY",rule:"Disallow: /flights/*?mode=*",gated:true},
];

export default function CompliancePage() {
  const allowed = SOURCES.filter(s=>s.verdict==="ALLOW").length;
  const denied = SOURCES.filter(s=>s.verdict==="DENY").length;
  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">Compliance Matrix</span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        RFC 9309 robots.txt compliance audit &bull; Every scrape decision is traceable
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-emerald)"}}>{allowed}</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>Allowed Sources</div>
        </div>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-rose)"}}>{denied}</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>Gated Sources (robots.txt DENY)</div>
        </div>
        <div className="glass-card" style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-blue)"}}>11</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>PS-defined Sources</div>
        </div>
      </div>
      <div className="glass-card">
        <table className="data-table">
          <thead><tr>
            <th>Source</th><th>Type</th><th>URL</th><th>Verdict</th><th>Governing Rule</th><th>Status</th>
          </tr></thead>
          <tbody>
            {SOURCES.map(s=>(
              <tr key={s.slug}>
                <td style={{fontWeight:700}}>{s.name}</td>
                <td><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{background:"rgba(59,130,246,0.12)",color:"#60a5fa"}}>{s.type.toUpperCase()}</span></td>
                <td style={{color:"var(--accent-cyan)"}}>{s.url}</td>
                <td><span className={"badge px-2.5 py-1 rounded-full text-xs font-semibold " + (s.verdict === "ALLOW" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                  {s.verdict==="ALLOW"?<ShieldCheck size={12} style={{marginRight:4}}/>:<ShieldX size={12} style={{marginRight:4}}/>}
                  {s.verdict}
                </span></td>
                <td style={{fontSize:"0.8rem",color:"var(--text-secondary)"}}>{s.rule}</td>
                <td>{s.gated
                  ? <span style={{color:"var(--accent-violet)",fontSize:"0.8rem"}}>Reconstructed</span>
                  : <span style={{color:"var(--accent-emerald)",fontSize:"0.8rem"}}>Live Scraping</span>
                }</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
