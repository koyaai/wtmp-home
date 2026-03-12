import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckSquare, CheckCircle2, Calendar, Clock } from "lucide-react";
import { format, isPast, differenceInDays, parseISO } from "date-fns";

function normalizeItem(item) {
  if (typeof item === "string") return { text: item, date: null, resolved: false };
  return item;
}

function DeadlineBadge({ date }) {
  if (!date) return null;
  const d = parseISO(date);
  const diff = differenceInDays(d, new Date());
  if (isPast(d) && diff < 0) {
    return <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue</span>;
  }
  if (diff <= 3) {
    return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Due in {diff}d</span>;
  }
  return <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(d, "MMM d")}</span>;
}

function TrackerItem({ item, type, onToggleResolved }) {
  const isFlag = type === "red_flag";
  const baseStyle = isFlag
    ? { bg: "bg-red-50 border-red-100", text: "text-red-700", resolvedBg: "bg-slate-50 border-slate-200", resolvedText: "text-slate-400" }
    : { bg: "bg-blue-50 border-blue-100", text: "text-blue-700", resolvedBg: "bg-slate-50 border-slate-200", resolvedText: "text-slate-400" };

  const resolved = item.resolved;
  const bg = resolved ? baseStyle.resolvedBg : baseStyle.bg;
  const textColor = resolved ? baseStyle.resolvedText : baseStyle.text;

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${bg} transition-all`}>
      <button onClick={onToggleResolved} className="mt-0.5 flex-shrink-0">
        {resolved
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <div className={`w-4 h-4 rounded-full border-2 ${isFlag ? "border-red-400" : "border-blue-400"}`} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${textColor} ${resolved ? "line-through" : ""}`}>{item.text}</p>
      </div>
      <DeadlineBadge date={item.date} />
    </div>
  );
}

export default function ClientTracker({ clientId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [clientId]);

  const loadInsights = async () => {
    const data = await base44.entities.ClientInsight.filter({ client_id: clientId }, "-created_date");
    setInsights(data);
    setLoading(false);
  };

  const handleToggle = async (insight, type, index) => {
    const items = (insight[type] || []).map(normalizeItem);
    items[index] = { ...items[index], resolved: !items[index].resolved };
    await base44.entities.ClientInsight.update(insight.id, { [type]: items });
    loadInsights();
  };

  // Flatten all todos and red_flags across insights
  const allTodos = [];
  const allRedFlags = [];

  insights.forEach(insight => {
    (insight.todos || []).forEach((item, i) => {
      const norm = normalizeItem(item);
      allTodos.push({ ...norm, insightId: insight.id, index: i, source: insight.source_type, meeting_date: insight.meeting_date });
    });
    (insight.red_flags || []).forEach((item, i) => {
      const norm = normalizeItem(item);
      allRedFlags.push({ ...norm, insightId: insight.id, index: i, source: insight.source_type, meeting_date: insight.meeting_date });
    });
  });

  const openTodos = allTodos.filter(t => !t.resolved);
  const doneTodos = allTodos.filter(t => t.resolved);
  const openFlags = allRedFlags.filter(f => !f.resolved);
  const resolvedFlags = allRedFlags.filter(f => f.resolved);

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200">
        No insights logged yet. Use the Client Insights page to add meeting notes.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Red Flags */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-red-700 text-sm">Red Flags</h3>
          {openFlags.length > 0 && (
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{openFlags.length} open</span>
          )}
        </div>
        <div className="p-4 space-y-2">
          {openFlags.length === 0 && resolvedFlags.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">No red flags — great!</p>
          )}
          {openFlags.map((item, i) => {
            const insight = insights.find(ins => ins.id === item.insightId);
            return (
              <TrackerItem
                key={`flag-${i}`}
                item={item}
                type="red_flags"
                onToggleResolved={() => handleToggle(insight, "red_flags", item.index)}
              />
            );
          })}
          {resolvedFlags.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{resolvedFlags.length} resolved</summary>
              <div className="space-y-2 mt-2">
                {resolvedFlags.map((item, i) => {
                  const insight = insights.find(ins => ins.id === item.insightId);
                  return (
                    <TrackerItem key={`rflag-${i}`} item={item} type="red_flags" onToggleResolved={() => handleToggle(insight, "red_flags", item.index)} />
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* To-Dos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-blue-50">
          <CheckSquare className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-blue-700 text-sm">To-Dos</h3>
          {openTodos.length > 0 && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{openTodos.length} pending</span>
          )}
        </div>
        <div className="p-4 space-y-2">
          {openTodos.length === 0 && doneTodos.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">No to-dos yet.</p>
          )}
          {openTodos.map((item, i) => {
            const insight = insights.find(ins => ins.id === item.insightId);
            return (
              <TrackerItem key={`todo-${i}`} item={item} type="todos" onToggleResolved={() => handleToggle(insight, "todos", item.index)} />
            );
          })}
          {doneTodos.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{doneTodos.length} completed</summary>
              <div className="space-y-2 mt-2">
                {doneTodos.map((item, i) => {
                  const insight = insights.find(ins => ins.id === item.insightId);
                  return (
                    <TrackerItem key={`dtodo-${i}`} item={item} type="todos" onToggleResolved={() => handleToggle(insight, "todos", item.index)} />
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}