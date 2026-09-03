import Link from "next/link";
import { useState } from "react";
import { X, Home, Compass, Activity, ShieldCheck, Database, Layers } from "lucide-react";
import { useRouter } from "next/router";

export default function Sidebar() {
  const router = useRouter();
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const links = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Route Explorer", icon: Compass, href: "/routes" },
    { label: "Booking Curve", icon: Activity, href: "/booking-curve" },
    { label: "Forecasts", icon: Activity, href: "/forecast" },
    { label: "Anomalies", icon: ShieldCheck, href: "/anomalies" },
    { label: "Compliance", icon: ShieldCheck, href: "/compliance" },
    { label: "Raw Fares", icon: Database, href: "/fares" },
    { label: "ATF Impact", icon: Layers, href: "/atf" },
    { label: "Data Quality", icon: Layers, href: "/quality" },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[#fafafa] border-r border-[#f1f5f9] flex flex-col py-6 px-4 z-50">
      <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer">
        <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="SkyIndex Logo" className="w-full h-full object-contain scale-[1.3]" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-gray-900">SkyIndex</h1>
          <p className="text-xs text-indigo-500 font-medium">SIH-26056 Workspace</p>
        </div>
      </div>
      {/* New Split Structure Navigation */}
      <nav className="flex gap-3 relative">
        {/* Continuous background rail for icons */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100/50 rounded-full z-0"></div>
        
        {/* Icons Column */}
        <div className="flex flex-col w-10 z-10 relative">
          {links.map((link) => {
            const isActive = router.pathname === link.href;
            return (
              <Link 
                key={`icon-${link.href}`} 
                href={link.href} 
                className={`h-10 w-10 flex items-center justify-center rounded-full mb-1.5 transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                title={link.label}
              >
                <link.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            );
          })}
        </div>

        {/* Text Column */}
        <div className="flex flex-col flex-1 z-10">
          {links.map((link) => {
            const isActive = router.pathname === link.href;
            return (
              <Link 
                key={`text-${link.href}`} 
                href={link.href} 
                className={`h-10 flex items-center px-4 rounded-full mb-1.5 text-sm transition-all ${isActive ? 'bg-white font-medium text-black shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:text-black'}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 shadow-sm">
        <h4 className="text-sm font-semibold mb-1 text-gray-900">Pipeline Status</h4>
        <p className="text-xs text-gray-500 mb-4">Real-time scraping is active.</p>
        <button onClick={() => setIsLogsOpen(true)} className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-200/50">
          View Logs
        </button>
      </div>

      {isLogsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live Pipeline Logs
              </h2>
              <button onClick={() => setIsLogsOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-gray-900 text-green-400 font-mono text-xs overflow-y-auto h-80 whitespace-pre">
              {`[2026-09-02 05:00:01] INFO  [scheduler] Triggering hourly pipeline run...
[2026-09-02 05:00:03] INFO  [scraper] Connecting to proxy pool (12 active nodes)
[2026-09-02 05:00:05] INFO  [scraper] Fetching DEL-BOM fares (T+1 to T+45 windows)
[2026-09-02 05:00:18] INFO  [scraper] Success: Extracted 243 fare nodes for DEL-BOM
[2026-09-02 05:00:20] INFO  [scraper] Fetching BLR-HYD fares (T+1 to T+45 windows)
[2026-09-02 05:00:33] INFO  [scraper] Success: Extracted 198 fare nodes for BLR-HYD
[2026-09-02 05:01:45] INFO  [processor] Starting data cleaning and anomaly detection
[2026-09-02 05:01:46] WARN  [processor] Dropped 12 anomalous outliers (fares > 3σ)
[2026-09-02 05:01:48] INFO  [indexer] Computing Jevons Geometric Mean for 8 routes...
[2026-09-02 05:01:50] INFO  [indexer] Computed Base APIx Index: 123.39
[2026-09-02 05:01:51] INFO  [db] Committed 1892 new fare records to SQLite
[2026-09-02 05:01:51] INFO  [scheduler] Pipeline run complete. Next run in 58m 09s...`}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
