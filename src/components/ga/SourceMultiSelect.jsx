import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function SourceMultiSelect({ sources, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSelected = selected.length === 0;
  const label = allSelected
    ? "All Sources"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} sources selected`;

  const toggle = (s) => {
    if (selected.includes(s)) onChange(selected.filter(x => x !== s));
    else onChange([...selected, s]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[170px]"
      >
        <span className="flex-1 text-left truncate text-slate-700">{label}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-slate-50"
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </span>
            <span className="font-medium text-slate-700">All Sources</span>
          </button>
          <div className="border-t border-slate-100" />
          {sources.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">No sources in current range</div>
          )}
          {sources.map(s => {
            const sel = selected.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggle(s)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-slate-50"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate text-slate-700">{s}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}