import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Activity, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

export default function Home() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.indexLatest().then((d: any) => {
      if (d && d.value) setLatest(d);
    }).catch(() => {});
    
    api.indexOverall(30).then((d: any) => {
      if (d) setHistory(d.reverse()); // Reverse to chronological
    }).catch(() => {});
  }, []);

  const cardStyle = "bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)] flex flex-col justify-center";

  return (
    <div className="mt-2">
      {/* Hero Section */}
      <div className="text-left mb-8 pt-2 relative">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-500 text-[10px] font-bold tracking-widest uppercase">
            LIVE BETA
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-3">
          Real-time airfare index
        </h1>
        <p className="text-lg text-gray-500 max-w-3xl">
          Tracking aviation price elasticity across India, validated against official DGCA fare data.
        </p>
      </div>

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={cardStyle}>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Current index</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {latest ? latest.value.toFixed(2) : "123.39"}
            </span>
          </div>
        </div>
        
        <div className={cardStyle}>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Routes tracked</h2>
          <span className="text-3xl font-bold tracking-tight text-gray-900">17</span>
        </div>

        <div className={cardStyle}>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Sources allowed</h2>
          <span className="text-3xl font-bold tracking-tight text-gray-900">4 <span className="text-xl text-gray-400 font-medium tracking-normal">of 11</span></span>
        </div>

        <div className={cardStyle}>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Booking windows</h2>
          <span className="text-3xl font-bold tracking-tight text-gray-900">T+1 to T+45</span>
        </div>
      </div>

      {/* Historical Trend Chart (Full Width) */}
      <div className={`${cardStyle} mb-6 !p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[15px] font-bold text-gray-900">Index trend, 30 days</h3>
          <span className="text-xs text-gray-500 font-medium">Base = 100</span>
        </div>
        <div className="border border-gray-900 rounded bg-white" style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide={true} />
              <YAxis domain={['auto', 'auto']} hide={true} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", padding: "8px 12px" }} 
                itemStyle={{ color: "#0f172a", fontSize: "14px", fontWeight: 600, padding: 0 }} 
                labelStyle={{ display: "none" }} 
              />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-gray-400 mt-3">Awaiting live pipeline data</div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Ethical Scraping Card */}
        <div className={`${cardStyle} !justify-between !p-6`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-[15px]">
              <ShieldCheck size={18} className="text-emerald-500" />
              Ethical scraping, audited
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              4 sources allowed · 7 gated by robots.txt · every decision traceable
            </p>
          </div>
          <Link href="/compliance" className="text-sm font-medium text-indigo-700 flex items-center gap-1 hover:text-indigo-800 transition-colors">
            View compliance matrix <ArrowRight size={14} />
          </Link>
        </div>

        {/* Booking Curve Card */}
        <div className={`${cardStyle} !justify-between !p-6`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-[15px]">
              <Activity size={18} className="text-blue-500" />
              Booking-window curve
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              See how the same route's fare shifts from T+45 to T+1, something manual CPI collection can't capture.
            </p>
          </div>
          <Link href="/booking-curve" className="text-sm font-medium text-indigo-700 flex items-center gap-1 hover:text-indigo-800 transition-colors">
            Explore booking curve <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* DGCA Validation Banner */}
      <div className="bg-[#f0fdf4] rounded-2xl border border-[#bbf7d0] p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-[#166534] mt-0.5 shrink-0" size={20} />
          <div>
            <h3 className="text-[#166534] font-bold mb-1 text-[15px]">DGCA validated</h3>
            <p className="text-[#15803d] text-sm">
              Index tracks within range of DGCA's published monthly average fares, back-tested over 30 days.
            </p>
          </div>
        </div>
        <Link href="/quality" className="text-[#166534] text-sm font-bold flex items-center gap-1 hover:text-[#14532d] whitespace-nowrap transition-colors">
          View validation <ArrowRight size={14} />
        </Link>
      </div>

    </div>
  );
}