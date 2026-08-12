import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Trash2, Plus, ChevronDown, Slack, Flag, CheckSquare,
  MessageSquare, AlertCircle
} from "lucide-react";
import { TEAMS, teamColors } from "@/components/clients/TrackerItemRow";

function makeItem(text) {
  return { text: text || "", date: "", teams: [], point_person: "", slackOn: true };
}

function TeamMultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value || [];
  const toggle = (t) => {
    if (selected.includes(t)) onChange(selected.filter(x => x !== t));
    else onChange([...selected, t]);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 min-w-[90px]"
      >
        <span className={selected.length ? "text-slate-700 font-medium" : "text-slate-400"}>
          {selected.length ? `${selected.length} team${selected.length > 1 ? "s" : ""}` : "Teams"}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 w-52 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-1 gap-0.5 max-h-60 overflow-y-auto">
            {TEAMS.map(t => (
              <label key={t} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.includes(t)}
                  onChange={() => toggle(t)}
                  className="w-3.5 h-3.5 accent-slate-700"
                />
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${teamColors[t] || "bg-slate-100 text-slate-600"}`}>{t}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ItemRow({ item, onChange, onDelete, accent }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
      <div className="flex items-start gap-2">
        <Textarea
          value={item.text}
          onChange={e => onChange({ ...item, text: e.target.value })}
          rows={2}
          placeholder="Enter details..."
          className="flex-1 text-sm bg-white resize-none min-h-[44px]"
        />
        <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors mt-1.5 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={item.date || ""}
          onChange={e => onChange({ ...item, date: e.target.value })}
          className="border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-600 bg-white"
        />
        <TeamMultiSelect value={item.teams} onChange={t => onChange({ ...item, teams: t })} />
        <input
          type="text"
          value={item.point_person || ""}
          onChange={e => onChange({ ...item, point_person: e.target.value })}
          placeholder="Point person"
          className="border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-600 bg-white flex-1 min-w-[120px]"
        />
        <label className="flex items-center gap-1.5 ml-auto text-xs text-slate-500 select-none">
          <Slack className={`w-3.5 h-3.5 ${item.slackOn ? "text-[#4A154B]" : "text-slate-300"}`} />
          <span className={item.slackOn ? "text-slate-700 font-medium" : "text-slate-400"}>Slack</span>
          <Switch checked={item.slackOn} onCheckedChange={v => onChange({ ...item, slackOn: v })} />
        </label>
      </div>
      {accent === "flag" && !item.text.trim() && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Empty flag will be removed on save</p>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, count, color, open, onToggle, children, onAdd, addLabel }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="font-semibold text-sm text-slate-700">{title}</span>
          <span className="text-[11px] font-bold bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{count}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="p-4 space-y-2.5">
          {children}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2 w-full justify-center transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function InsightReviewModal({
  open,
  loading,
  extractedData,
  onCancel,
  onConfirm,
  saving
}) {
  const [summary, setSummary] = useState("");
  const [redFlags, setRedFlags] = useState([]);
  const [todos, setTodos] = useState([]);
  const [requests, setRequests] = useState([]);
  const [openSections, setOpenSections] = useState({ summary: true, flags: true, todos: true, requests: true });

  useEffect(() => {
    if (!open || !extractedData) return;
    setSummary(extractedData.summary || "");
    setRedFlags((extractedData.red_flags || []).map(f => makeItem(typeof f === "string" ? f : f.text)));
    setTodos((extractedData.todos || []).map(t => makeItem(typeof t === "string" ? t : t.text)));
    setRequests(extractedData.requests || []);
    setOpenSections({ summary: true, flags: true, todos: true, requests: true });
  }, [open, extractedData]);

  const slackOnCount = useMemo(
    () => redFlags.filter(i => i.slackOn).length + todos.filter(i => i.slackOn).length,
    [redFlags, todos]
  );

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm({
      summary,
      red_flags: redFlags.filter(i => i.text.trim()),
      todos: todos.filter(i => i.text.trim()),
      requests: requests.filter(r => (r || "").trim()),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-4xl flex-1 flex flex-col bg-slate-50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Review Extracted Insights</h2>
            <p className="text-xs text-slate-400">Audit the AI output before saving. Toggle Slack off on any item you don't want posted.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Slack className="w-4 h-4 text-[#4A154B]" />
            <span className="font-medium">{slackOnCount} item{slackOnCount !== 1 ? "s" : ""} to post</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-500">Analyzing transcript with AI...</p>
              <p className="text-xs text-slate-400">This may take a few seconds for long transcripts.</p>
            </div>
          ) : (
            <>
              <Section
                title="Summary"
                icon={MessageSquare}
                count={summary ? "✓" : 0}
                color="text-blue-500"
                open={openSections.summary}
                onToggle={() => setOpenSections(s => ({ ...s, summary: !s.summary }))}
              >
                <Textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={6}
                  placeholder="Meeting summary..."
                  className="text-sm leading-relaxed"
                />
              </Section>

              <Section
                title="Red Flags"
                icon={Flag}
                count={redFlags.length}
                color="text-red-500"
                open={openSections.flags}
                onToggle={() => setOpenSections(s => ({ ...s, flags: !s.flags }))}
                onAdd={() => setRedFlags(f => [...f, makeItem("")])}
                addLabel="Add Red Flag"
              >
                {redFlags.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No red flags extracted.</p>
                ) : redFlags.map((item, i) => (
                  <ItemRow
                    key={i}
                    item={item}
                    accent="flag"
                    onChange={v => setRedFlags(f => f.map((x, idx) => idx === i ? v : x))}
                    onDelete={() => setRedFlags(f => f.filter((_, idx) => idx !== i))}
                  />
                ))}
              </Section>

              <Section
                title="To-Dos"
                icon={CheckSquare}
                count={todos.length}
                color="text-emerald-500"
                open={openSections.todos}
                onToggle={() => setOpenSections(s => ({ ...s, todos: !s.todos }))}
                onAdd={() => setTodos(t => [...t, makeItem("")])}
                addLabel="Add To-Do"
              >
                {todos.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No to-dos extracted.</p>
                ) : todos.map((item, i) => (
                  <ItemRow
                    key={i}
                    item={item}
                    onChange={v => setTodos(t => t.map((x, idx) => idx === i ? v : x))}
                    onDelete={() => setTodos(t => t.filter((_, idx) => idx !== i))}
                  />
                ))}
              </Section>

              <Section
                title="Client Requests"
                icon={MessageSquare}
                count={requests.length}
                color="text-amber-500"
                open={openSections.requests}
                onToggle={() => setOpenSections(s => ({ ...s, requests: !s.requests }))}
                onAdd={() => setRequests(r => [...r, ""])}
                addLabel="Add Request"
              >
                {requests.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No requests extracted.</p>
                ) : requests.map((req, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      type="text"
                      value={req}
                      onChange={e => setRequests(r => r.map((x, idx) => idx === i ? e.target.value : x))}
                      placeholder="Client request..."
                      className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                    />
                    <button onClick={() => setRequests(r => r.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 mt-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 bg-white border-t border-slate-200 space-y-2">
            <Button onClick={handleConfirm} disabled={saving} className="w-full bg-slate-800 hover:bg-slate-700 h-11">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Confirm & Save"}
            </Button>
            <button onClick={onCancel} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-1">
              Cancel and discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}