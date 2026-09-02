import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { InfoTooltip } from "../components/InfoTooltip";

export default function ATFPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.atfCorrelation().then((d: any) => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = data?.apix_history?.map((item: any, i: number) => ({
    date: item.date?.slice(5) || "",
    apix: item.value,
    atf: data.atf_history?.[i]?.value || null,
  })) || [];

  return (
    <div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>
        <span className="gradient-text">ATF Impact Analysis <InfoTooltip text="Aviation Turbine Fuel (ATF) is a major cost driver for airlines. This page overlays the WPI ATF price series (from MoSPI) against the AeroMetrics Index to show correlation." /></span>
      </h1>
      <p style={{color:"var(--text-muted)",fontSize:"0.875rem",marginBottom:"2rem"}}>
        WPI ATF price vs AeroMetrics Index correlation — live reference data
      </p>
      {loading ? (
        <div className="glass-card" style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>Loading ATF data...</div>
      ) : chartData.length === 0 ? (
        <div className="glass-card" style={{textAlign:"center",padding:"3rem",color:"var(--text-muted)"}}>
          No ATF correlation data available yet. Run the pipeline and reference data refresh.
        </div>
      ) : (
        <div className="glass-card">
          <h2 style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"1rem"}}>AeroMetrics Index vs ATF Price</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11}}/>
              <YAxis yAxisId="left" tick={{fill:"#3b82f6",fontSize:11}} label={{value:"AeroMetrics Index",angle:-90,position:"insideLeft",style:{fill:"#3b82f6"}}}/>
              <YAxis yAxisId="right" orientation="right" tick={{fill:"#f97316",fontSize:11}} label={{value:"ATF (₹/kl)",angle:90,position:"insideRight",style:{fill:"#f97316"}}}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}/>
              <Legend/>
              <Line yAxisId="left" type="monotone" dataKey="apix" name="AeroMetrics Index" stroke="#3b82f6" strokeWidth={2.5} dot={false}/>
              {chartData.some((d:any) => d.atf) && (
                <Line yAxisId="right" type="monotone" dataKey="atf" name="ATF Price" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 4"/>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
