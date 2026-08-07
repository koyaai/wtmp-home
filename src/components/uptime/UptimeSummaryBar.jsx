import {
  uptimePercent,
  formatPct,
  uptimePillClass,
  currentIncidentDuration,
  formatDuration,
} from "@/utils/uptime";
import { Gauge, Timer, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function UptimeSummaryBar({ checks }) {
  const up24 = uptimePercent(checks, 24);
  const up7d = uptimePercent(checks, 168);

  const cutoff7d = Date.now() - 7 * 24 * 3600 * 1000;
  const upChecks7d = (checks || []).filter(
    (c) => c.status === "up" && new Date(c.checked_at).getTime() >= cutoff7d
  );
  const avgResp = upChecks7d.length
    ? Math.round(
        upChecks7d.reduce((s, c) => s + (c.response_time_ms || 0), 0) /
          upChecks7d.length
      )
    : null;

  const incident = currentIncidentDuration(checks);

  const stats = [
    {
      label: "Uptime 24h",
      value: formatPct(up24),
      tone: uptimePillClass(up24),
      icon: Gauge,
    },
    {
      label: "Uptime 7d",
      value: formatPct(up7d),
      tone: uptimePillClass(up7d),
      icon: Gauge,
    },
    {
      label: "Avg Response (7d)",
      value: avgResp !== null ? `${avgResp} ms` : "—",
      tone: "bg-slate-100 text-slate-600",
      icon: Timer,
    },
    {
      label: "Current Incident",
      value: incident ? formatDuration(incident) : "None",
      tone: incident
        ? "bg-red-100 text-red-700"
        : "bg-emerald-100 text-emerald-700",
      icon: incident ? AlertTriangle : CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </div>
          <div
            className={`mt-2 inline-block text-sm font-semibold px-2.5 py-1 rounded-full ${s.tone}`}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}