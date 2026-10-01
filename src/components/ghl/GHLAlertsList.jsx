import { CheckCircle2, Loader2 } from "lucide-react";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
const SEVERITY_STYLE = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

export default function GHLAlertsList({ alerts, onResolve, resolvingId }) {
  const sorted = [...alerts].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  if (sorted.length === 0) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-sm text-slate-400">No open alerts. Everything looks healthy.</div>;
  }

  return (
    <div className="space-y-2.5">
      {sorted.map(a => (
        <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info} flex-shrink-0`}>
            {a.severity}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-800 text-sm">{a.client_name}</p>
              <span className="text-[11px] text-slate-400">{a.month_key}</span>
              <span className="text-[11px] text-slate-400 capitalize">{a.issue_type.replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{a.description}</p>
          </div>
          <button
            onClick={() => onResolve(a)}
            disabled={resolvingId === a.id}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 flex-shrink-0"
          >
            {resolvingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Resolve</>}
          </button>
        </div>
      ))}
    </div>
  );
}