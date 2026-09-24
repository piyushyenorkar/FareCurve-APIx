import Link from "next/link";
import { Home, Compass, Plane, Bot, LineChart, TrendingUp, AlertTriangle, ShieldCheck, Ticket, Fuel, ListChecks, MapPin, Terminal } from "lucide-react";
import { useRouter } from "next/router";

export default function Sidebar() {
  const router = useRouter();
  const links = [
    { label: "Home", icon: Home, href: "/" },
    { label: "FareCurve AI", icon: Bot, href: "/ai" },
    { label: "Route Explorer", icon: Compass, href: "/routes" },
    { label: "Booking Curve", icon: LineChart, href: "/booking-curve" },
    { label: "Sector Heatmap", icon: MapPin, href: "/heatmap" },
    { label: "Raw Fares", icon: Ticket, href: "/fares" },
    { label: "Forecasts", icon: TrendingUp, href: "/forecast" },
    { label: "ATF Impact", icon: Fuel, href: "/atf" },
    { label: "Anomalies", icon: AlertTriangle, href: "/anomalies" },
    { label: "Compliance", icon: ShieldCheck, href: "/compliance" },
    { label: "Data Quality", icon: ListChecks, href: "/quality" },
    { label: "API for NSO/RBI", icon: Terminal, href: "/api-docs" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-height: 900px) {
          .fs-header {
            margin-top: 2.5rem !important;
            margin-bottom: 2rem !important;
          }
        }
      `}} />
      <aside className="w-64 h-screen fixed left-0 top-0 bg-gradient-to-br from-[#e0f2fe]/90 to-white/90 backdrop-blur-md rounded-r-3xl flex flex-col py-4 px-4 z-50 border border-sky-100 border-l-0">
            <div className="flex flex-col gap-1 mb-6 px-2 cursor-pointer fs-header transition-all">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <img src="/FareCurve.png" alt="FareCurve Logo" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-none">FareCurve</h1>
        </div>
        <p className="text-[10px] text-slate-500 -mt-1 font-medium leading-tight ml-2 whitespace-nowrap" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>Every fare has a story across time</p>
      </div>
      {/* Navigation */}
      <nav className="flex relative flex-1 flex-col justify-center">
        <div className="flex gap-2 relative py-2">
          {/* Continuous background rail for icons */}
          <div className="absolute left-1 top-0 bottom-0 w-12 bg-white rounded-full z-0 shadow-md"></div>

          {/* Icons Column */}
          <div className="flex flex-col w-10 z-10 relative ml-2">
          {links.map((link) => {
            const isActive = router.pathname === link.href;
            return (
              <Link
                key={`icon-${link.href}`}
                href={link.href}
                className={`h-10 w-10 flex items-center justify-center rounded-full mb-1.5 transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                title={link.label}
              >
                <link.icon size={link.icon === Bot ? 22 : 18} strokeWidth={isActive ? 2.5 : 2} />
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
        </div>
      </nav>
</aside>
    </>
  );
}
