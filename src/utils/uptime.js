// Shared uptime helpers — formatting (Asia/Manila), uptime %, pill styling,
// and current-incident duration. Used by the dashboard, detail page, and
// the ClientDetail Uptime tab.

export function formatManilaDateTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uptimePercent(checks, windowHours) {
  if (!checks || checks.length === 0) return null;
  const cutoff = Date.now() - windowHours * 3600 * 1000;
  const inWindow = checks.filter((c) => new Date(c.checked_at).getTime() >= cutoff);
  if (inWindow.length === 0) return null;
  const up = inWindow.filter((c) => c.status === "up").length;
  return (up / inWindow.length) * 100;
}

export function uptimePillClass(pct) {
  if (pct === null || pct === undefined) return "bg-slate-100 text-slate-500";
  if (pct >= 99) return "bg-emerald-100 text-emerald-700";
  if (pct >= 95) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function formatPct(pct) {
  if (pct === null || pct === undefined) return "—";
  return `${pct.toFixed(1)}%`;
}

// Duration of the current ongoing downtime, in ms (or null if currently up).
export function currentIncidentDuration(checks) {
  if (!checks || checks.length === 0) return null;
  const sorted = [...checks].sort(
    (a, b) => new Date(b.checked_at) - new Date(a.checked_at)
  );
  if (sorted[0].status !== "down") return null;
  let i = 0;
  while (i < sorted.length && sorted[i].status === "down") i++;
  const start = sorted[i - 1].checked_at;
  return Date.now() - new Date(start).getTime();
}

export function formatDuration(ms) {
  if (ms == null) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}