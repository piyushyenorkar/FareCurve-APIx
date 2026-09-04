import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Activity, ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, ShieldCheck, Info, Route, Server, Calendar, ArrowDown, Search, Download, ChevronDown, FileText, Code, Database, FileSpreadsheet, Plane } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Link from "next/link";
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

const PremiumTooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={100}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button type="button" className="focus:outline-none">{children}</button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={5}
          className="z-[100] bg-gray-800 text-white text-xs font-medium px-3 py-2 rounded shadow-lg max-w-[280px] text-center leading-relaxed"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-gray-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

export default function Home() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    api.indexLatest().then((d: any) => {
      if (d && d.value) setLatest(d);
    }).catch(() => {});
    
    api.indexOverall(30).then((d: any) => {
      if (d) setHistory(d.reverse()); // Reverse to chronological
    }).catch(() => {});
  }, []);

  // Government aesthetic: stable, minimal hover, sharp borders, high contrast.
  // Changed hover to change background instead of border as requested.
  const cardStyle = "bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-200 flex flex-col justify-center";
  const iconStyle = "text-gray-400 w-4 h-4 hover:text-gray-700 transition-colors cursor-help";

  // Dynamic Trend Logic: Green for positive, Red for negative
  const trendValue = 2.3; // Hardcoded for mockup, normally from API
  const isPositive = trendValue > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const trendColor = isPositive ? "text-green-600" : "text-red-600";

  // Chart Data Filtering Logic
  const fallbackData = [
    { date: 'Jan 12', value: 95 },
    { date: 'Mar 14', value: 98 },
    { date: 'May 02', value: 102 },
    { date: 'Jul 21', value: 105 },
    { date: 'Aug 4', value: 107 },
    { date: 'Aug 12', value: 108 },
    { date: 'Aug 20', value: 111 },
    { date: 'Aug 28', value: 115 },
    { date: 'Sep 1', value: 118 },
    { date: 'Sep 3', value: 123.39 }
  ];
  
  const fullData = history.length ? history : fallbackData;
  let chartData = fullData;
  if (timeFilter === '7D') {
    chartData = fullData.slice(-3); // Mock last 7 days (last 3 data points)
  } else if (timeFilter === '30D') {
    chartData = fullData.slice(-6); // Mock last 30 days (last 6 data points)
  } else if (timeFilter === 'YTD') {
    chartData = fullData; // Full year to date
  }

  return (
    <div className="mt-2 font-sans relative">
      
      {/* Hero Section */}
      <div className="mb-10 pt-2">
        <div className="text-left mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Real-time airfare index
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Tracking aviation price elasticity across India, validated against official DGCA fare data.
          </p>
        </div>
        
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Search Bar */}
          <div className="relative flex-1 w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-gray-900 leading-5 bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 sm:text-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md"
              placeholder="Search sectors (e.g. DEL-BOM), airlines, or dates..."
            />
          </div>

          {/* Right Controls */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            
            {/* Live Indicator */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-4 py-3.5 rounded-xl text-sm font-bold text-green-700 w-full md:w-auto justify-center whitespace-nowrap shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Live • updated 3 min ago
            </div>
            
            {/* Export Dropdown */}
            <div className="relative w-full md:w-auto">
              <button 
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition-all"
              >
                <Download size={18} />
                Export Data
                <ChevronDown size={18} className={`transition-transform duration-300 ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isExportOpen && (
                <div className="absolute right-0 mt-3 w-[340px] bg-[#1c1c1c] rounded-2xl shadow-2xl border border-gray-800 z-50 overflow-hidden transform origin-top-right transition-all">
                  <div className="flex flex-col p-2 gap-1">
                    <button className="text-left p-3 rounded-xl hover:bg-white/10 flex gap-4 transition-colors group items-start">
                      <div className="text-blue-400 mt-0.5">
                        <Database size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white mb-0.5">Time-Series & Routes (CSV)</span>
                        <span className="text-[13px] text-gray-400 leading-snug">Daily/Weekly Index values & Route-wise breakdown for CPI integration.</span>
                      </div>
                    </button>

                    <button className="text-left p-3 rounded-xl hover:bg-white/10 flex gap-4 transition-colors group items-start">
                      <div className="text-emerald-400 mt-0.5">
                        <Calendar size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white mb-0.5">Booking Window Data (Excel)</span>
                        <span className="text-[13px] text-gray-400 leading-snug">T+1 to T+45 elasticity data & advanced purchase pricing trends.</span>
                      </div>
                    </button>

                    <button className="text-left p-3 rounded-xl hover:bg-white/10 flex gap-4 transition-colors group items-start">
                      <div className="text-purple-400 mt-0.5">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white mb-0.5">DGCA Validation Report (PDF)</span>
                        <span className="text-[13px] text-gray-400 leading-snug">Back-test summary & Confidence percentage for policy briefings.</span>
                      </div>
                    </button>
                    
                    <button className="text-left p-3 rounded-xl hover:bg-white/10 flex gap-4 transition-colors group items-start">
                      <div className="text-gray-300 mt-1 w-[18px] text-center flex justify-center">
                        <span className="text-[11px] font-bold tracking-wider">API</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white mb-0.5">API / JSON Integration</span>
                        <span className="text-[13px] text-gray-400 leading-snug">API Endpoints & JSON access for programmatic NSO/RBI pulling.</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                <Activity className="text-gray-400 w-4 h-4" /> SkyIndex value
             </div>
             <PremiumTooltip content="Our proprietary price index (Base 100 = Aug 2023). A value of 123 means airfares are 23% higher than the baseline. Calculated using the Jevons Geometric Mean to prevent extreme outliers.">
                <Info className={iconStyle} />
             </PremiumTooltip>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {latest ? latest.value.toFixed(2) : "123.39"}
            </span>
            <div className={`text-sm font-semibold flex items-center gap-1 ${trendColor}`}>
               <TrendIcon size={14} strokeWidth={3} /> {isPositive ? "+" : ""}{trendValue} vs last week
            </div>
          </div>
        </div>
        
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                <Route className="text-gray-400 w-4 h-4" /> Routes tracked
             </div>
             <PremiumTooltip content="Number of high-traffic domestic Indian flight routes (e.g., DEL-BOM, BLR-CCU) currently being scraped and analyzed in real-time.">
                <Info className={iconStyle} />
             </PremiumTooltip>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">17</span>
            <div className="text-sm text-gray-500">Top DGCA-traffic sectors</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                <Server className="text-gray-400 w-4 h-4" /> Sources allowed
             </div>
             <PremiumTooltip content="Number of airline/OTA websites we scrape. We strictly respect robots.txt compliance, ensuring our web scraping is 100% ethical and legal.">
                <Info className={iconStyle} />
             </PremiumTooltip>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">4 <span className="text-xl text-gray-500 font-medium tracking-normal">of 11</span></span>
            <div className="text-sm text-gray-500">Per robots.txt audit</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                <Calendar className="text-gray-400 w-4 h-4" /> Booking windows
             </div>
             <PremiumTooltip content="We track how prices change depending on how far in advance a ticket is bought (e.g., T+1 day, T+15 days, T+30 days before departure).">
                <Info className={iconStyle} />
             </PremiumTooltip>
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
          <div>
            <h3 className="text-lg font-bold text-gray-900">SkyIndex trend</h3>
            <span className="text-sm text-gray-500">Base = 100</span>
          </div>
          {/* Time Filter Toggle */}
          <div className="flex bg-gray-100 p-1 rounded">
             {['7D', '30D', 'YTD'].map(filter => (
               <button 
                 key={filter}
                 onClick={() => setTimeFilter(filter as any)}
                 className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${timeFilter === filter ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
               >
                 {filter}
               </button>
             ))}
          </div>
        </div>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderRadius: "4px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: "8px 12px" }} 
                itemStyle={{ color: "#111827", fontSize: "14px", fontWeight: 600, padding: 0 }} 
                labelStyle={{ display: "none" }} 
              />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} strokeDasharray="6 6" dot={false} activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm text-gray-400 mt-6 flex justify-between items-center">
            <span>Awaiting live pipeline data</span>
        </div>
        {/* Floating scroll indicator */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors">
           <ArrowDown size={18} />
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Ethical Scraping Card */}
        <div className={`${cardStyle} !justify-between gap-6 group`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <ShieldCheck size={20} className="text-emerald-600" />
              Ethical scraping
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              4 sources allowed · 7 gated · every decision traceable
            </p>
          </div>
          <Link href="/compliance" className="self-start inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded hover:bg-blue-100 transition-colors">
            View compliance matrix <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        {/* Booking Curve Card */}
        <div className={`${cardStyle} !justify-between gap-6 group`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <Activity size={20} className="text-blue-600" />
              Booking-window curve
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Fare shift from T+45 to T+1, manual CPI can't capture this
            </p>
          </div>
          <Link href="/booking-curve" className="self-start inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded hover:bg-blue-100 transition-colors">
            Explore booking curve <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
        
        {/* DGCA Validation Card */}
        <div className={`${cardStyle} !justify-between gap-6 group`}>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <CheckCircle2 size={20} className="text-blue-600" />
              DGCA validated
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tracks within range of official monthly average fares
            </p>
          </div>
          <Link href="/quality" className="self-start inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded hover:bg-blue-100 transition-colors">
            View validation <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </div>

      {/* Fare by Sector - New Bottom Section */}
      <div className={cardStyle}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 text-lg">Fare by sector</h3>
            <Link href="/routes" className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded hover:bg-blue-100 transition-colors">
               Open route explorer <ArrowRight size={16} className="ml-2" />
            </Link>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
            {[
              { route: 'DEL-BOM', flights: 42, status: 'Scraping', progress: 'w-3/4' },
              { route: 'BLR-DEL', flights: 38, status: 'Queued', progress: 'w-1/4' },
              { route: 'BOM-BLR', flights: 35, status: 'Scraping', progress: 'w-1/2' },
              { route: 'CCU-DEL', flights: 29, status: 'Queued', progress: 'w-1/3' },
              { route: 'HYD-BOM', flights: 24, status: 'Scraping', progress: 'w-2/3' },
              { route: 'MAA-DEL', flights: 21, status: 'Done', progress: 'w-full' }
            ].map((sector, i) => (
               <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-[16px] font-bold text-gray-900 tracking-wide flex items-center gap-2">
                        <Plane size={18} className="text-gray-700" /> {sector.route}
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500 mt-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <Route size={12} className="text-gray-400" /> {sector.flights} flights tracked
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        sector.status === 'Done' ? 'bg-green-50 text-green-700' : 
                        sector.status === 'Scraping' ? 'bg-blue-50 text-blue-700' : 
                        'bg-amber-50 text-amber-700'
                      }`}>
                       {sector.status === 'Scraping' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>}
                       {sector.status === 'Queued' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                       {sector.status}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full ${
                         sector.status === 'Done' ? 'bg-green-500' : 
                         sector.status === 'Scraping' ? 'bg-blue-500' : 
                         'bg-amber-400'
                       } rounded-full ${sector.progress}`}></div>
                    </div>
                  </div>
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