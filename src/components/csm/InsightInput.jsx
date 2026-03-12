import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export default function InsightInput({ clients, onSaved }) {
  const [clientId, setClientId] = useState("");
  const [sourceType, setSourceType] = useState("meeting_transcript");
  const [sourceText, setSourceText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);

  const handleProcess = async () => {
    setProcessing(true);
    setResult(null);
    const res = await base44.functions.invoke("processClientInsight", { source_text: sourceText });
    setResult(res.data);
    setProcessing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ClientInsight.create({
      client_id: clientId,
      client_name: selectedClient?.name || "",
      source_type: sourceType,
      source_text: sourceText,
      summary: result.summary,
      todos: result.todos,
      requests: result.requests,
      red_flags: result.red_flags,
      status: "new"
    });
    setResult(null);
    setSourceText("");
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Add New Insight</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Client</label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Source Type</label>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting_transcript">Meeting Transcript</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="call_notes">Call Notes</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">Paste transcript or email</label>
        <Textarea
          value={sourceText}
          onChange={e => setSourceText(e.target.value)}
          placeholder="Paste the full meeting transcript, email thread, or call notes here..."
          className="min-h-[180px] text-sm"
        />
      </div>

      <Button
        onClick={handleProcess}
        disabled={!clientId || !sourceText || processing}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Extract Insights</>}
      </Button>

      {result && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Summary</p>
            <p className="text-sm text-slate-700">{result.summary}</p>
          </div>

          {result.todos?.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">To-Dos</p>
              <ul className="space-y-1">
                {result.todos.map((t, i) => <li key={i} className="text-sm text-blue-800 flex gap-2"><span>•</span>{t}</li>)}
              </ul>
            </div>
          )}

          {result.requests?.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Client Requests</p>
              <ul className="space-y-1">
                {result.requests.map((r, i) => <li key={i} className="text-sm text-amber-800 flex gap-2"><span>•</span>{r}</li>)}
              </ul>
            </div>
          )}

          {result.red_flags?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-red-600 uppercase mb-2">Red Flags</p>
              <ul className="space-y-1">
                {result.red_flags.map((f, i) => <li key={i} className="text-sm text-red-800 flex gap-2"><span>⚠</span>{f}</li>)}
              </ul>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? "Saving..." : "Save Insight"}
          </Button>
        </div>
      )}
    </div>
  );
}