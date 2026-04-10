import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, MessageSquare, Calendar, User, ChevronDown, ChevronUp, Search, Sparkles, X } from "lucide-react";

const SENTIMENT_COLORS = {
  Positive: "bg-emerald-100 text-emerald-700",
  Neutral: "bg-slate-100 text-slate-600",
  Mixed: "bg-amber-100 text-amber-700",
  Negative: "bg-red-100 text-red-700",
};

function MeetingCard({ meeting }) {
  const [open, setOpen] = useState(false);
  const p = meeting.parsed || {};

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black">W</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(meeting.meeting_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
              {p.client_sentiment && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_COLORS[p.client_sentiment] || SENTIMENT_COLORS.Neutral}`}>
                  {p.client_sentiment}
                </span>
              )}
            </div>
            {meeting.attendees && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" /> {meeting.attendees}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {p.summary && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{p.summary}</p>
            </div>
          )}
          {p.key_topics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {p.key_topics.map((t, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">{t}</span>)}
              </div>
            </div>
          )}
          {p.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Highlights</p>
              <ul className="space-y-1.5">
                {p.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.action_items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Action Items</p>
              <ul className="space-y-1.5">
                {p.action_items.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />{a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.follow_ups?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Follow-ups</p>
              <ul className="space-y-1.5">
                {p.follow_ups.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WillsMeetings({ clientId }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [querying, setQuerying] = useState(false);

  const handleQuery = async () => {
    if (!query.trim() || meetings.length === 0) return;
    setQuerying(true);
    setQueryResult(null);
    const context = meetings.map((m, i) => {
      const p = m.parsed || {};
      return `Meeting ${i + 1} (${new Date(m.meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}):
Summary: ${p.summary || "N/A"}
Key Topics: ${(p.key_topics || []).join(", ") || "N/A"}
Highlights: ${(p.highlights || []).join(" | ") || "N/A"}
Action Items: ${(p.action_items || []).join(" | ") || "N/A"}
Follow-ups: ${(p.follow_ups || []).join(" | ") || "N/A"}`;
    }).join("\n\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are reviewing historical Will Hanke CEO meeting notes for a specific client. Answer the following question based only on the meeting data provided. Be specific — cite meeting dates when relevant. If nothing relevant was found, say so clearly.\n\nQuestion: ${query}\n\nMeeting Data:\n${context}`
    });
    setQueryResult(result);
    setQuerying(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  if (meetings.length === 0) return (
    <div className="text-center py-12 text-slate-400">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No meetings logged yet for this client.</p>
      <p className="text-xs mt-1">Use <span className="font-semibold">Will's Corner</span> to parse a transcript.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* AI Query Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Ask About These Meetings
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuery()}
            placeholder="e.g. Did we discuss pricing? What did Will promise them?"
            className="flex-1 border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={handleQuery}
            disabled={querying || !query.trim()}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {queryResult && (
          <div className="bg-white border border-amber-200 rounded-lg p-3 text-sm text-slate-700 leading-relaxed relative">
            <button onClick={() => setQueryResult(null)} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"><X className="w-3.5 h-3.5" /></button>
            {queryResult}
          </div>
        )}
      </div>

      {/* Meeting Cards */}
      {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
    </div>
  );
}