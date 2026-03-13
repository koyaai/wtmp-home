import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckSquare, MessageSquare, Calendar, Clock, User, TrendingUp, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, isAfter, addDays } from "date-fns";

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${color.border} ${color.bg}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.icon}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
        <p className={`text-xs ${color.label}`}>{label}</p>
      </div>
    </div>
  );
}

function normalize(item) {
  if (typeof item === "string") return { text: item, resolved: false, date: null, team: null, point_person: null };
  return item;
}

function DeadlineChip({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const soon = addDays(now, 3);
  const overdue = isAfter(now, d);
  const nearDue = !overdue && isAfter(soon, d);
  if (overdue) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>;
  if (nearDue) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Due soon</span>;
  return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>;
}

export default function ClientSnapshot({ clientId }) {
  const [insights, setInsights] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ClientInsight.filter({ client_id: clientId }, "-created_date"),
      base44.entities.CSMUpdate.filter({ client_id: clientId }, "-created_date", 10),
      base44.entities.MeetingNote.filter({ client_id: clientId }, "-meeting_date", 5),
    ]).then(([ins, upd, mtg]) => {
      setInsights(ins);
      setUpdates(upd);
      setMeetings(mtg);
      setLoading(false);
    });
  }, [clientId]);

  const { openTodos, openFlags, resolvedTodos, resolvedFlags } = useMemo(() => {
    const todos = [], flags = [];
    insights.forEach(ins => {
      (ins.todos || []).forEach((t, i) => {
        const n = normalize(t);
        todos.push({ ...n, insightId: ins.id, index: i, meeting_date: ins.meeting_date });
      });
      (ins.red_flags || []).forEach((f, i) => {
        const n = normalize(f);
        flags.push({ ...n, insightId: ins.id, index: i, meeting_date: ins.meeting_date });
      });
    });
    return {
      openTodos: todos.filter(t => !t.resolved),
      resolvedTodos: todos.filter(t => t.resolved),
      openFlags: flags.filter(f => !f.resolved),
      resolvedFlags: flags.filter(f => f.resolved),
    };
  }, [insights]);

  const overdueItems = openTodos.filter(t => t.date && isAfter(new Date(), new Date(t.date)));
  const lastInsight = insights[0];
  const lastMeeting = meetings[0];

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill icon={AlertTriangle} label="Open Red Flags" value={openFlags.length}
          color={{ bg: openFlags.length > 0 ? "bg-red-50" : "bg-slate-50", border: openFlags.length > 0 ? "border-red-200" : "border-slate-200", icon: openFlags.length > 0 ? "bg-red-500" : "bg-slate-400", text: openFlags.length > 0 ? "text-red-700" : "text-slate-700", label: openFlags.length > 0 ? "text-red-500" : "text-slate-400" }} />
        <StatPill icon={CheckSquare} label="Open To-Dos" value={openTodos.length}
          color={{ bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-500", text: "text-blue-700", label: "text-blue-400" }} />
        <StatPill icon={Clock} label="Overdue Items" value={overdueItems.length}
          color={{ bg: overdueItems.length > 0 ? "bg-amber-50" : "bg-slate-50", border: overdueItems.length > 0 ? "border-amber-200" : "border-slate-200", icon: overdueItems.length > 0 ? "bg-amber-500" : "bg-slate-400", text: overdueItems.length > 0 ? "text-amber-700" : "text-slate-700", label: overdueItems.length > 0 ? "text-amber-500" : "text-slate-400" }} />
        <StatPill icon={CheckCircle2} label="Resolved Total" value={resolvedTodos.length + resolvedFlags.length}
          color={{ bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-500", text: "text-emerald-700", label: "text-emerald-400" }} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Open Red Flags */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Open Red Flags</h3>
            {openFlags.length > 0 && <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{openFlags.length}</span>}
          </div>
          <div className="divide-y divide-slate-50">
            {openFlags.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No open red flags — great!</p>
            )}
            {openFlags.slice(0, 5).map((f, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-sm text-slate-700">{f.text}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {f.team && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f.team}</span>}
                  {f.point_person && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{f.point_person}</span>}
                  <DeadlineChip date={f.date} />
                </div>
              </div>
            ))}
            {openFlags.length > 5 && (
              <p className="text-xs text-slate-400 text-center py-2">+{openFlags.length - 5} more — see Tracker tab</p>
            )}
          </div>
        </div>

        {/* Open To-Dos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100 bg-blue-50">
            <CheckSquare className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-blue-700">Pending To-Dos</h3>
            {openTodos.length > 0 && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{openTodos.length}</span>}
          </div>
          <div className="divide-y divide-slate-50">
            {openTodos.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">All caught up — no open to-dos!</p>
            )}
            {openTodos.slice(0, 5).map((t, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-sm text-slate-700">{t.text}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {t.team && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t.team}</span>}
                  {t.point_person && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{t.point_person}</span>}
                  <DeadlineChip date={t.date} />
                </div>
              </div>
            ))}
            {openTodos.length > 5 && (
              <p className="text-xs text-slate-400 text-center py-2">+{openTodos.length - 5} more — see Tracker tab</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Recent CSM Updates</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {updates.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No updates logged yet.</p>}
            {updates.slice(0, 4).map(u => {
              const typeColors = {
                win: "bg-emerald-100 text-emerald-700",
                churn_risk: "bg-red-100 text-red-700",
                issue: "bg-amber-100 text-amber-700",
                upsell_opportunity: "bg-blue-100 text-blue-700",
                status_update: "bg-slate-100 text-slate-600",
                general: "bg-slate-100 text-slate-600",
              };
              return (
                <div key={u.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[u.update_type] || typeColors.general}`}>
                      {u.update_type?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(u.created_date), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{u.content}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Insight + Meetings */}
        <div className="space-y-3">
          {lastInsight && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700">Latest Insight</h3>
                <span className="ml-auto text-xs text-slate-400">{lastInsight.meeting_date || formatDistanceToNow(new Date(lastInsight.created_date), { addSuffix: true })}</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-3">{lastInsight.summary || "No summary available."}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>{lastInsight.source_type}</span>
                {(lastInsight.todos || []).length > 0 && <span>{(lastInsight.todos || []).length} to-dos</span>}
                {(lastInsight.red_flags || []).length > 0 && <span className="text-red-500">{(lastInsight.red_flags || []).length} red flags</span>}
              </div>
            </div>
          )}
          {lastMeeting && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-slate-700">Last Meeting</h3>
                <span className="ml-auto text-xs text-slate-400">{new Date(lastMeeting.meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">{lastMeeting.title}</p>
              {lastMeeting.summary && <p className="text-xs text-slate-500 line-clamp-2 mt-1">{lastMeeting.summary}</p>}
            </div>
          )}
          {!lastInsight && !lastMeeting && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-sm">
              No meetings or insights logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}