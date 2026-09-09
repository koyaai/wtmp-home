export const DEFAULT_THRESHOLDS = {
  missed_calls: 10,
  unread_conversations: 10,
  cancelled_resched_pct: 30,
};

const THRESHOLD_FIELDS = {
  missed_calls: "ghl_threshold_missed_calls",
  unread_conversations: "ghl_threshold_unread_conversations",
  cancelled_resched_pct: "ghl_threshold_cancelled_resched_pct",
};

export function getThreshold(client, key) {
  const v = client?.[THRESHOLD_FIELDS[key]];
  return v != null && v !== "" ? Number(v) : DEFAULT_THRESHOLDS[key];
}

export function cancelledReschedPct(report) {
  const total =
    (report.cal_new || 0) +
    (report.cal_confirmed || 0) +
    (report.cal_cancelled || 0) +
    (report.cal_rescheduled || 0);
  if (!total) return null;
  return (((report.cal_cancelled || 0) + (report.cal_rescheduled || 0)) / total) * 100;
}

export const LEVEL_COLORS = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-rose-100 text-rose-700 border-rose-200",
  grey: "bg-slate-100 text-slate-400 border-slate-200",
};

const DELIV_MAP = { good: "green", warning: "yellow", failed: "red", unavailable: "grey" };
const INTEG_MAP = { healthy: "green", issue: "red", unavailable: "grey" };

export function metricLevels(report, client) {
  const t = {
    missed_calls: getThreshold(client, "missed_calls"),
    unread_conversations: getThreshold(client, "unread_conversations"),
    cancelled_resched_pct: getThreshold(client, "cancelled_resched_pct"),
  };
  const levels = {};

  if (report.calls_missed == null) levels.missed_calls = { level: "grey", label: "—" };
  else if (report.calls_missed >= t.missed_calls) levels.missed_calls = { level: "red", label: String(report.calls_missed) };
  else if (report.calls_missed >= t.missed_calls * 0.7) levels.missed_calls = { level: "yellow", label: String(report.calls_missed) };
  else levels.missed_calls = { level: "green", label: String(report.calls_missed) };

  if (report.unread_conversations == null) levels.unread = { level: "grey", label: "—" };
  else if (report.unread_conversations >= t.unread_conversations) levels.unread = { level: "red", label: String(report.unread_conversations) };
  else if (report.unread_conversations >= t.unread_conversations * 0.7) levels.unread = { level: "yellow", label: String(report.unread_conversations) };
  else levels.unread = { level: "green", label: String(report.unread_conversations) };

  if (report.workflows_with_errors == null) levels.workflows = { level: "grey", label: "—" };
  else if (report.workflows_with_errors > 0) levels.workflows = { level: "red", label: String(report.workflows_with_errors) };
  else levels.workflows = { level: "green", label: "0" };

  levels.email = { level: DELIV_MAP[report.email_deliverability] || "grey", label: report.email_deliverability || "—" };
  levels.sms = { level: DELIV_MAP[report.sms_deliverability] || "grey", label: report.sms_deliverability || "—" };
  levels.integration = { level: INTEG_MAP[report.integration_status] || "grey", label: report.integration_status || "—" };

  const pct = cancelledReschedPct(report);
  if (pct == null) levels.cal_cr = { level: "grey", label: "—" };
  else if (pct >= t.cancelled_resched_pct) levels.cal_cr = { level: "red", label: pct.toFixed(0) + "%" };
  else if (pct >= t.cancelled_resched_pct * 0.8) levels.cal_cr = { level: "yellow", label: pct.toFixed(0) + "%" };
  else levels.cal_cr = { level: "green", label: pct.toFixed(0) + "%" };

  return levels;
}

export function overallLevel(levels) {
  const order = { red: 3, yellow: 2, green: 1, grey: 0 };
  let worst = "grey";
  for (const k in levels) {
    if (order[levels[k].level] > order[worst]) worst = levels[k].level;
  }
  return worst;
}

export function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(`${y}-${m}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}