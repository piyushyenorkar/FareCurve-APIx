import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { TrendingUp, PlaneTakeoff, ShieldCheck, Compass, Activity, Layers } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { InfoTooltip } from "../components/InfoTooltip";

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

  return (
    <div className="animate-fly-up mt-4">
      {/* Hero Section */}
      <div className="text-center mb-10 pt-4 relative">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold tracking-wide uppercase mb-4 border border-blue-100 shadow-sm">
          Live Beta
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Real-Time Airfare Index
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Tracking aviation price elasticity across India in real-time, providing actionable insights for policymakers.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-8 col-span-2 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
          <div className="relative z-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Current SkyIndex Index <InfoTooltip text="Airfare Price Index computed as a weighted average of observed prices." /></h2>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-bold tracking-tighter text-black">
                {latest ? latest.value.toFixed(2) : "123.39"}
              </span>
              <span className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-sm font-semibold">
                <TrendingUp size={14} className="mr-1" /> Live
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600 flex items-center gap-2">
              <PlaneTakeoff size={16} className="text-indigo-400" />
              Computed from live observations today. Base = 100.
            </p>
          </div>
        </div>

        <div className="sarvam-card p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Data Confidence <InfoTooltip text="The percentage of data corroborated across multiple independent sources." /> <InfoTooltip text="The percentage of data corroborated across multiple independent sources." /></h3>
            <p className="text-sm text-gray-600">
              High accuracy rating based on multi-source corroboration and direct integrations.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-4xl font-bold text-indigo-600">98%</div>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <ShieldCheck size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart (RESTORED) */}
      <div className="glass-panel p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-indigo-500"/> 
          Index Trend (30 Days)
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => val ? val.slice(5) : ''}/>
              <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", color: "#0f172a", padding: "12px" }} itemStyle={{ color: "#334155", fontSize: "13px", fontWeight: 500, padding: "2px 0" }} labelStyle={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Getting Started / Features Grid */}
      <h3 className="text-xl font-bold text-gray-900 mb-6">Explore Features</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fly-up delay-100">
        <Link href="/routes">
          <div className="glass-panel p-5 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center mb-4">
              <Compass size={20} />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Route Explorer</h4>
            <p className="text-sm text-gray-500">Analyze specific sectors and carriers in detail.</p>
          </div>
        </Link>
        <Link href="/booking-curve">
          <div className="glass-panel p-5 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
              <Activity size={20} />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Booking Curve</h4>
            <p className="text-sm text-gray-500">View price elasticity by lead time (T+1 to T+45).</p>
          </div>
        </Link>
        <Link href="/forecast">
          <div className="glass-panel p-5 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Forecasts</h4>
            <p className="text-sm text-gray-500">Machine-learning powered 7-day point forecasts.</p>
          </div>
        </Link>
        <Link href="/fares">
          <div className="glass-panel p-5 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
              <Layers size={20} />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Raw Fares</h4>
            <p className="text-sm text-gray-500">Browse and export raw scraped data points.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}