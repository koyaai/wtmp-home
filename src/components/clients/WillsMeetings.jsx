import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, MessageSquare, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";

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

  useEffect(() => {
    base44.entities.WillMeeting.filter({ client_id: clientId }, "-meeting_date")
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  if (meetings.length === 0) return (
    <div className="text-center py-12 text-slate-400">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No meetings logged yet for this client.</p>
      <p className="text-xs mt-1">Use <span className="font-semibold">Will's Corner</span> to parse a transcript.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
    </div>
  );
}