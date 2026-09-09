import { Info } from "lucide-react";

export function InfoTooltip({ text, position = "center" }: { text: string, position?: "center" | "left" }) {
  return (
    <span className="relative group inline-flex items-center ml-1.5 cursor-pointer align-middle">
      <Info size={14} className="text-slate-400 hover:text-indigo-500 transition-colors" />
      
      <span className={`absolute top-full mt-2.5 w-60 p-3 bg-white border border-slate-200 text-slate-700 text-xs leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-xl text-center pointer-events-none font-medium tracking-wide ${position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
        {text}
        <span className={`absolute -top-[6px] w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45 ${position === 'left' ? 'right-3' : 'left-1/2 -translate-x-1/2'}`}></span>
      </span>
    </span>
  );
}
