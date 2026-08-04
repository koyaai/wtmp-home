import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, FileText, Archive, Sparkles, StickyNote, MessageSquare, Award, Download } from "lucide-react";

const TYPE_CONFIG = {
  "Onboarding": { icon: Sparkles, badge: "bg-blue-100 text-blue-700", label: "Onboarding" },
  "Post-Mortem": { icon: Archive, badge: "bg-rose-100 text-rose-700", label: "Post-Mortem" },
  "Will Meeting": { icon: FileText, badge: "bg-amber-100 text-amber-700", label: "Will's Meeting" },
  "Meeting Note": { icon: StickyNote, badge: "bg-teal-100 text-teal-700", label: "Meeting Note" },
  "CSM Update": { icon: MessageSquare, badge: "bg-violet-100 text-violet-700", label: "CSM Update" },
  "Client Score": { icon: Award, badge: "bg-indigo-100 text-indigo-700", label: "Client Score" },
};

export default function MemoryRecordCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[record.type] || TYPE_CONFIG["Meeting Note"];
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.badge}`}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
            {record.date && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" /> {record.date}
              </span>
            )}
            {record.subtype && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{record.subtype}</span>
            )}
          </div>
          {record.title && <p className="text-sm font-medium text-slate-800 mb-0.5">{record.title}</p>}
          {record.summary && <p className="text-sm text-slate-600 line-clamp-2">{record.summary}</p>}
          {record.files?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {record.files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <FileText className="w-3 h-3" /> {f.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          {record.summary && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
            </div>
          )}
          {record.details?.length > 0 && (
            <div className="space-y-1">
              {record.details.map((d, i) => (
                <p key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" /> {d}
                </p>
              ))}
            </div>
          )}
          {record.files?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {record.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                  <Download className="w-3.5 h-3.5" /> {f.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}