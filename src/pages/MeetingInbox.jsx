import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Loader2, RefreshCw, ExternalLink, Check, X, Plus, AlertCircle, ChevronDown, ChevronUp, History } from "lucide-react";
import ClientSelect from "@/components/clients/ClientSelect";
import { cn } from "@/lib/utils";

const ADMIN_LIKE = ["admin", "leadership", "team_lead"];

const STATUS_TABS = [
  { value: "pending_review", label: "Needs review" },
  { value: "no_client", label: "No client found" },
  { value: "routed", label: "Routed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "error", label: "Errors" },
];

const CONFIDENCE_STYLE = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-red-50 text-red-700 border-red-200",
};

function MatchRow({ match, clients, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const included = match.include !== false;
  return (
    <div className={cn("border rounded-lg p-3 space-y-2", included ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50 opacity-70")}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="checkbox"
          checked={included}
          onChange={e => onChange({ ...match, include: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
          title="Route to this client"
        />
        <ClientSelect
          clients={clients}
          value={match.client_id}
          onChange={id => onChange({ ...match, client_id: id, client_name: clients.find(c => c.id === id)?.name || "", changed: id !== match.original_client_id })}
          className="flex-1 min-w-[200px]"
        />
        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", CONFIDENCE_STYLE[match.confidence] || CONFIDENCE_STYLE.low)}>
          {match.manual ? "added by you" : `${match.confidence} confidence`}
        </span>
        {match.manual && (
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500" title="Remove"><X className="w-4 h-4" /></button>
        )}
      </div>
      {match.evidence && !match.manual && (
        <p className="text-xs text-slate-500"><span className="font-semibold">Why:</span> {match.evidence}</p>
      )}
      {match.changed && (
        <p className="text-xs text-amber-600">Client changed — the summary below was written for {match.original_client_name}. Edit it if needed.</p>
      )}
      <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-600 flex items-center gap-1">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "Show"} what goes to the account ({(match.todos || []).length} to-dos, {(match.requests || []).length} requests, {(match.red_flags || []).length} red flags)
      </button>
      {open && (
        <div className="space-y-2">
          <Textarea
            value={match.summary || ""}
            onChange={e => onChange({ ...match, summary: e.target.value })}
            className="min-h-[120px] text-sm"
          />
          {[["To-dos", (match.todos || []).map(t => t.point_person ? `${t.text} — ${t.point_person}` : t.text)],
            ["Client requests", match.requests || []],
            ["Red flags", match.red_flags || []]].map(([label, items]) => items.length > 0 && (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-600">{label}</p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                {items.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InboxCard({ item, clients, user, onDone }) {
  const [matches, setMatches] = useState(() =>
    (item.matches || []).map(m => ({ ...m, original_client_id: m.client_id, original_client_name: m.client_name }))
  );
  const [adding, setAdding] = useState(false);
  const [addClientId, setAddClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showSource, setShowSource] = useState(false);
  const reviewable = ["pending_review", "no_client", "error"].includes(item.status);

  const addClient = async () => {
    if (!addClientId) return;
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("ingestMeetingNotes", { action: "extract_for_client", inbox_id: item.id, client_id: addClientId });
      setMatches(ms => [...ms, { ...res.data, original_client_id: res.data.client_id, original_client_name: res.data.client_name }]);
      setAdding(false); setAddClientId("");
    } catch (e) {
      setError(e.message || "Couldn't extract notes for that client.");
    } finally { setBusy(false); }
  };

  const route = async () => {
    const chosen = matches.filter(m => m.include !== false && m.client_id);
    if (!chosen.length) { setError("Tick at least one client, or use Dismiss."); return; }
    setBusy(true); setError(null);
    try {
      const team = item.team && item.team !== "Other" ? item.team : "";
      const ids = [];
      for (const m of chosen) {
        const created = await base44.entities.ClientInsight.create({
          client_id: m.client_id,
          client_name: m.client_name,
          source_type: "Meeting Transcript",
          source_text: `[Auto-imported from Gemini notes: ${item.meeting_title} — ${item.meeting_date || ""}]${item.doc_url ? `\n${item.doc_url}` : ""}`,
          meeting_date: item.meeting_date || undefined,
          summary: m.summary,
          todos: (m.todos || []).map(t => ({ text: t.text, resolved: false, date: item.meeting_date || null, teams: team ? [team] : [], team, point_person: t.point_person || "" })),
          requests: m.requests || [],
          red_flags: (m.red_flags || []).map(text => ({ text, resolved: false, date: item.meeting_date || null, teams: team ? [team] : [], team, point_person: "", solution: "" })),
          status: "new",
          team,
          source_meeting_title: item.meeting_title,
          source_url: item.doc_url || item.gmail_url || "",
          meeting_inbox_id: item.id,
        });
        ids.push(created.id);
      }
      await base44.entities.MeetingInbox.update(item.id, {
        status: "routed",
        matches: chosen.map(({ include, changed, original_client_id, original_client_name, ...rest }) => rest),
        routed_insight_ids: ids,
        reviewed_by: user?.email || "",
        reviewed_at: new Date().toISOString(),
      });
      onDone();
    } catch (e) {
      setError(e.message || "Failed to route.");
    } finally { setBusy(false); }
  };

  const dismiss = async () => {
    setBusy(true);
    await base44.entities.MeetingInbox.update(item.id, { status: "dismissed", reviewed_by: user?.email || "", reviewed_at: new Date().toISOString() });
    setBusy(false);
    onDone();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800">{item.meeting_title || item.subject}</h3>
            {item.team && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{item.team}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.meeting_date || "—"} · {item.source_origin === "google_doc" ? "read from Gemini Doc" : "email summary only"}
            {item.reviewed_by && ` · reviewed by ${item.reviewed_by}`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {item.doc_url && <a href={item.doc_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1">Doc <ExternalLink className="w-3 h-3" /></a>}
          {item.gmail_url && <a href={item.gmail_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1">Email <ExternalLink className="w-3 h-3" /></a>}
        </div>
      </div>

      {item.status === "error" && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{item.error_message}</p>}

      {matches.length === 0 && item.status !== "error" && (
        <p className="text-sm text-slate-500">AI didn't find a client discussed in this meeting. Add one below if it's wrong, otherwise dismiss.</p>
      )}

      <div className="space-y-2">
        {matches.map((m, i) => (
          <MatchRow
            key={i}
            match={m}
            clients={clients}
            onChange={next => setMatches(ms => ms.map((x, j) => j === i ? next : x))}
            onRemove={() => setMatches(ms => ms.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      {item.unmatched_mentions?.length > 0 && (
        <p className="text-xs text-slate-500"><span className="font-semibold">Mentioned but not in client list:</span> {item.unmatched_mentions.join(", ")}</p>
      )}

      {reviewable && (
        <>
          {adding ? (
            <div className="flex gap-2 items-center">
              <ClientSelect clients={clients} value={addClientId} onChange={setAddClientId} className="flex-1" placeholder="Which client was discussed?" />
              <Button size="sm" onClick={addClient} disabled={!addClientId || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add a client the AI missed</button>
          )}

          {error && <div className="flex items-center gap-2 text-xs text-red-600"><AlertCircle className="w-4 h-4" /> {error}</div>}

          <div className="flex gap-2 pt-1">
            <Button onClick={route} disabled={busy || matches.filter(m => m.include !== false).length === 0} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm & send to {matches.filter(m => m.include !== false).length || ""} account{matches.filter(m => m.include !== false).length === 1 ? "" : "s"}
            </Button>
            <Button variant="outline" onClick={dismiss} disabled={busy}>
              <X className="w-4 h-4" /> Not client-related
            </Button>
          </div>
        </>
      )}

      {item.source_text && (
        <div>
          <button onClick={() => setShowSource(s => !s)} className="text-xs text-slate-500">{showSource ? "Hide" : "Show"} original notes</button>
          {showSource && <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 max-h-80 overflow-y-auto">{item.source_text}</pre>}
        </div>
      )}
    </div>
  );
}

export default function MeetingInbox() {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [backfillDays, setBackfillDays] = useState("60");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Client.list("name", 500).then(cs => setClients(cs.filter(c => !["churned", "offboarded"].includes(c.status))));
  }, []);

  useEffect(() => { load(); }, [status]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.MeetingInbox.filter({ status }, "-meeting_date", 200);
    setItems(data);
    setLoading(false);
  };

  // Runs the ingest repeatedly until the window is drained (each call handles a small batch).
  const sync = async (days) => {
    setSyncing(true); setSyncMsg(null);
    let total = 0;
    try {
      for (let i = 0; i < 20; i++) {
        const res = await base44.functions.invoke("ingestMeetingNotes", { days, max: 8 });
        if (res.data?.error) throw new Error(res.data.error);
        total += res.data.processed || 0;
        setSyncMsg(`Imported ${total}… ${res.data.remaining || 0} left`);
        if (!res.data.remaining) break;
      }
      setSyncMsg(`Done — imported ${total} meeting${total === 1 ? "" : "s"}.`);
      load();
    } catch (e) {
      setSyncMsg(`Error: ${e.message}`);
    } finally { setSyncing(false); }
  };

  const isAdmin = ADMIN_LIKE.includes(user?.role);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meeting Inbox</h1>
              <p className="text-sm text-slate-500">Gemini team-meeting notes, matched to clients. Confirm the client before it lands on the account.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => sync(3)} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Check now
            </Button>
            {isAdmin && (
              <>
                <Select value={backfillDays} onValueChange={setBackfillDays}>
                  <SelectTrigger className="w-24 h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["14", "30", "60", "90"].map(d => <SelectItem key={d} value={d}>{d} days</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => sync(Number(backfillDays))} disabled={syncing}>
                  <History className="w-4 h-4" /> Backfill
                </Button>
              </>
            )}
          </div>
        </div>
        {syncMsg && <p className="text-xs text-slate-600">{syncMsg}</p>}

        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => setStatus(t.value)}
              className={cn("px-3 py-1 text-xs rounded-md font-medium transition-colors", status === t.value ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700")}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-dashed border-slate-200">Nothing here.</div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <InboxCard key={item.id} item={item} clients={clients} user={user} onDone={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
