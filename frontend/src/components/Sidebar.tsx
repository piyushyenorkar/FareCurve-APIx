import Link from "next/link";
import { Home, Compass, Activity, ShieldCheck, Database, Layers } from "lucide-react";
import { useRouter } from "next/router";

export default function Sidebar() {
  const router = useRouter();
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
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold shadow-sm">
          A
        </div>
        <div>
          <h1 className="font-semibold text-sm">APIx Project</h1>
          <p className="text-xs text-gray-500">SIH-26056 Workspace</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = router.pathname === link.href;
          const activeClass = isActive 
            ? "bg-white font-medium text-black shadow-sm border border-gray-100" 
            : "text-gray-600 hover:bg-gray-50 hover:text-black border border-transparent";
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm transition-all ${activeClass}`}>
              <link.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="sarvam-card p-4 mt-auto">
        <h4 className="text-sm font-semibold mb-1">Pipeline Status</h4>
        <p className="text-xs text-gray-600 mb-4">Real-time scraping is active.</p>
        <button className="w-full py-2.5 bg-black text-white rounded-full text-xs font-semibold shadow-md hover:bg-gray-800 transition-colors">
          View Logs
        </button>
      </div>
    </aside>
  );
}
