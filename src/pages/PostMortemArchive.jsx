import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PostMortemForm from "@/components/clients/PostMortemForm";
import PostMortemAIQuery from "@/components/clients/PostMortemAIQuery";
import { FileText, Plus, X, Download, Calendar, Loader2, FolderOpen, AlertCircle } from "lucide-react";

const REASON_COLORS = {
  "Churned": "bg-rose-100 text-rose-700 border-rose-200",
  "Mutual Parting": "bg-amber-100 text-amber-700 border-amber-200",
  "Project Completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Budget Cuts": "bg-orange-100 text-orange-700 border-orange-200",
  "Dissatisfaction": "bg-red-100 text-red-700 border-red-200",
  "Other": "bg-slate-100 text-slate-700 border-slate-200",
};

export default function PostMortemArchive() {
  const [postMortems, setPostMortems] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pms, allClients] = await Promise.all([
        base44.entities.PostMortem.list("-offboarding_date", 200),
        base44.entities.Client.list(),
      ]);
      setPostMortems(pms);
      setClients(allClients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const years = [...new Set(postMortems.map(pm => new Date(pm.offboarding_date + "T12:00:00").getFullYear()))].sort((a, b) => b - a);

  const filtered = postMortems.filter(pm => {
    const matchesYear = yearFilter === "all" || new Date(pm.offboarding_date + "T12:00:00").getFullYear() === parseInt(yearFilter);
    const matchesSearch = !search || pm.client_name?.toLowerCase().includes(search.toLowerCase()) || pm.summary_notes?.toLowerCase().includes(search.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this post-mortem? This cannot be undone.")) return;
    await base44.entities.PostMortem.delete(id);
    loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-rose-500" />
            Post-Mortem Archive
          </h1>
          <p className="text-sm text-slate-500 mt-1">Offboarding documents & lessons learned — {postMortems.length} total</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Post-Mortem
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or notes…"
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 flex-1 min-w-[200px]" />
      </div>

      {/* AI Query */}
      {postMortems.length > 0 && <PostMortemAIQuery postMortems={postMortems} />}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">New Post-Mortem</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <PostMortemForm
                clients={clients}
                onSaved={() => { setShowForm(false); loadData(); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No post-mortems found. Add your first one to start the archive.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pm => (
            <div key={pm.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 truncate">{pm.client_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${REASON_COLORS[pm.reason] || REASON_COLORS["Other"]}`}>
                        {pm.reason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Offboarded {new Date(pm.offboarding_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    {pm.summary_notes && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{pm.summary_notes}</p>
                    )}
                    {pm.document_name && (
                      <a href={pm.document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium">
                        <Download className="w-3.5 h-3.5" /> {pm.document_name}
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(pm.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Year-end insight hint */}
      {postMortems.length >= 3 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You have {postMortems.length} post-mortems archived. Filter by year above to review patterns and recurring issues for your year-end retrospective.
          </p>
        </div>
      )}
    </div>
  );
}