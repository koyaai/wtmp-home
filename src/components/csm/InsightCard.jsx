import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-500"
};

const sourceColors = {
  "Meeting Transcript": "bg-purple-100 text-purple-700",
  "Email": "bg-yellow-100 text-yellow-700",
  "Call Notes": "bg-indigo-100 text-indigo-700",
  "Other": "bg-slate-100 text-slate-600"
};

export default function InsightCard({ insight, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const handleStatus = async (status) => {
    await base44.entities.ClientInsight.update(insight.id, { status });
    onUpdate();
  };

  const handleDelete = async () => {
    await base44.entities.ClientInsight.delete(insight.id);
    onUpdate();
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${insight.status === "archived" ? "opacity-60" : ""}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceColors[insight.source_type] || "bg-slate-100 text-slate-600"}`}>
              {insight.source_type}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[insight.status]}`}>
              {insight.status}
            </span>
            {insight.meeting_date && (
              <span className="text-xs text-slate-400">{format(new Date(insight.meeting_date), "MMM d, yyyy")}</span>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{insight.summary || "No summary available."}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {insight.red_flags?.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {insight.red_flags.length}
            </span>
          )}
          {insight.todos?.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
              <CheckSquare className="w-3 h-3" /> {insight.todos.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {insight.red_flags?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-2">
                <AlertTriangle className="w-4 h-4" /> Red Flags
              </div>
              <ul className="space-y-1">
                {insight.red_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.todos?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-2">
                <CheckSquare className="w-4 h-4" /> To-Dos
              </div>
              <ul className="space-y-1">
                {insight.todos.map((todo, i) => (
                  <li key={i} className="text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">✓ {todo}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.requests?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-2">
                <MessageSquare className="w-4 h-4" /> Client Requests
              </div>
              <ul className="space-y-1">
                {insight.requests.map((req, i) => (
                  <li key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{req}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.source_text && (
            <details className="text-xs text-slate-400 cursor-pointer">
              <summary className="hover:text-slate-600">View original text</summary>
              <p className="mt-2 text-slate-500 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{insight.source_text}</p>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            {insight.status !== "reviewed" && (
              <Button size="sm" variant="outline" onClick={() => handleStatus("reviewed")}>Mark Reviewed</Button>
            )}
            {insight.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={() => handleStatus("archived")}>
                <Archive className="w-3 h-3" /> Archive
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 ml-auto" onClick={handleDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}