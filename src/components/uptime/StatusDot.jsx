export default function StatusDot({ status, size = "sm" }) {
  const dot = "w-2.5 h-2.5 rounded-full";
  const text = size === "sm" ? "text-xs" : "text-sm";
  if (status === "up") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${text} font-medium text-emerald-700`}>
        <span className={`${dot} bg-emerald-500`} /> Up
      </span>
    );
  }
  if (status === "down") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${text} font-medium text-red-700`}>
        <span className={`${dot} bg-red-500`} /> Down
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${text} font-medium text-slate-400`}>
      <span className={`${dot} bg-slate-300`} /> Pending
    </span>
  );
}