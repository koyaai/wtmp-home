// Shared helpers for month-over-month report comparisons

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Parse a value that may be "$1,200", "1,918", "43.3%", "N/A", "—" to a number
export function parseNumeric(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const s = String(value).replace(/[$,%\s]/g, "").trim();
  if (s === "" || s === "N/A" || s === "—" || s === "-") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

// Compute delta between current and prior values
// Returns { direction, diff, deltaPct } or null if not comparable
export function computeDelta(current, prior) {
  const c = parseNumeric(current);
  const p = parseNumeric(prior);
  if (c == null || p == null) return null;
  const diff = c - p;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const deltaPct = p !== 0 ? Math.round((diff / Math.abs(p)) * 100) : null;
  return { direction, diff, deltaPct };
}

// Get a nested value by dot path, e.g. getPath(obj, "seo.gbp_metrics.impressions")
export function getPath(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Returns { month, year } for the month immediately preceding the given month/year
export function getPriorMonthYear(month, year) {
  const idx = MONTHS.indexOf(month);
  if (idx === -1) return null;
  const priorIdx = idx === 0 ? 11 : idx - 1;
  const priorYear = idx === 0 ? Number(year) - 1 : Number(year);
  return { month: MONTHS[priorIdx], year: priorYear };
}

// Key metrics for the "Month at a Glance" strip, in priority order
export const GLANCE_METRICS = [
  { path: "leads.total_leads", label: "New Leads" },
  { path: "seo.organic_clicks", label: "Organic Clicks" },
  { path: "seo.ga4_metrics.sessions", label: "Website Sessions" },
  { path: "ppc.total_spend", label: "Ad Spend" },
  { path: "seo.gbp_metrics.impressions", label: "GBP Impressions" },
];