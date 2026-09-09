import { useState, useRef, useEffect } from "react";

const AIRPORTS = [
  { code: "DEL", city: "Delhi" }, { code: "BOM", city: "Mumbai" }, { code: "BLR", city: "Bengaluru" },
  { code: "CCU", city: "Kolkata" }, { code: "HYD", city: "Hyderabad" }, { code: "MAA", city: "Chennai" },
  { code: "PNQ", city: "Pune" }, { code: "AMD", city: "Ahmedabad" }, { code: "GOI", city: "Goa" },
  { code: "LKO", city: "Lucknow" }, { code: "SXR", city: "Srinagar" }, { code: "JAI", city: "Jaipur" },
  { code: "PAT", city: "Patna" }, { code: "BBI", city: "Bhubaneswar" }, { code: "GAU", city: "Guwahati" },
  { code: "COK", city: "Kochi" }, { code: "TRV", city: "Thiruvananthapuram" }, { code: "IXC", city: "Chandigarh" },
  { code: "ATQ", city: "Amritsar" }, { code: "IXB", city: "Bagdogra" }
];

export function AirportSearch({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = AIRPORTS.filter(a => 
    a.city.toLowerCase().includes(search.toLowerCase()) || 
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input 
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{ padding: "0.5rem 1rem", borderRadius: "999px", border: "1px solid #e2e8f0", fontSize: "0.8rem", width: "130px", outline: "none", color: "#0f172a" }}
      />
      {open && filtered.length > 0 && (
        <div className="thin-scrollbar" style={{
          position: "absolute", top: "100%", left: 0, marginTop: "6px", width: "180px",
          background: "#fff", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0", zIndex: 50, maxHeight: "250px", overflowX: "hidden", overflowY: "auto"
        }}>
          {filtered.map(a => (
            <div 
              key={a.code}
              onClick={() => {
                onChange(a.code);
                setSearch(a.code);
                setOpen(false);
              }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer", borderBottom: "1px solid #f8fafc"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <strong style={{ color: "#0f172a" }}>{a.code}</strong> 
              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{a.city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
