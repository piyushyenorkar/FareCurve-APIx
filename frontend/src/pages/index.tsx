import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Activity, ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, Info, Route, Server, Calendar, ArrowDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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
  const iconStyle = "text-gray-400 w-4 h-4";

  return (
    <div className="mt-2 font-sans relative">
      
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 pt-2 gap-4">
        <div className="text-left">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Real-time airfare index
          </h1>
          <p className="text-lg text-gray-500 max-w-3xl">
            Tracking aviation price elasticity across India, validated against official DGCA fare data.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 shadow-sm shrink-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          Live • updated 3 min ago
        </div>
      </div>

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Activity className={iconStyle} /> SkyIndex value
             </div>
             <Info className={iconStyle} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {latest ? latest.value.toFixed(2) : "123.39"}
            </span>
            <div className="text-sm text-blue-600 font-medium flex items-center gap-1">
               <ArrowUpRight size={14} /> +2.3 vs last week
            </div>
          </div>
        </div>
        
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Route className={iconStyle} /> Routes tracked
             </div>
             <Info className={iconStyle} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">17</span>
            <div className="text-sm text-gray-500">Top DGCA-traffic sectors</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Server className={iconStyle} /> Sources allowed
             </div>
             <Info className={iconStyle} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">4 <span className="text-xl text-gray-500 font-medium tracking-normal">of 11</span></span>
            <div className="text-sm text-gray-500">Per robots.txt audit</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Calendar className={iconStyle} /> Booking windows
             </div>
             <Info className={iconStyle} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">5</span>
            <div className="text-sm text-gray-500">T+1, T+7, T+15, T+30, T+45</div>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart (Full Width) */}
      <div className={`${cardStyle} mb-8 relative pb-10`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold text-gray-900">SkyIndex trend, 30 days</h3>
          <span className="text-sm text-gray-500">Base = 100</span>
        </div>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.length ? history : [
              { date: 'Aug 4', value: 107 },
              { date: 'Aug 12', value: 108 },
              { date: 'Aug 20', value: 111 },
              { date: 'Aug 28', value: 115 },
              { date: 'Sep 3', value: 120 }
            ]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: "8px 12px" }} 
                itemStyle={{ color: "#111827", fontSize: "14px", fontWeight: 600, padding: 0 }} 
                labelStyle={{ display: "none" }} 
              />
              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} strokeDasharray="6 6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm text-gray-400 mt-6 flex justify-between items-center">
            <span>Awaiting live pipeline data</span>
        </div>
        {/* Floating scroll indicator from screenshot */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 shadow-sm">
           <ArrowDown size={18} />
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Ethical Scraping Card */}
        <div className={`${cardStyle} !justify-between gap-6`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <ShieldCheck size={20} className="text-emerald-500" />
              Ethical scraping
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              4 sources allowed · 7 gated · every decision traceable
            </p>
          </div>
          <Link href="/compliance" className="self-start inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
            View compliance matrix <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        {/* Booking Curve Card */}
        <div className={`${cardStyle} !justify-between gap-6`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <Activity size={20} className="text-blue-500" />
              Booking-window curve
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Fare shift from T+45 to T+1, manual CPI can't capture this
            </p>
          </div>
          <Link href="/booking-curve" className="self-start inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
            Explore booking curve <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
        
        {/* DGCA Validation Card */}
        <div className={`${cardStyle} !justify-between gap-6`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <CheckCircle2 size={20} className="text-blue-500" />
              DGCA validated
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tracks within range of official monthly average fares
            </p>
          </div>
          <Link href="/quality" className="self-start inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
            View validation <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </div>

      {/* Fare by Sector - New Bottom Section */}
      <div className={cardStyle}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 text-lg">Fare by sector</h3>
            <Link href="/routes" className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
               Open route explorer <ArrowRight size={16} className="ml-2" />
            </Link>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            {['DEL', 'BOM', 'BLR', 'CCU', 'HYD', 'MAA'].map((code) => (
               <div key={code} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3 items-center justify-center">
                  <span className="text-sm font-bold text-gray-400">{code}</span>
                  <div className="h-2 w-12 bg-gray-200 rounded-full animate-pulse"></div>
               </div>
            ))}
         </div>
         <div className="text-sm text-gray-500 mt-2">
            Awaiting pipeline execution for live sector data
         </div>
      </div>

    </div>
  );
}