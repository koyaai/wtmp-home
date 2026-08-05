import { isClientStale, getStaleDays, getStaleThreshold } from "@/utils/clientActivity";

export default function StaleBadge({ client, lastActivityDate, className = "" }) {
  if (!isClientStale(client, lastActivityDate)) return null;
  const days = getStaleDays(client, lastActivityDate);
  const threshold = getStaleThreshold(client.program);
  const tooltip = `No activity for ${days ?? "?"} days (threshold: ${threshold} days)`;
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 ${className}`}
    >
      ⚠ Stale
    </span>
  );
}