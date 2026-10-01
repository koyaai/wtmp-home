import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw } from "lucide-react";

// Status dot: green / yellow / red / manual / gray
function Dot({ tone, label }) {
  const map = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-rose-500",
    manual: "bg-slate-300",
    gray: "bg-slate-300",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${map[tone] || map.gray}`} />
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

function valColor(value, threshold) {
  if (value == null) return { tone: "gray", label: "—" };
  if (value > threshold) return { tone: "red", label: value };
  if (value > threshold / 2) return { tone: "yellow", label: value };
  return { tone: "green", label: value };
}

export default function SubaccountHealthTable({ clients, reportsByClient, settings, onToggleActive, togglingId, onRunOne, runningId }) {
  const thr = {
    missed: settings?.threshold_missed_calls ?? 10,
    unread: settings?.threshold_unread_conversations ?? 10,
    cancelPct: settings?.threshold_cancelled_resched_pct ?? 30,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Subaccount</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Monitor</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Forms</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Appointments</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Unread</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Missed Calls</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Workflows</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Email/SMS</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs">Integrations</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const r = reportsByClient[c.id];
              const active = !!c.ghl_monitor_active;
              const cancelResched = r ? (r.cal_cancelled + r.cal_rescheduled) : 0;
              const total = r?.cal_total || 0;
              const pct = total > 0 ? (cancelResched / total) * 100 : 0;
              const apptTone = !r ? "gray" : (total === 0 ? "green" : pct > thr.cancelPct ? "red" : pct > thr.cancelPct / 2 ? "yellow" : "green");
              const unread = valColor(r?.unread_conversations, thr.unread);
              const missed = valColor(r?.calls_missed, thr.missed);
              const integ = !r ? "gray" : r.integration_status === "issue" ? "red" : r.integration_status === "healthy" ? "green" : "gray";

              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                    <p className="text-[11px] text-slate-400">loc: {c.ghl_location_id?.slice(0, 10) || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {togglingId === c.id ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
                      <Switch checked={active} onCheckedChange={() => onToggleActive(c)} />
                    )}
                  </td>
                  <td className="px-3 py-2.5"><Dot tone={r?.form_submissions != null ? "green" : "gray"} label={r?.form_submissions ?? "—"} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${apptTone === "red" ? "bg-rose-500" : apptTone === "yellow" ? "bg-amber-400" : apptTone === "green" ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="text-xs text-slate-600">
                        {r ? `${r.cal_new}n / ${r.cal_confirmed}c / ${r.cal_cancelled}x / ${r.cal_rescheduled}r` : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><Dot tone={unread.tone} label={unread.label} /></td>
                  <td className="px-3 py-2.5"><Dot tone={missed.tone} label={missed.label} /></td>
                  <td className="px-3 py-2.5"><Dot tone="manual" label="Manual" /></td>
                  <td className="px-3 py-2.5"><Dot tone="manual" label="Manual" /></td>
                  <td className="px-3 py-2.5"><Dot tone={integ} label={integ === "red" ? "Issue" : integ === "green" ? "Healthy" : "—"} /></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onRunOne(c)} disabled={runningId === c.id || !active} className="text-slate-400 hover:text-slate-700 disabled:opacity-40" title="Run audit for this subaccount">
                      {runningId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-400">No subaccounts configured. Add a GHL location ID + API key to a client to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}