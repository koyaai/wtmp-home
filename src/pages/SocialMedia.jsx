import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, CalendarDays, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentCard from "../components/social/ContentCard";
import ContentForm from "../components/social/ContentForm";

const STATUSES = ["all", "idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

const statusColors = {
  idea: "bg-slate-100 text-slate-600",
  in_production: "bg-amber-100 text-amber-700",
  ready_for_review: "bg-blue-100 text-blue-700",
  approved: "bg-violet-100 text-violet-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  published: "bg-emerald-100 text-emerald-700",
};

export default function SocialMedia() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.entities.Client.list().then(all => {
      setClients(all.filter(c => c.services?.includes("Social Media")));
    });
    base44.auth.me().then(setUser).catch(() => {});
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await base44.entities.ContentPlan.list("-scheduled_date", 200);
    setPosts(data);
  };

  const handleSave = async (data) => {
    if (data.id) {
      await base44.entities.ContentPlan.update(data.id, data);
    } else {
      await base44.entities.ContentPlan.create(data);
    }
    setShowForm(false);
    setEditingPost(null);
    loadPosts();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContentPlan.delete(id);
    loadPosts();
  };

  const canEdit = ["leadership", "team_lead", "social_media"].includes(user?.role);

  const filtered = posts.filter(p => {
    const matchClient = selectedClientId === "all" || p.client_id === selectedClientId;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchClient && matchStatus;
  });

  // Group by status for kanban-ish view
  const statusGroups = ["idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Social Media</h1>
          <p className="text-slate-500 text-sm mt-0.5">Content planning & production tracker</p>
        </div>
        {canEdit && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setEditingPost(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Content
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${statusFilter === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"}`}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(post => (
            <ContentCard
              key={post.id}
              post={post}
              clients={clients}
              canEdit={canEdit}
              onEdit={() => { setEditingPost(post); setShowForm(true); }}
              onDelete={() => handleDelete(post.id)}
              onStatusChange={async (newStatus) => {
                await base44.entities.ContentPlan.update(post.id, { status: newStatus });
                loadPosts();
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">No content plans found</p>
          <p className="text-xs mt-1">Create your first content plan to get started</p>
        </div>
      )}

      {/* Summary by status */}
      {posts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4">Content Pipeline</h2>
          <div className="flex flex-wrap gap-3">
            {statusGroups.map(s => {
              const count = posts.filter(p => p.status === s && (selectedClientId === "all" || p.client_id === selectedClientId)).length;
              return (
                <div key={s} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusColors[s]}`}>
                  <span className="text-sm font-bold">{count}</span>
                  <span className="text-xs capitalize">{s.replace("_", " ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingPost ? "Edit Content Plan" : "New Content Plan"}</h2>
              <button onClick={() => { setShowForm(false); setEditingPost(null); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <ContentForm
              initial={editingPost}
              clients={clients}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingPost(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}