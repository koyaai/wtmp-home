import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { monthLabel } from "@/utils/ghlAudit";

const SEVERITY_META = {
  critical: { icon: AlertOctagon, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  info: { icon: Info, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
const ISSUE_LABELS = {
  missed_calls: "Missed Calls",
  unread_conversations: "Unread Conversations",
  workflow_errors: "Workflow Errors",
  email_deliverability: "Email Deliverability",
  sms_deliverability: "SMS Deliverability",
  cancelled_rescheduled: "Cancelled/Rescheduled",
  integration: "Integration",
};

export default function GHLAlertsList({ alerts, clients, onResolve, resolving }) {
  const [clientFilter, setClientFilter] = useState("all");

  const sorted = useMemo(() => {
    return [...alerts]
      .filter((a) => clientFilter === "all" || a.client_id === clientFilter)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [alerts, clientFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="all">All subaccounts</option>
          {[...clients]
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <span className="text-sm text-slate-500">{sorted.length} open alert(s)</span>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="text-center text-slate-400 py-12 border border-dashed border-slate-200 rounded-xl">
            No open alerts. 🎉
          </div>
        )}
        {sorted.map((a) => {
          const meta = SEVERITY_META[a.severity] || SEVERITY_META.info;
          const Icon = meta.icon;
          return (
            <div key={a.id} className={`rounded-xl border p-4 flex items-start gap-3 ${meta.bg}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${meta.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{a.client_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {ISSUE_LABELS[a.issue_type] || a.issue_type}
                  </span>
                  <span className="text-xs text-slate-500">{monthLabel(a.month_key)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{a.description}</p>
              </div>
              <button
                onClick={() => onResolve(a.id)}
                disabled={!!resolving}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-40 flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Resolve
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}