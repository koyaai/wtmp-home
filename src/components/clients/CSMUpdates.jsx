import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSlackAnnounce } from "@/hooks/useSlackAnnounce.jsx";

const typeColors = {
  win: "bg-emerald-100 text-emerald-700 border-emerald-200",
  churn_risk: "bg-red-100 text-red-700 border-red-200",
  issue: "bg-amber-100 text-amber-700 border-amber-200",
  upsell_opportunity: "bg-blue-100 text-blue-700 border-blue-200",
  status_update: "bg-slate-100 text-slate-700 border-slate-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
};

const UPDATE_TYPES = ["general", "status_update", "win", "issue", "churn_risk", "upsell_opportunity"];

export default function CSMUpdates({ clientId, canEdit }) {
  const [updates, setUpdates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState("general");
  const { prompt: promptSlack, toastElement: slackToast } = useSlackAnnounce(clientId);

  useEffect(() => {
    base44.entities.CSMUpdate.filter({ client_id: clientId }, "-created_date").then(setUpdates);
  }, [clientId]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    const postedContent = content;
    const postedType = type;
    await base44.entities.CSMUpdate.create({ client_id: clientId, content, update_type: type });
    setContent("");
    setType("general");
    setShowForm(false);
    base44.entities.CSMUpdate.filter({ client_id: clientId }, "-created_date").then(setUpdates);
    promptSlack({ type: "csm_update", updateType: postedType, content: postedContent });
  };

  const handleDelete = async (id) => {
    await base44.entities.CSMUpdate.delete(id);
    setUpdates(updates.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-3">
      {canEdit && !showForm && (
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Update
        </Button>
      )}
      {showForm && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {UPDATE_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-3 py-1 text-xs rounded-full font-medium border capitalize transition-colors ${type === t ? typeColors[t] : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
            placeholder="What's the update on this client?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd}>Post Update</Button>
          </div>
        </div>
      )}

      {updates.map(update => (
        <div key={update.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${typeColors[update.update_type] || typeColors.general}`}>
                {update.update_type?.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(update.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            {canEdit && (
              <button onClick={() => handleDelete(update.id)} className="text-slate-300 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{update.content}</p>
          {update.author && <p className="text-xs text-slate-400 mt-2">— {update.author}</p>}
        </div>
      ))}
      {updates.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-400 text-sm">No updates yet.</div>
      )}
      {slackToast}
    </div>
  );
}