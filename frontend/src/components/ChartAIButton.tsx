import { useRouter } from 'next/router';
import { Bot } from 'lucide-react';

export function ChartAIButton({ contextQuery }: { contextQuery: string }) {
  const router = useRouter();

  return (
    <div className="relative group inline-block">
      <button
        onClick={() => router.push(`/ai?q=${encodeURIComponent(contextQuery)}`)}
        style={{
          background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
          border: "none",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          transition: "transform 0.2s ease",
          flexShrink: 0
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        <Bot size={20} />
      </button>
      
      <span className="absolute top-full mt-2.5 w-max px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl text-center pointer-events-none font-medium tracking-wide right-0">
        Analyze with FareCurve AI
        <span className="absolute -top-[6px] right-3 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45"></span>
      </span>
    </div>
  );
}
