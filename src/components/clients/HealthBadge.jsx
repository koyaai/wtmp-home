import { HEALTH } from "@/utils/clientHealth";

export default function HealthBadge({ score, showDot = false, className = "" }) {
  if (!score) return null;
  const h = HEALTH[score];
  if (!h) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${h.color} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />}
      {h.label}
    </span>
  );
}