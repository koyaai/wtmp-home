import { useState } from "react";
import { Button } from "@/components/ui/button";
import ClientSelect from "@/components/clients/ClientSelect";
import { Upload, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const REASONS = ["Churned", "Mutual Parting", "Project Completed", "Budget Cuts", "Dissatisfaction", "Other"];

export default function PostMortemForm({ clients, onSaved, onCancel }) {
  const [form, setForm] = useState({
    client_id: "",
    offboarding_date: "",
    reason: "Churned",
    summary_notes: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.client_id) return setError("Please select a client.");
    if (!form.offboarding_date) return setError("Please set an offboarding date.");
    if (!file) return setError("Please upload a post-mortem document.");

    const client = clients.find(c => c.id === form.client_id);
    if (!client) return setError("Client not found.");

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PostMortem.create({
        client_id: form.client_id,
        client_name: client.name,
        document_url: file_url,
        document_name: file.name,
        offboarding_date: form.offboarding_date,
        reason: form.reason,
        summary_notes: form.summary_notes,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save post-mortem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Client *</label>
          <ClientSelect
            clients={clients}
            value={form.client_id}
            onChange={(id) => set("client_id", id)}
            placeholder="Select offboarded client…"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Offboarding Date *</label>
          <input type="date" value={form.offboarding_date} onChange={e => set("offboarding_date", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Offboarding</label>
        <select value={form.reason} onChange={e => set("reason", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20">
          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Post-Mortem Document *</label>
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-rose-400 hover:bg-rose-50/30 transition-colors">
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 truncate">
              {file ? file.name : "Click to upload PDF, DOC, or image…"}
            </span>
            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && (
            <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Notes</label>
        <textarea value={form.summary_notes} onChange={e => set("summary_notes", e.target.value)}
          rows={4} placeholder="Key takeaways, what went wrong, lessons learned…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>Cancel</Button>
        <Button type="submit" disabled={uploading} className="bg-rose-600 hover:bg-rose-700 text-white">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading…</> : "Save Post-Mortem"}
        </Button>
      </div>
    </form>
  );
}