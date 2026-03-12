import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckSquare, MessageSquare, Calendar, Clock, User, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4 ${color}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-current/10`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-70 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function ClientSnapshot({ client }) {
  const [insights, setInsights] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ClientInsight.filter({ client_id: client.id }, "-created_date", 20),
      base44.entities.CSMUpdate.filter({ client_id: client.id }, "-created_date", 5),
      base44.entities.MeetingNote.filter({ client_id: client.id }, "-meeting_date", 3),
    ]).then(([ins, upd, mtg]) => {
      setInsights(ins);
      setUpdates(upd);
      setMeetings(mtg);
      setLoading(false);
    });
  }, [client.id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" /></div>;

  // Aggregate todos and red flags across all insights
  const openTodos = insights.flatMap(ins =>
    (ins.todos || []).filter(t => !t.resolved).map(t => ({ ...t, insightDate: ins.meeting_date || ins.created_date, insightId: ins.id }))
  );
  const openRedFlags = insights.flatMap(ins =>
    (ins.red_flags || []).filter(f => !f.resolved).map(f => ({ ...f, insightDate: ins.meeting_date || ins.created_date, insightId: ins.id }))
  );
  const recentInsight = insights[0];

  const updateTypeColors = {
    issue: "text-red-600 bg-red-50 border-red-100",
    churn_risk: "text-red-700 bg-red-50 border-red-200",
    win: "text-emerald-700 bg-emerald-50 border-emerald-100",
    upsell_opportunity: "text-violet-700 bg-violet-50 border-violet-100",
    status_update: "text-blue-700 bg-blue-50 border-blue-100",
    general: "text-slate-600 bg-slate-50 border-slate-100",
  };

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={AlertTriangle} label="Open Red Flags" value={openRedFlags.length} color={openRedFlags.length > 0 ? "text-red-500 border-red-100" : "text-slate-400 border-slate-100"} />
        <StatCard icon={CheckSquare} label="Pending To-Dos" value={openTodos.length} color={openTodos.length > 0 ? "text-amber-500 border-amber-100" : "text-slate-400 border-slate-100"} />
        <StatCard icon={MessageSquare} label="Total Insights" value={insights.length} color="text-blue-500 border-blue-100" />
      </div>

      {/* Open Red Flags */}
      {openRedFlags.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Open Red Flags</h3>
            <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{openRedFlags.length}</span>
          </div>
          <ul className="divide-y divide-slate-50">
            {openRedFlags.map((flag, i) => (
              <li key={i} className="px-4 py-3">
                <p className="text-sm text-slate-800">{flag.text}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {flag.team && <span className="text-xs text-slate-400">{flag.team}</span>}
                  {flag.point_person && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{flag.point_person}</span>}
                  {flag.date && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />Due {format(new Date(flag.date), "MMM d")}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending To-Dos */}
      {openTodos.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <CheckSquare className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-700">Pending To-Dos</h3>
            <span className="ml-auto text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">{openTodos.length}</span>
          </div>
          <ul className="divide-y divide-slate-50">
            {openTodos.slice(0, 8).map((todo, i) => (
              <li key={i} className="px-4 py-3">
                <p className="text-sm text-slate-800">{todo.text}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {todo.team && <span className="text-xs text-slate-400">{todo.team}</span>}
                  {todo.point_person && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{todo.point_person}</span>}
                  {todo.date && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />Due {format(new Date(todo.date), "MMM d")}</span>}
                </div>
              </li>
            ))}
            {openTodos.length > 8 && <li className="px-4 py-2 text-xs text-slate-400 text-center">+{openTodos.length - 8} more — view in Tracker tab</li>}
          </ul>
        </div>
      )}

      {/* Recent CSM Updates */}
      {updates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Recent CSM Updates</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {updates.map((upd) => (
              <li key={upd.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize whitespace-nowrap mt-0.5 ${updateTypeColors[upd.update_type] || updateTypeColors.general}`}>
                    {upd.update_type?.replace("_", " ")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 line-clamp-2">{upd.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{upd.author && `${upd.author} · `}{formatDistanceToNow(new Date(upd.created_date), { addSuffix: true })}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Meetings */}
      {meetings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Recent Meetings</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {meetings.map((mtg) => (
              <li key={mtg.id} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{mtg.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{mtg.meeting_date && format(new Date(mtg.meeting_date), "MMM d, yyyy")}</p>
                {mtg.action_items && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mtg.action_items}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Latest AI Summary */}
      {recentInsight?.summary && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Latest AI Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{recentInsight.summary}</p>
          <p className="text-xs text-slate-400 mt-2">{recentInsight.meeting_date ? format(new Date(recentInsight.meeting_date), "MMM d, yyyy") : formatDistanceToNow(new Date(recentInsight.created_date), { addSuffix: true })}</p>
        </div>
      )}

      {/* Empty state */}
      {insights.length === 0 && updates.length === 0 && meetings.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
          <p className="text-slate-400 text-sm">No activity yet for this client. Start by pasting a meeting transcript in the Insights tab.</p>
        </div>
      )}
    </div>
  );
}