// Date range presets for the Lead Tracker filter.
// Weeks are Mon–Sun. "This Month" spans the current calendar month.

export const DATE_PRESETS = [
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "last_2_weeks", label: "Last 2 Weeks" },
  { key: "this_month", label: "This Month" },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Monday of the week containing the given date
function mondayOf(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

export function getDateRange(presetKey) {
  const now = new Date();
  let start, end;

  switch (presetKey) {
    case "this_week": {
      start = mondayOf(now);
      end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
      break;
    }
    case "last_week": {
      const thisMon = mondayOf(now);
      start = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 7);
      end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
      break;
    }
    case "last_2_weeks": {
      const thisMon = mondayOf(now);
      start = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 14);
      end = endOfDay(new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 1));
      break;
    }
    case "this_month":
    default: {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    }
  }

  return { start, end, label: formatRangeLabel(start, end) };
}

export function formatRangeLabel(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return sameMonth ? `${fmt(s)} – ${e.getDate()}` : `${fmt(s)} – ${fmt(e)}`;
}

// Inclusive date-range check for an ISO string or Date
export function inRange(value, start, end) {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}