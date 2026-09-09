import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  logo?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  icon?: ReactNode;
}

export function CustomDropdown({ options, value, onChange, icon }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors"
      >
        {icon && <span className="text-gray-500">{icon}</span>}
        {selectedOption.logo && (
          <img src={selectedOption.logo} alt="" className="w-4 h-4 object-contain rounded-sm" />
        )}
        <span className="font-semibold text-gray-900">{selectedOption.label}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="thin-scrollbar absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-slate-200 z-50 max-h-[250px] overflow-x-hidden overflow-y-auto">
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer border-b border-gray-50 hover:bg-blue-50 transition-colors"
            >
              {opt.logo ? (
                <img src={opt.logo} alt="" className="w-5 h-5 object-contain rounded-sm shadow-sm bg-white" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400">{opt.label[0]}</span>
                </div>
              )}
              <span className={`font-medium ${value === opt.value ? 'text-blue-600' : 'text-slate-700'}`}>
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
