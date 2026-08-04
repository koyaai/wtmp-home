import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Brain, Loader2, ChevronDown, ChevronUp, Calendar, MessageSquare, AlertTriangle, CheckSquare, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import WillHankeBriefing from "@/components/clients/WillHankeBriefing";
import ClientSelect from "@/components/clients/ClientSelect";
import MemoryRecordCard from "@/components/clients/MemoryRecordCard";

const SOURCE_COLORS = {
  "Meeting Transcript": "bg-blue-100 text-blue-700",
  "Email": "bg-purple-100 text-purple-700",
  "Call Notes": "bg-amber-100 text-amber-700",
  "Other": "bg-slate-100 text-slate-600",
};

function InsightCard({ insight }) {
  const [expanded, setExpanded] = useState(false);
  const badgeClass = SOURCE_COLORS[insight.source_type] || SOURCE_COLORS["Other"];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{insight.source_type || "Other"}</span>
            {insight.meeting_date && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" /> {insight.meeting_date}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${insight.status === "new" ? "bg-emerald-100 text-emerald-700" : insight.status === "reviewed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
              {insight.status || "new"}
            </span>
          </div>
          {insight.summary && (
            <p className="text-sm text-slate-700 line-clamp-2">{insight.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            {insight.todos?.length > 0 && <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {insight.todos.length} todos</span>}
            {insight.red_flags?.length > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-3 h-3" /> {insight.red_flags.length} red flags</span>}
            {insight.requests?.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {insight.requests.length} requests</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {insight.summary && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{insight.summary}</p>
            </div>
          )}
          {insight.requests?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Client Requests</p>
              <ul className="space-y-1">
                {insight.requests.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.todos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Action Items</p>
              <ul className="space-y-1">
                {insight.todos.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckSquare className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />
                    <span>{t.text}</span>
                    {t.date && <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{t.date}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.red_flags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Red Flags</p>
              <ul className="space-y-1">
                {insight.red_flags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{f.text}</span>
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

export default function ClientMemory() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [memoryRecords, setMemoryRecords] = useState([]);

  useEffect(() => {
    base44.entities.Client.list().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setInsights([]); setMemoryRecords([]); return; }
    setLoadingInsights(true);
    // Fetch all client-specific data sources in parallel
    Promise.all([
      base44.entities.ClientInsight.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.Onboarding.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.PostMortem.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.WillMeeting.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.MeetingNote.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.CSMUpdate.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.ClientScore.filter({ client_id: selectedClientId }).catch(() => []),
    ]).then(([insightsData, onboardingData, postMortemData, willData, meetingNotesData, csmData, scoreData]) => {
      setInsights(insightsData.sort((a, b) => new Date(b.meeting_date || b.created_date) - new Date(a.meeting_date || a.created_date)));

      // Normalize all non-insight sources into unified memory records
      const records = [
        ...onboardingData.map(r => ({
          id: r.id, type: "Onboarding", date: r.meeting_date,
          title: "Onboarding Meeting",
          summary: r.summary_notes,
          files: [r.transcript_url && r.transcript_name ? { url: r.transcript_url, name: r.transcript_name } : null,
                 r.form_url && r.form_name ? { url: r.form_url, name: r.form_name } : null].filter(Boolean),
          contextText: `Onboarding (meeting ${r.meeting_date || "unknown"}): ${r.summary_notes || ""}`,
        })),
        ...postMortemData.map(r => ({
          id: r.id, type: "Post-Mortem", date: r.offboarding_date,
          subtype: r.reason,
          title: `Offboarded — ${r.reason}`,
          summary: r.summary_notes,
          files: r.document_url ? [{ url: r.document_url, name: r.document_name || "Post-Mortem Doc" }] : [],
          contextText: `Post-Mortem (offboarded ${r.offboarding_date || "unknown"}, reason: ${r.reason}): ${r.summary_notes || ""}`,
        })),
        ...willData.map(r => ({
          id: r.id, type: "Will Meeting", date: r.meeting_date,
          title: `Will's Meeting — ${r.attendees ? "with " + r.attendees : ""}`,
          summary: r.parsed?.summary,
          details: [
            ...(r.parsed?.highlights || []).map(h => "Highlight: " + h),
            ...(r.parsed?.action_items || []).map(a => "Action: " + a),
            ...(r.parsed?.follow_ups || []).map(f => "Follow-up: " + f),
          ],
          contextText: `Will's Meeting (${r.meeting_date || "unknown"}): ${r.parsed?.summary || ""} ${r.raw_transcript || ""}`.slice(0, 2000),
        })),
        ...meetingNotesData.map(r => ({
          id: r.id, type: "Meeting Note", date: r.meeting_date,
          title: r.title,
          summary: r.summary,
          details: [r.action_items, r.next_meeting_date && `Next meeting: ${r.next_meeting_date}`].filter(Boolean),
          contextText: `Meeting Note (${r.meeting_date || "unknown"} — ${r.title}): ${r.summary || ""} ${r.action_items || ""}`,
        })),
        ...csmData.map(r => ({
          id: r.id, type: "CSM Update", date: r.created_date?.slice(0, 10),
          subtype: r.update_type,
          summary: r.content,
          contextText: `CSM Update (${r.update_type || "general"}): ${r.content || ""}`,
        })),
        ...scoreData.map(r => ({
          id: r.id, type: "Client Score", date: `${r.year}-${String(new Date(`${r.month} 1 2000`).getMonth() + 1).padStart(2, "0")}-01`,
          subtype: `Overall: ${r.overall_grade || "—"}`,
          title: `${r.month} ${r.year} Scorecard`,
          summary: r.notes,
          details: [r.roadblocks && `Roadblocks: ${r.roadblocks}`].filter(Boolean),
          contextText: `Client Score (${r.month} ${r.year}, overall ${r.overall_grade || "none"}): ${r.notes || ""} ${r.roadblocks || ""}`,
        })),
      ].sort((a, b) => new Date(b.date || b.created_date || 0) - new Date(a.date || a.created_date || 0));

      setMemoryRecords(records);
    }).finally(() => setLoadingInsights(false));
  }, [selectedClientId]);

  const filtered = useMemo(() => {
    return insights.filter(ins => {
      if (dateFrom && ins.meeting_date && ins.meeting_date < dateFrom) return false;
      if (dateTo && ins.meeting_date && ins.meeting_date > dateTo) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        const haystack = [ins.summary, ins.source_text, ...(ins.requests || []), ...(ins.todos?.map(t => t.text) || []), ...(ins.red_flags?.map(f => f.text) || [])].join(" ").toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [insights, keyword, dateFrom, dateTo]);

  const filteredMemory = useMemo(() => {
    return memoryRecords.filter(rec => {
      if (dateFrom && rec.date && rec.date < dateFrom) return false;
      if (dateTo && rec.date && rec.date > dateTo) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        const haystack = [rec.title, rec.summary, rec.subtype, ...(rec.details || []), ...(rec.files?.map(f => f.name) || [])].join(" ").toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [memoryRecords, keyword, dateFrom, dateTo]);

  const handleAiQuery = async () => {
    if (!aiQuery.trim() || !selectedClientId) return;
    setAiLoading(true);
    setAiAnswer(null);
    const clientName = clients.find(c => c.id === selectedClientId)?.name || "this client";
    const insightContext = insights.slice(0, 30).map(ins => `[${ins.meeting_date || "unknown date"} — ${ins.source_type}]\nSummary: ${ins.summary || ""}\nRequests: ${(ins.requests || []).join(", ")}\nTodos: ${(ins.todos || []).map(t => t.text).join(", ")}\nRed Flags: ${(ins.red_flags || []).map(f => f.text).join(", ")}`).join("\n\n---\n\n");
    const memoryContext = memoryRecords.map(r => `[${r.type}${r.subtype ? " — " + r.subtype : ""} | ${r.date || "unknown date"}]\n${r.contextText || r.summary || ""}`).join("\n\n---\n\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a client relationship assistant for a marketing agency. Below is the complete history of everything known about client "${clientName}" — including onboarding records, meeting insights, transcripts, CSM updates, meeting notes, client scorecards, and post-mortem documentation.\n\nClient History:\n${insightContext}\n\n${memoryContext}\n\n---\n\nUser Question: ${aiQuery}\n\nAnswer based only on the provided history. Be specific — mention dates and exact details when available. If the information isn't in the history, say so.`,
    });
    setAiAnswer(result);
    setAiLoading(false);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-600" /> Client Memory
        </h1>
        <p className="text-slate-500 text-sm mt-1">Search and query historical insights, transcripts, and meeting notes per client.</p>
      </div>

      {/* Client Picker */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Select Client</label>
        <ClientSelect
          clients={clients}
          value={selectedClientId}
          onChange={(id) => { setSelectedClientId(id); setAiAnswer(null); setKeyword(""); setDateFrom(""); setDateTo(""); }}
          placeholder="Choose a client…"
          className="w-full"
        />
      </div>

      {selectedClientId && (
        <>
          {/* Will Hanke — Catch-Up Briefing */}
          <WillHankeBriefing clientName={selectedClient?.name || "this client"} insights={insights} />

          {/* AI Query */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-800">Ask the Memory Bank</p>
            </div>
            <p className="text-xs text-indigo-600">Ask anything about this client's history — topics discussed, requests made, issues raised, etc.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiQuery()}
                placeholder="e.g. When did they ask about Google Ads? What red flags came up?"
                className="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
              <Button onClick={handleAiQuery} disabled={aiLoading || !aiQuery.trim()} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
            {aiAnswer && (
              <div className="bg-white rounded-xl border border-indigo-100 p-4">
                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">Answer</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter History</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="Search keywords…"
                  className="w-full pl-8 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Results */}
          {loadingInsights ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{(insights.length + memoryRecords.length) === 0 ? "No memory records saved for this client yet." : "No results match your filters."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-medium">{filtered.length + filteredMemory.length} record{(filtered.length + filteredMemory.length) !== 1 ? "s" : ""} found</p>
              {filtered.map(ins => <InsightCard key={"ins-" + ins.id} insight={ins} />)}
              {filteredMemory.map(rec => <MemoryRecordCard key={"mem-" + rec.id} record={rec} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}