import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, Download, Trash2, X, Sparkles, MessageSquare, Send } from "lucide-react";

export default function ClientOnboarding({ client }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ meeting_date: "", summary_notes: "" });
  const [transcript, setTranscript] = useState(null);
  const [formFile, setFormFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Q&A state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Onboarding.filter({ client_id: client.id }, "-meeting_date", 50);
      setRecords(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [client.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.meeting_date) return setError("Please set the onboarding meeting date.");
    if (!transcript && !formFile) return setError("Please upload the transcript or onboarding form.");
    setUploading(true);
    try {
      let transcript_url = null, transcript_name = null, form_url = null, form_name = null;
      if (transcript) {
        const r1 = await base44.integrations.Core.UploadFile({ file: transcript });
        transcript_url = r1.file_url; transcript_name = transcript.name;
      }
      if (formFile) {
        const r2 = await base44.integrations.Core.UploadFile({ file: formFile });
        form_url = r2.file_url; form_name = formFile.name;
      }
      await base44.entities.Onboarding.create({
        client_id: client.id,
        client_name: client.name,
        meeting_date: form.meeting_date,
        transcript_url, transcript_name,
        form_url, form_name,
        summary_notes: form.summary_notes,
      });
      setForm({ meeting_date: "", summary_notes: "" });
      setTranscript(null); setFormFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to save onboarding record.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this onboarding record?")) return;
    await base44.entities.Onboarding.delete(id);
    load();
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || records.length === 0) return;
    setAsking(true); setAnswer("");
    try {
      const fileUrls = records.flatMap(r => [r.transcript_url, r.form_url].filter(Boolean));
      const notesContext = records.map(r => r.summary_notes).filter(Boolean).join("\n\n");
      const prompt = `You are reviewing the onboarding documentation for a client named "${client.name}".\n\nUse the uploaded onboarding meeting transcript and onboarding form documents to answer the question below. If the answer is not found in the documents, say so clearly.\n\nAdditional summary notes from the onboarding:\n${notesContext || "(none)"}\n\nQuestion: ${question}`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        add_context_from_internet: false,
      });
      setAnswer(typeof res === "string" ? res : res?.response || JSON.stringify(res));
    } catch (err) {
      setAnswer("Sorry, I couldn't process that question: " + (err.message || "unknown error"));
    } finally {
      setAsking(false);
    }
  };

  const hasRecords = records.length > 0;

  return (
    <div className="space-y-4">
      {/* Banner during onboarding */}
      {client.status === "onboarding" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">This client is in onboarding</p>
            <p className="text-xs text-blue-600 mt-0.5">Upload the onboarding meeting transcript and form results to complete the client's "birth" record — queryable anytime.</p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-8">
              <Upload className="w-3.5 h-3.5 mr-1" /> Add Onboarding Doc
            </Button>
          )}
        </div>
      )}

      {/* Add button when not onboarding but no form open */}
      {client.status !== "onboarding" && !showForm && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="h-8 text-xs">
            <Upload className="w-3.5 h-3.5 mr-1" /> Add Onboarding Doc
          </Button>
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">New Onboarding Record</h3>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Onboarding Meeting Date *</label>
            <input type="date" value={form.meeting_date} onChange={e => set("meeting_date", e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Meeting Transcript</label>
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 truncate">{transcript ? transcript.name : "Upload transcript…"}</span>
                <input type="file" className="hidden" onChange={e => setTranscript(e.target.files?.[0] || null)} />
              </label>
              {transcript && <button type="button" onClick={() => setTranscript(null)} className="text-xs text-slate-400 hover:text-slate-600 mt-1">Remove</button>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Onboarding Form Results</label>
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 truncate">{formFile ? formFile.name : "Upload form…"}</span>
                <input type="file" className="hidden" onChange={e => setFormFile(e.target.files?.[0] || null)} />
              </label>
              {formFile && <button type="button" onClick={() => setFormFile(null)} className="text-xs text-slate-400 hover:text-slate-600 mt-1">Remove</button>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Notes</label>
            <textarea value={form.summary_notes} onChange={e => set("summary_notes", e.target.value)} rows={3}
              placeholder="Key goals, scope, contacts, timelines, anything important from onboarding…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(""); }} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading…</> : "Save Onboarding Record"}
            </Button>
          </div>
        </form>
      )}

      {/* Q&A */}
      {hasRecords && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Ask about this client's onboarding</h3>
          </div>
          <form onSubmit={handleAsk} className="flex gap-2">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. What are the client's main goals? Who are the key contacts?"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <Button type="submit" disabled={asking || !question.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          {answer && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">{answer}</div>
          )}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No onboarding documents uploaded yet for this client.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 mb-2">
                    Onboarding meeting {new Date(rec.meeting_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rec.transcript_url && (
                      <a href={rec.transcript_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> {rec.transcript_name || "Transcript"}
                      </a>
                    )}
                    {rec.form_url && (
                      <a href={rec.form_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                        <Download className="w-3.5 h-3.5" /> {rec.form_name || "Onboarding Form"}
                      </a>
                    )}
                  </div>
                  {rec.summary_notes && <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{rec.summary_notes}</p>}
                </div>
                <button onClick={() => handleDelete(rec.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}