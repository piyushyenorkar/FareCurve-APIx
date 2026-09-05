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
    <aside className="w-64 h-screen fixed left-0 top-0 bg-blue-50 flex flex-col py-6 px-4 z-50">
      <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
          <img src="/FareCurve.png" alt="FareCurve Logo" className="w-full h-full object-contain scale-[1.2]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-none">FareCurve</h1>
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
    </aside>
  );
}
