import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, Download, Trash2, X, AlertCircle } from "lucide-react";

const REASONS = ["Churned", "Mutual Parting", "Project Completed", "Budget Cuts", "Dissatisfaction", "Other"];

const REASON_COLORS = {
  "Churned": "bg-rose-100 text-rose-700 border-rose-200",
  "Mutual Parting": "bg-amber-100 text-amber-700 border-amber-200",
  "Project Completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Budget Cuts": "bg-orange-100 text-orange-700 border-orange-200",
  "Dissatisfaction": "bg-red-100 text-red-700 border-red-200",
  "Other": "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ClientPostMortem({ client }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ offboarding_date: "", reason: "Churned", summary_notes: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.PostMortem.filter({ client_id: client.id }, "-offboarding_date", 50);
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
    if (!form.offboarding_date) return setError("Please set an offboarding date.");
    if (!file) return setError("Please upload a post-mortem document.");
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PostMortem.create({
        client_id: client.id,
        client_name: client.name,
        document_url: file_url,
        document_name: file.name,
        offboarding_date: form.offboarding_date,
        reason: form.reason,
        summary_notes: form.summary_notes,
      });
      setForm({ offboarding_date: "", reason: "Churned", summary_notes: "" });
      setFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to save post-mortem.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post-mortem?")) return;
    await base44.entities.PostMortem.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-800">This client is {client.status}</p>
          <p className="text-xs text-rose-600 mt-0.5">Upload the post-mortem document and capture lessons learned. All records are retained in the Post-Mortem Archive for year-end review.</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-rose-600 hover:bg-rose-700 text-white h-8">
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Post-Mortem
          </Button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">New Post-Mortem</h3>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Offboarding Date *</label>
              <input type="date" value={form.offboarding_date} onChange={e => set("offboarding_date", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
              <select value={form.reason} onChange={e => set("reason", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20">
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Post-Mortem Document *</label>
            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-rose-400 hover:bg-rose-50/30 transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 truncate">{file ? file.name : "Click to upload PDF, DOC, or image…"}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Notes</label>
            <textarea value={form.summary_notes} onChange={e => set("summary_notes", e.target.value)} rows={3}
              placeholder="Key takeaways, what went wrong, lessons learned…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(""); }} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={uploading} className="bg-rose-600 hover:bg-rose-700 text-white">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading…</> : "Save Post-Mortem"}
            </Button>
          </div>
        </form>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-slate-300 animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No post-mortem uploaded yet for this client.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(pm => (
            <div key={pm.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${REASON_COLORS[pm.reason] || REASON_COLORS["Other"]}`}>{pm.reason}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(pm.offboarding_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {pm.summary_notes && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{pm.summary_notes}</p>}
                    {pm.document_name && (
                      <a href={pm.document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium">
                        <Download className="w-3.5 h-3.5" /> {pm.document_name}
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(pm.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}