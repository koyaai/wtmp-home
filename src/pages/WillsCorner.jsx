import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Trash2, ChevronDown, ChevronUp, User, Calendar, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const SENTIMENT_COLORS = {
  Positive: "bg-emerald-100 text-emerald-700",
  Neutral: "bg-slate-100 text-slate-600",
  Mixed: "bg-amber-100 text-amber-700",
  Negative: "bg-red-100 text-red-700",
};

function MeetingCard({ meeting, onDelete }) {
  const [open, setOpen] = useState(false);
  const p = meeting.parsed || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{meeting.client_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(meeting.meeting_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
              {meeting.attendees && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" /> {meeting.attendees}
                </span>
              )}
              {p.client_sentiment && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_COLORS[p.client_sentiment] || SENTIMENT_COLORS.Neutral}`}>
                  {p.client_sentiment}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); if (confirm("Delete this meeting record?")) onDelete(meeting.id); }}
            className="text-slate-300 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5">
          {p.summary && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{p.summary}</p>
            </div>
          )}
          {p.key_topics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Topics</p>
              <div className="flex flex-wrap gap-2">
                {p.key_topics.map((t, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">{t}</span>)}
              </div>
            </div>
          )}
          {p.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Action Items</p>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Follow-ups</p>
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

export default function WillsCorner() {
  const now = new Date();
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [clientId, setClientId] = useState("");
  const [meetingDate, setMeetingDate] = useState(now.toISOString().split("T")[0]);
  const [attendees, setAttendees] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    base44.entities.Client.list().then(setClients);
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    const data = await base44.entities.WillMeeting.list("-meeting_date");
    setMeetings(data);
    setLoading(false);
  };

  const handleParse = async () => {
    if (!clientId || !transcript.trim()) return;
    setParsing(true);
    const client = clients.find(c => c.id === clientId);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a call transcript between Will Hanke (CEO of a digital marketing agency) and a client.

Client: ${client?.name}
Meeting Date: ${meetingDate}
Attendees: ${attendees || "Not specified"}

Transcript:
${transcript}

Parse and extract:
- summary: 2-3 sentence executive summary of the call
- key_topics: list of main topics discussed
- highlights: key notable moments or information shared
- action_items: concrete next steps or tasks mentioned
- follow_ups: things that need to be followed up on
- client_sentiment: one word — Positive, Neutral, Mixed, or Negative`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_topics: { type: "array", items: { type: "string" } },
          highlights: { type: "array", items: { type: "string" } },
          action_items: { type: "array", items: { type: "string" } },
          follow_ups: { type: "array", items: { type: "string" } },
          client_sentiment: { type: "string" }
        }
      }
    });

    await base44.entities.WillMeeting.create({
      client_id: clientId,
      client_name: client?.name,
      meeting_date: meetingDate,
      attendees,
      raw_transcript: transcript,
      parsed: result,
    });

    toast.success("Meeting parsed and saved!");
    setTranscript("");
    setAttendees("");
    setClientId("");
    await loadMeetings();
    setParsing(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.WillMeeting.delete(id);
    toast.success("Deleted.");
    loadMeetings();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow">
          <span className="text-white font-black text-lg">W</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Will's Corner</h1>
          <p className="text-slate-500 text-sm">Paste call transcripts from Will's client meetings — AI will extract the key highlights.</p>
        </div>
      </div>

      {/* Parser Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">New Meeting</p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Meeting Date *</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Attendees (optional)</label>
            <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)}
              placeholder="e.g. John Smith, Jane Doe"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transcript *</label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={10}
            placeholder="Paste the full call transcript here…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y font-mono"
          />
        </div>

        <Button
          onClick={handleParse}
          disabled={parsing || !clientId || !transcript.trim()}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
        >
          {parsing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing Transcript…</>
            : <><Sparkles className="w-4 h-4" /> Parse & Save Meeting</>}
        </Button>
      </div>

      {/* Past Meetings */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">All Meetings ({meetings.length})</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No meetings yet. Paste a transcript above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map(m => <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} />)}
          </div>
        )}
      </div>
    </div>
  );
}