import { motion } from "framer-motion";

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  layoutIdPrefix?: string;
}

export function TimeFilter({ value, onChange, options = ['7D', '30D'], layoutIdPrefix = "timeFilter" }: TimeFilterProps) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-full relative">
       {options.map(filter => (
         <button 
           key={filter}
           onClick={() => onChange(filter)}
           className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors z-10 ${value === filter ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
         >
           {value === filter && (
             <motion.div
               layoutId={layoutIdPrefix}
               className="absolute inset-0 bg-white rounded-full shadow-sm border border-gray-200 -z-10"
               initial={false}
               transition={{ type: "spring", stiffness: 500, damping: 30 }}
             />
           )}
           {filter}
         </button>
       ))}
    </div>
  );
}
