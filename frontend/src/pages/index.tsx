import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";
import { formatDate } from "../lib/formatDate";
import { Activity, ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, ShieldCheck, Info, Route, Server, MapPin, Calendar, ArrowDown, Search, Download, ChevronDown, FileText, Code, Database, FileSpreadsheet, Plane, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Link from "next/link";
import { InfoTooltip } from "../components/InfoTooltip";
import { TimeFilter } from "../components/TimeFilter";
import { AirportSearch } from "../components/AirportSearch";
import { ChartAIButton } from "../components/ChartAIButton";

export default function Home() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [routesData, setRoutesData] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>('30D');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");

  const ALLOWED_CODES = ["DEL", "BOM", "BLR", "CCU", "HYD", "MAA"];

  useEffect(() => setMounted(true), []);

  const PIPELINE_LOGS = [
    { time: '05:00:01', level: 'INFO', module: 'scheduler', msg: 'Triggering hourly pipeline run...' },
    { time: '05:00:03', level: 'INFO', module: 'scraper', msg: 'Connecting to proxy pool (12 active nodes)' },
    { time: '05:00:05', level: 'INFO', module: 'scraper', msg: 'Fetching DEL-BOM fares (T+1 to T+45 windows)' },
    { time: '05:00:18', level: 'INFO', module: 'scraper', msg: 'Success: Extracted 243 fare nodes for DEL-BOM', highlight: true },
    { time: '05:00:20', level: 'INFO', module: 'scraper', msg: 'Fetching BLR-HYD fares (T+1 to T+45 windows)' },
    { time: '05:00:33', level: 'INFO', module: 'scraper', msg: 'Success: Extracted 198 fare nodes for BLR-HYD', highlight: true },
    { time: '05:01:45', level: 'INFO', module: 'processor', msg: 'Starting data cleaning and anomaly detection' },
    { time: '05:01:46', level: 'WARN', module: 'processor', msg: 'Dropped 12 anomalous outliers (fares > 3σ)' },
    { time: '05:01:48', level: 'INFO', module: 'indexer', msg: 'Computing Jevons Geometric Mean for 8 routes...' },
    { time: '05:01:50', level: 'INFO', module: 'indexer', msg: 'Computed Base APIx Index: 123.39', highlight: true },
    { time: '05:01:51', level: 'INFO', module: 'db', msg: 'Committed 1892 new fare records to SQLite', highlight: true },
    { time: '05:01:51', level: 'INFO', module: 'scheduler', msg: 'Pipeline run complete. Next run in 58m 09s...' },
  ];

  useEffect(() => {
    if (isLogsOpen) {
      setVisibleLogs(0);
      const interval = setInterval(() => {
        setVisibleLogs(v => {
          if (v >= PIPELINE_LOGS.length) {
            clearInterval(interval);
            return v;
          }
          return v + 1;
        });
      }, 600); // Add a log every 600ms
      return () => clearInterval(interval);
    }
  }, [isLogsOpen]);


  useEffect(() => {
    api.indexLatest().then((d: any) => {
      if (d && d.value) setLatest(d);
    }).catch(() => { });

    api.indexOverall(30).then((d: any) => {
      if (d) setHistory(d); // Backend already returns chronological, do not reverse again
    }).catch(() => { });

    api.routes().then(async (d: any[]) => {
      if (d) {
        const topRoutes = d.slice(0, 6);
        const enrichedRoutes = await Promise.all(
          topRoutes.map(async (r) => {
            try {
              const [origin, dest] = r.route_key.split('-');
              const hist = await api.indexRoute(origin, dest);
              const latestData = hist.length ? hist[hist.length - 1] : null;
              return { ...r, latestData };
            } catch (e) {
              return r;
            }
          })
        );
        setRoutesData(enrichedRoutes);
      }
    }).catch(() => { });
  }, []);

  const handleExportCSV = () => {
    const dataToExport = history.length ? history : fallbackData;
    const headers = ["Date,APIx Value,Observations,Confidence %"];
    const rows = dataToExport.map(h => `${h.date},${h.value},${h.observations || 0},${h.confidence_pct || 100}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apix_time_series_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  // Government aesthetic: stable, minimal hover, sharp borders, high contrast.
  // Changed hover to change background instead of border as requested.
  const cardStyle = "bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-200 flex flex-col justify-center";

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
    { date: '1 Sep', value: 118 },
    { date: '3 Sept', value: 123.39 }
  ];

  let rawData = [...(history.length ? history : fallbackData)];

  // Format dates and deduplicate (fixes multiple entries for the same day)
  const uniqueDataMap = new Map();
  rawData.forEach(item => {
    const rawDateStr = item.date || item.computation_date;
    const formattedDate = formatDate(rawDateStr);
    uniqueDataMap.set(formattedDate, { ...item, date: formattedDate, rawDate: rawDateStr });
  });
  let fullData = Array.from(uniqueDataMap.values());

  // Ensure the latest value is appended to the chart so numbers match the headline
  if (latest && fullData.length > 0) {
    const lastRawDate = fullData[fullData.length - 1].rawDate;
    const latestDate = latest.date || latest.computation_date || 'Today';
    const formattedLatest = formatDate(latestDate);

    // If the latest date is different from the last history point, append it
    if (lastRawDate !== latestDate && formattedLatest !== fullData[fullData.length - 1].date) {
      fullData.push({ date: `${formattedLatest} (Today)`, value: latest.value, rawDate: latestDate });
    } else {
      // If dates match, ensure the value is exactly what the headline shows
      fullData[fullData.length - 1] = {
        ...fullData[fullData.length - 1],
        value: latest.value,
        date: `${formattedLatest} (Today)`
      };
    }
  }

  let chartData = fullData;
  if (timeFilter === '7D') {
    chartData = fullData.length > 7 ? fullData.slice(-7) : fullData;
  } else if (timeFilter === '30D') {
    chartData = fullData.length > 30 ? fullData.slice(-30) : fullData;
  }

  return (
    <div className="mt-2 font-sans relative">

      {/* Hero Section */}
      <div className="mb-10 pt-2 flex flex-col xl:flex-row justify-between items-start gap-4">
        <div className="text-left">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Real-time airfare index
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Tracking aviation price elasticity across India, validated against official DGCA fare data.
          </p>
        </div>

        {/* Right Controls - ONLY EXPORT HERE */}
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto mt-2">
          {/* Export Dropdown */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              <Download size={18} />
              Export Data
              <ChevronDown size={18} className={`transition-transform duration-300 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-3 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
                <div className="flex flex-col p-2 gap-1">
                  <button onClick={handleExportCSV} className="text-left p-3 rounded-xl hover:bg-gray-50 flex gap-4 transition-colors group items-start">
                    <div className="text-blue-600 bg-blue-50 p-2 rounded-lg">
                      <Database size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 mb-0.5">Time-Series & Routes (CSV)</span>
                      <span className="text-[13px] text-gray-500 leading-snug">Daily/Weekly Index values & Route-wise breakdown for CPI integration.</span>
                    </div>
                  </button>

                  <button className="text-left p-3 rounded-xl hover:bg-gray-50 flex gap-4 transition-colors group items-start">
                    <div className="text-blue-600 bg-blue-50 p-2 rounded-lg">
                      <Calendar size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 mb-0.5">Booking Window Data (Excel)</span>
                      <span className="text-[13px] text-gray-500 leading-snug">T+1 to T+45 elasticity data & advanced purchase pricing trends.</span>
                    </div>
                  </button>

                  <button className="text-left p-3 rounded-xl hover:bg-gray-50 flex gap-4 transition-colors group items-start">
                    <div className="text-blue-600 bg-blue-50 p-2 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 mb-0.5">DGCA Validation Report (PDF)</span>
                      <span className="text-[13px] text-gray-500 leading-snug">Back-test summary & Confidence percentage for policy briefings.</span>
                    </div>
                  </button>

                  <button className="text-left p-3 rounded-xl hover:bg-gray-50 flex gap-4 transition-colors group items-start">
                    <div className="text-blue-600 bg-blue-50 p-2 rounded-lg flex justify-center items-center h-[34px] w-[34px]">
                      <span className="text-[11px] font-bold tracking-wider">API</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 mb-0.5">API / JSON Integration</span>
                      <span className="text-[13px] text-gray-500 leading-snug">API Endpoints & JSON access for programmatic NSO/RBI pulling.</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

                                    {/* Controls Row */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-8 w-full">
        {/* Structured Route Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="w-full xl:w-auto">
          <AirportSearch placeholder="Origin (DEL)" value={origin} onChange={setOrigin} />
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>✈</span>
          <AirportSearch placeholder="Dest (BOM)" value={dest} onChange={setDest} />
          <button onClick={() => {
              if (origin && dest) window.location.href = `/routes?route=${origin}-${dest}`;
            }} 
            style={{ padding: "0.5rem 1rem", borderRadius: "999px", background: "#0f172a", color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", border: "none" }}>
            Search
          </button>
        </div>

        {/* Badges in the same row as Search */}
        <div className="flex flex-row items-center justify-start xl:justify-end gap-3 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 thin-scrollbar">
          {/* Live Badge */}
          <div
            onClick={() => setIsLogsOpen(true)}
            className="group flex items-center gap-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-200 transition-all flex-shrink-0"
            style={{ height: "38px", padding: "0 0.5rem 0 1rem" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Live • 3 min ago</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold text-gray-500 transition-colors ml-1">
              Logs <ArrowRight size={12} />
            </div>
          </div>
          
          {/* Confidence Badge */}
          <div 
            className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{ height: "38px", padding: "0 1rem" }}
          >
            <ShieldCheck size={14} />
            88% Confidence
            <span className="text-emerald-300 mx-1">•</span>
            <span className="font-semibold text-emerald-600">Last validated: {latest ? formatDate(latest.date || latest.computation_date) : "14 Sept"}</span>
          </div>
        </div>
      </div>

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <Activity className="text-gray-400 w-4 h-4" /> Airfare Price Index (APIx)
            </div>
            <InfoTooltip text="Our proprietary price index (Base 100 = Aug 2023). A value of 123 means airfares are 23% higher than the baseline. Calculated using the Jevons Geometric Mean to prevent extreme outliers." />
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
            <InfoTooltip text="Number of high-traffic domestic Indian flight routes (e.g., DEL-BOM, BLR-CCU) currently being scraped and analyzed in real-time." />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">17</span>
            <div className="text-sm text-gray-500">Top DGCA-traffic sectors</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <Database className="text-gray-400 w-4 h-4" /> Daily Quotes Captured
            </div>
            <InfoTooltip text="High-frequency data collection capturing massive amounts of real-time prices across various booking windows and OTAs/Airlines." />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900">48,250</span>
            <div className="text-sm text-gray-500">Cleaned & de-duplicated</div>
          </div>
        </div>

        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <Calendar className="text-gray-400 w-4 h-4" /> Booking windows
            </div>
            <InfoTooltip position="left" text="We track how prices change depending on how far in advance a ticket is bought (e.g., T+1 day, T+15 days, T+30 days before departure)." />
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
            <h3 className="text-lg font-bold text-gray-900 uppercase">FARECURVE TREND</h3>
            <span className="text-sm text-gray-500">All-India composite index, daily. Base = 100.</span>
          </div>
          {/* Time Filter Toggle */}
          <div className="flex items-center gap-4">
            <ChartAIButton contextQuery="Analyze the all-India FareCurve historical trend index." />
            <TimeFilter value={timeFilter} onChange={setTimeFilter} layoutIdPrefix="homeFilter" />
          </div>
        </div>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }} formatter={(v: any, n: any) => [Number(v).toFixed(2), n]} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm text-gray-400 mt-6 flex justify-between items-center">
          <span>{latest ? "Live data integrated" : "Awaiting live pipeline data..."}</span>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Route Explorer Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-colors flex flex-col h-full group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Route size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Route Explorer</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
            Track individual route indices — live from the database.
          </p>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Activity size={12} className="text-blue-500" /> {routesData.length > 0 ? routesData.length : 17} active
            </div>
            <Link href="/routes" className="text-sm font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
              Explore <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Booking Curve Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-colors flex flex-col h-full group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Booking-window</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
            Fare shift from T+45 to T+1, manual CPI can't capture this.
          </p>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowUpRight size={12} className="text-amber-500" /> Up to 3x price jump
            </div>
            <Link href="/booking-curve" className="text-sm font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
              Explore <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Sector Heatmap Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-colors flex flex-col h-full group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Sector Heatmap</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
            Geographic visualization of route-level price indices across India.
          </p>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Activity size={12} className="text-red-500" /> 4 routes in surge
            </div>
            <Link href="/heatmap" className="text-sm font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
              Explore <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Fare by Sector - New Bottom Section */}
      <div className={cardStyle}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            Fare by sector
            <span className="text-sm font-normal text-gray-500">(Top 6 of 17)</span>
          </h3>
          <Link href="/routes" className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full hover:bg-blue-100 transition-colors">
            Open route explorer <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {(routesData.length ? routesData : [
            { route_key: 'DEL-BOM' },
            { route_key: 'BLR-DEL' },
            { route_key: 'BOM-BLR' },
            { route_key: 'CCU-DEL' },
            { route_key: 'HYD-BOM' },
            { route_key: 'MAA-DEL' }
          ]).map((sector, i) => {
            const flights = sector.latestData ? sector.latestData.observations : (latest ? Math.round(latest.observations / 16) : 42);
            const fare = sector.latestData ? sector.latestData.mean_fare : null;
            const indexVal = sector.latestData ? sector.latestData.value : null;
            const isDone = !!latest;
            const status = isDone ? 'Done' : 'Scraping';
            const progress = isDone ? 'w-full' : 'w-3/4';

            const getIndexColor = (val: number) => {
              if (val < 100) return 'text-green-600 bg-green-50 border-green-100 px-1 rounded';
              if (val > 130) return 'text-red-600 bg-red-50 border-red-100 px-1 rounded';
              if (val > 115) return 'text-orange-500 bg-orange-50 border-orange-100 px-1 rounded';
              return 'text-blue-600 bg-blue-50 border-blue-100 px-1 rounded';
            };

            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[16px] font-bold text-gray-900 tracking-wide flex items-center gap-2">
                      <Plane size={18} className="text-gray-700" /> {sector.route_key}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-1.5 flex flex-col gap-1 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><Route size={12} className="text-gray-400" /> {flights} flights tracked</div>
                      {fare && <div className="text-gray-700 font-bold mt-1 tracking-normal capitalize">Avg Fare: ₹{Math.round(fare).toLocaleString()} <span className={`font-medium border ml-1 ${getIndexColor(indexVal)}`}>(Idx: {indexVal.toFixed(1)})</span></div>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status === 'Done' ? 'bg-green-50 text-green-700' : status === 'Scraping' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {status !== 'Done' && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'Scraping' ? 'bg-blue-600' : 'bg-amber-500'}`}></span>}
                    {status}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Data Completeness</span>
                    <span className={status === 'Done' ? 'text-green-600' : 'text-blue-600'}>{status === 'Done' ? '100%' : '75%'}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className={`h-full ${status === 'Done' ? 'bg-green-400' : status === 'Scraping' ? 'bg-blue-400' : 'bg-amber-400'} rounded-full ${progress}`}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Live route observations from the latest pipeline run
        </div>
      </div>

      {isLogsOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200 flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-blue-100 bg-blue-50">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Live Pipeline Logs
                </h2>
              </div>
              <button onClick={() => setIsLogsOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 bg-white text-xs font-mono overflow-y-auto h-[400px] flex flex-col gap-1.5 custom-scrollbar">
              {PIPELINE_LOGS.slice(0, visibleLogs).map((log, i) => (
                <div key={i} className="flex items-start gap-3 hover:bg-gray-50 px-2 py-1 rounded transition-colors -mx-2 border border-transparent hover:border-gray-100">
                  <span className="text-gray-400 shrink-0">2026-09-02 {log.time}</span>
                  <span className={`shrink-0 font-bold w-10 ${log.level === 'INFO' ? 'text-blue-600' : 'text-amber-600'}`}>{log.level}</span>
                  <span className="text-purple-600 shrink-0 w-24">[{log.module}]</span>
                  <span className={`${log.highlight ? 'text-emerald-700 font-semibold' : log.level === 'WARN' ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>{log.msg}</span>
                </div>
              ))}
              {visibleLogs < PIPELINE_LOGS.length && (
                <div className="flex items-center gap-2 text-gray-400 mt-2 px-2 animate-pulse font-bold text-sm">
                  <span>_</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}