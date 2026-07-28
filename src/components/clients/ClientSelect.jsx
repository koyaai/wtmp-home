import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Searchable, alphabetized client picker.
 * Drop-in replacement for client <select> dropdowns.
 * - Sorts clients alphabetically (case-insensitive).
 * - Type-to-search filter inside the dropdown.
 * - onChange receives the selected client's id (string), matching the
 *   native <select> value contract and shadcn onValueChange contract.
 */
export default function ClientSelect({
  clients = [],
  value,
  onChange,
  placeholder = "Select a client…",
  className = "",
  formatLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const sorted = [...clients].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  );

  const selected = sorted.find((c) => c.id === value);

  const filtered = query.trim()
    ? sorted.filter((c) => (c.name || "").toLowerCase().includes(query.toLowerCase()))
    : sorted;

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = (c) => (formatLabel ? formatLabel(c) : c.name);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-left min-w-[180px]"
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>
          {selected ? label(selected) : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">No clients found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                    c.id === value && "bg-blue-50 text-blue-700"
                  )}
                >
                  <span className="truncate">{label(c)}</span>
                  {c.id === value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}