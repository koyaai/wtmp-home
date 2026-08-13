import { DATE_PRESETS } from "@/utils/leadDateRange";
import { cn } from "@/lib/utils";

export default function LeadFilters({ preset, onPresetChange, rangeLabel }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DATE_PRESETS.map((p) => {
        const active = preset === p.key;
        return (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {p.label}
          </button>
        );
      })}
      {rangeLabel && (
        <span className="text-xs text-slate-400 ml-1">{rangeLabel}</span>
      )}
    </div>
  );
}