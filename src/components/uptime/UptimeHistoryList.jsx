import { formatManilaDateTime } from "@/utils/uptime";

export default function UptimeHistoryList({
  checks,
  showSiteName = false,
  emptyMsg = "No checks recorded yet.",
}) {
  if (!checks || checks.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">{emptyMsg}</p>;
  }
  return (
    <ul className="divide-y divide-slate-50">
      {checks.map((c, i) => (
        <li
          key={c.id || i}
          className="flex flex-wrap items-center gap-3 py-2.5 text-sm"
        >
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              c.status === "up"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                c.status === "up" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            {c.status === "up" ? "Up" : "Down"}
          </span>
          {showSiteName && c.website_name && (
            <span className="text-xs text-slate-500 font-medium">
              {c.website_name}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {formatManilaDateTime(c.checked_at)}
          </span>
          <span className="text-xs text-slate-400 ml-auto">
            {c.response_time_ms != null ? `${c.response_time_ms} ms` : "—"}
          </span>
          <span className="text-xs text-slate-400">
            {c.response_code != null ? `HTTP ${c.response_code}` : "—"}
          </span>
          {c.error_message && (
            <span className="text-xs text-red-500 w-full mt-0.5">
              {c.error_message}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}