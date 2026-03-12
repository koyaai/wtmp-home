import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";

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

export default function InsightCard({ insight, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);

  const handleStatusChange = async (status) => {
    await base44.entities.ClientInsight.update(insight.id, { status });
    onUpdated();
  };

  const handleDelete = async () => {
    await base44.entities.ClientInsight.delete(insight.id);
    onDeleted();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{insight.client_name}</span>
            <Badge className="text-xs bg-slate-100 text-slate-600">{sourceLabels[insight.source_type] || insight.source_type}</Badge>
            <span className="text-xs text-slate-400">{format(new Date(insight.created_date), "MMM d, yyyy")}</span>
            {insight.red_flags?.length > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">⚠ {insight.red_flags.length} Red Flag{insight.red_flags.length > 1 ? "s" : ""}</Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{insight.summary}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={insight.status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`h-7 text-xs px-2 border-0 ${statusColors[insight.status]}`}>
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
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
          {insight.todos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">To-Dos</p>
              <ul className="space-y-1">
                {insight.todos.map((t, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-blue-400">•</span>{t}</li>)}
              </ul>
            </div>
          )}
          {insight.requests?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Client Requests</p>
              <ul className="space-y-1">
                {insight.requests.map((r, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-amber-400">•</span>{r}</li>)}
              </ul>
            </div>
          )}
          {insight.red_flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase mb-1">Red Flags</p>
              <ul className="space-y-1">
                {insight.red_flags.map((f, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-red-500">⚠</span>{f}</li>)}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Original Source</p>
            <p className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-6">{insight.source_text}</p>
          </div>
        </div>
      )}
    </div>
  );
}