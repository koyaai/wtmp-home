import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Trash2, AlertTriangle, CheckSquare, MessageSquare, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const sourceLabels = {
  meeting_transcript: "Meeting",
  email: "Email",
  call_notes: "Call Notes",
  other: "Other"
};

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700"
};

function InsightRow({ insight, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);

  const handleStatusChange = async (status) => {
    await base44.entities.ClientInsight.update(insight.id, { status });
    onUpdated();
  };

  const handleDelete = async () => {
    if (confirm("Delete this insight?")) {
      await base44.entities.ClientInsight.delete(insight.id);
      onDeleted();
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-xs bg-slate-100 text-slate-600">{sourceLabels[insight.source_type] || insight.source_type}</Badge>
            <span className="text-xs text-slate-400">{format(new Date(insight.created_date), "MMM d, yyyy")}</span>
            {insight.red_flags?.length > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {insight.red_flags.length} Red Flag{insight.red_flags.length > 1 ? "s" : ""}
              </Badge>
            )}
            {insight.todos?.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> {insight.todos.length} To-Do{insight.todos.length > 1 ? "s" : ""}
              </Badge>
            )}
            {insight.requests?.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {insight.requests.length} Request{insight.requests.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1.5">{insight.summary}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Select value={insight.status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`h-7 text-xs px-2 border-0 rounded-lg ${statusColors[insight.status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {insight.todos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1.5 flex items-center gap-1"><CheckSquare className="w-3 h-3" /> To-Dos</p>
              <ul className="space-y-1">
                {insight.todos.map((t, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-blue-400 mt-0.5">•</span>{t}</li>)}
              </ul>
            </div>
          )}
          {insight.requests?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Client Requests</p>
              <ul className="space-y-1">
                {insight.requests.map((r, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-amber-400 mt-0.5">•</span>{r}</li>)}
              </ul>
            </div>
          )}
          {insight.red_flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Red Flags</p>
              <ul className="space-y-1">
                {insight.red_flags.map((f, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-red-500 mt-0.5">⚠</span>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientInsights({ clientId }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["client-insights", clientId, refreshKey],
    queryFn: () => base44.entities.ClientInsight.filter({ client_id: clientId }, "-created_date", 50)
  });

  const openRedFlags = insights.filter(i => i.red_flags?.length > 0 && i.status !== "resolved");
  const openTodos = insights.filter(i => i.todos?.length > 0 && i.status !== "resolved");

  if (isLoading) return <div className="text-sm text-slate-400 py-6 text-center">Loading insights...</div>;

  return (
    <div className="space-y-4">
      {/* Summary Counts */}
      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{openRedFlags.length}</p>
            <p className="text-xs text-red-500 mt-0.5">Open Red Flags</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{openTodos.reduce((acc, i) => acc + (i.todos?.length || 0), 0)}</p>
            <p className="text-xs text-blue-500 mt-0.5">Open To-Dos</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{insights.filter(i => i.status !== "resolved").reduce((acc, i) => acc + (i.requests?.length || 0), 0)}</p>
            <p className="text-xs text-amber-500 mt-0.5">Open Requests</p>
          </div>
        </div>
      )}

      {/* Link to CSM Hub */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-slate-700">{insights.length} Insight{insights.length !== 1 ? "s" : ""}</p>
        <Link to="/CSMHub" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Add in CSM Hub
        </Link>
      </div>

      {insights.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">No insights yet for this client.</p>
          <Link to="/CSMHub" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">Go to CSM Hub to add insights →</Link>
        </div>
      )}

      <div className="space-y-3">
        {insights.map(insight => (
          <InsightRow key={insight.id} insight={insight} onUpdated={refresh} onDeleted={refresh} />
        ))}
      </div>
    </div>
  );
}