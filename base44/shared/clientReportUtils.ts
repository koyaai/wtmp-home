// Shared helpers for client report functions (EOD + Weekly State).
// Plain module — no Deno.serve. Imported by backend functions via relative path.

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeItem(item) {
  if (typeof item === "string") return { text: item, date: null, resolved: false };
  return item;
}

// Days an item has been open. Uses the item's own date if present, otherwise
// falls back to the insight's created date.
export function daysOpen(item, insight) {
  const ref = item.date
    ? new Date(item.date).getTime()
    : insight?.created_date
      ? new Date(insight.created_date).getTime()
      : null;
  if (!ref) return null;
  return Math.max(0, Math.floor((Date.now() - ref) / DAY_MS));
}

export function ageLabel(days) {
  if (days === null) return "";
  if (days === 0) return " · today";
  if (days === 1) return " · 1 day open";
  return ` · ${days} days open`;
}

export function buildMentions(client) {
  const ids = [client?.csm_slack_id, client?.csa_slack_id].filter(Boolean).map((id) => `<@${id}>`);
  return ids.length ? ids.join(" ") : "";
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function fmtNum(n) {
  if (n === null || n === undefined) return 0;
  return Number(n).toLocaleString("en-US");
}

export function fmtMoney(n) {
  if (!n) return "$0";
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}