import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, CalendarDays, BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentCard from "@/components/social/ContentCard";
import ContentForm from "@/components/social/ContentForm";
import BrandProfileForm from "@/components/social/BrandProfileForm";

const STATUSES = ["all", "idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

const statusColors = {
  idea: "bg-slate-100 text-slate-600",
  in_production: "bg-amber-100 text-amber-700",
  ready_for_review: "bg-blue-100 text-blue-700",
  approved: "bg-violet-100 text-violet-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  published: "bg-emerald-100 text-emerald-700",
};

const priceTierColors = {
  Budget: "bg-slate-100 text-slate-600",
  "Mid-Range": "bg-blue-100 text-blue-700",
  Premium: "bg-violet-100 text-violet-700",
  Luxury: "bg-amber-100 text-amber-700",
};

export default function SocialMedia() {
  const [tab, setTab] = useState("content");
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);

  // Brand profiles state
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);

  useEffect(() => {
    base44.entities.Client.list().then(all => {
      setClients(all.filter(c => c.services?.includes("Social Media")));
    });
    base44.auth.me().then(setUser).catch(() => {});
    loadPosts();
    loadBrandProfiles();
  }, []);

  const loadPosts = async () => {
    const data = await base44.entities.ContentPlan.list("-scheduled_date", 200);
    setPosts(data);
  };

  const loadBrandProfiles = async () => {
    const data = await base44.entities.BrandProfile.list("-created_date");
    setBrandProfiles(data);
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

  const handleSaveBrand = async (data) => {
    if (editingBrand?.id) {
      await base44.entities.BrandProfile.update(editingBrand.id, data);
    } else {
      await base44.entities.BrandProfile.create(data);
    }
    setShowBrandForm(false);
    setEditingBrand(null);
    loadBrandProfiles();
  };

  const handleDeleteBrand = async (id) => {
    if (confirm("Delete this brand profile?")) {
      await base44.entities.BrandProfile.delete(id);
      loadBrandProfiles();
    }
  };

  const canEdit = ["admin", "leadership", "team_lead", "social_media"].includes(user?.role);

  const filtered = posts.filter(p => {
    const matchClient = selectedClientId === "all" || p.client_id === selectedClientId;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchClient && matchStatus;
  });

  const statusGroups = ["idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Social Media</h1>
          <p className="text-slate-500 text-sm mt-0.5">Content planning & production tracker</p>
        </div>
        {canEdit && tab === "content" && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setEditingPost(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Content
          </Button>
        )}
        {canEdit && tab === "brands" && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setEditingBrand(null); setShowBrandForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Brand Profile
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setTab("content")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "content" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Content Plans
        </button>
        <button onClick={() => setTab("brands")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "brands" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Brand Profiles
        </button>
      </div>

      {/* Content Tab */}
      {tab === "content" && (
        <>
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
        </>
      )}

      {/* Brand Profiles Tab */}
      {tab === "brands" && (
        <>
          {brandProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandProfiles.map(bp => {
                const linkedClient = clients.find(c => c.id === bp.client_id);
                return (
                  <div key={bp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{bp.name}</h3>
                        {linkedClient && <p className="text-xs text-blue-600 mt-0.5">{linkedClient.name}</p>}
                        <p className="text-xs text-slate-500 mt-0.5">{bp.location}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priceTierColors[bp.price_tier] || "bg-slate-100 text-slate-600"}`}>
                        {bp.price_tier}
                      </span>
                    </div>
                    {bp.products_offered?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {bp.products_offered.slice(0, 4).map(p => (
                          <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p}</span>
                        ))}
                        {bp.products_offered.length > 4 && (
                          <span className="text-xs text-slate-400">+{bp.products_offered.length - 4} more</span>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8"
                          onClick={() => { setEditingBrand(bp); setShowBrandForm(true); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8 text-red-500 hover:text-red-600 hover:border-red-300"
                          onClick={() => handleDeleteBrand(bp.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <BookUser className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">No brand profiles yet</p>
              <p className="text-xs mt-1">Create a brand profile to start generating content calendars</p>
            </div>
          )}
        </>
      )}

      {/* Content Form Modal */}
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

      {/* Brand Profile Form Modal */}
      {showBrandForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingBrand ? "Edit Brand Profile" : "New Brand Profile"}</h2>
              <button onClick={() => { setShowBrandForm(false); setEditingBrand(null); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <BrandProfileForm
              initial={editingBrand}
              clients={clients}
              onSave={handleSaveBrand}
              onCancel={() => { setShowBrandForm(false); setEditingBrand(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}