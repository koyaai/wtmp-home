import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

const sevColor = {
  critical: "text-rose-600 bg-rose-50",
  warning: "text-amber-600 bg-amber-50",
  info: "text-slate-600 bg-slate-100",
};
const sevRank = { critical: 0, warning: 1, info: 2 };

export default function OpenAlerts({ alerts, onResolve, resolvingId }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...alerts].sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9));
  const shown = expanded ? sorted : sorted.slice(0, 5);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h2 className="font-semibold text-slate-700 text-sm">Open Alerts ({alerts.length})</h2>
        <span className="text-xs text-slate-500">
          {alerts.filter((a) => a.severity === "critical").length} critical ·{" "}
          {alerts.filter((a) => a.severity === "warning").length} warning
        </span>
      </div>
      <div className="space-y-2">
        {shown.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sevColor[a.severity] || sevColor.info}`}>
              {a.severity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {a.subaccount_name}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {a.month_key} · {a.issue_type.replace(/_/g, " ")}
                </span>
              </p>
              <p className="text-sm text-slate-600">{a.description}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={resolvingId === a.id} onClick={() => onResolve(a.id)} className="text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Resolve
            </Button>
          </div>
        ))}
        {!shown.length && <p className="text-sm text-slate-400 py-4 text-center">No open alerts.</p>}
      </div>
      {alerts.length > 5 && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-2 text-xs text-blue-600 flex items-center gap-1">
          {expanded ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show less
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" /> Show all ({alerts.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}