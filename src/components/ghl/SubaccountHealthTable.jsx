import React from "react";
import { metricLevels, overallLevel, LEVEL_COLORS } from "@/utils/ghlAudit";
import { RefreshCw, Settings, TrendingUp } from "lucide-react";

const COLUMNS = [
  { key: "missed_calls", label: "Missed Calls" },
  { key: "unread", label: "Unread" },
  { key: "workflows", label: "Workflow Err" },
  { key: "email", label: "Email Deliv" },
  { key: "sms", label: "SMS Deliv" },
  { key: "cal_cr", label: "Cancel/Resched" },
  { key: "integration", label: "Integrations" },
];

function Flag({ level, label, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md border text-xs font-semibold ${LEVEL_COLORS[level]}`}
    >
      {label}
    </span>
  );
}

export default function SubaccountHealthTable({
  clients,
  reports,
  selectedMonth,
  onRunOne,
  onShowTrends,
  onEditSettings,
  running,
}) {
  const reportByClient = {};
  for (const r of reports) {
    if (r.month_key === selectedMonth) reportByClient[r.client_id] = r;
  }

  const sorted = [...clients].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Subaccount</th>
            <th className="text-center font-semibold px-2 py-3">Forms</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="text-center font-semibold px-2 py-3 whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="text-center font-semibold px-2 py-3">Overall</th>
            <th className="text-right font-semibold px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                No GHL-enabled clients yet. Add a ghl_location_id + ghl_api_key to a client, then run an audit.
              </td>
            </tr>
          )}
          {sorted.map((c) => {
            const report = reportByClient[c.id];
            const levels = report ? metricLevels(report, c) : {};
            const overall = report ? overallLevel(levels) : "grey";
            return (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  {c.ghl_audit_active === false && (
                    <span className="text-xs text-slate-400">audit paused</span>
                  )}
                </td>
                <td className="px-2 py-3 text-center text-slate-600">
                  {report?.form_submissions != null ? report.form_submissions : "—"}
                </td>
                {COLUMNS.map((col) => {
                  const lv = levels[col.key] || { level: "grey", label: "—" };
                  return (
                    <td key={col.key} className="px-2 py-3 text-center">
                      <Flag level={lv.level} label={lv.label} title={`${col.label}: ${lv.label}`} />
                    </td>
                  );
                })}
                <td className="px-2 py-3 text-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${{
                      red: "bg-rose-500",
                      yellow: "bg-amber-400",
                      green: "bg-emerald-500",
                      grey: "bg-slate-300",
                    }[overall]}`}
                    title={`Overall: ${overall}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onRunOne(c.id)}
                      disabled={!!running}
                      title="Run audit now"
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    >
                      <RefreshCw className={`w-4 h-4 ${running === c.id ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => onShowTrends(c.id)}
                      title="Trends"
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditSettings(c)}
                      title="Thresholds"
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}