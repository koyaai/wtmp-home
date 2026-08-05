import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { buildHealthMap } from "@/utils/clientHealth";
import { buildLastActivityMap } from "@/utils/clientActivity";
import ClientList from "@/components/clients/ClientList";
import ClientDetail from "@/components/clients/ClientDetail";
import ClientForm from "@/components/clients/ClientForm";
import { Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientBatchUpload from "@/components/clients/ClientBatchUpload";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [healthMap, setHealthMap] = useState({});
  const [lastActivityMap, setLastActivityMap] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    loadClients(id);
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadClients = async (selectId = null) => {
    const [data, updates, insights, meetingNotes, onboardings] = await Promise.all([
      base44.entities.Client.list("-created_date", 100),
      base44.entities.CSMUpdate.list("-created_date", 200),
      base44.entities.ClientInsight.list("-created_date", 500),
      base44.entities.MeetingNote.list("-created_date", 500),
      base44.entities.Onboarding.list("-created_date", 500),
    ]);
    setClients(data);
    const activityMap = buildLastActivityMap(data, insights, updates, meetingNotes, onboardings);
    setLastActivityMap(activityMap);
    setHealthMap(buildHealthMap(data, updates, insights, activityMap));
    if (selectId) {
      const found = data.find(c => c.id === selectId);
      if (found) setSelectedClient(found);
    }
    setLoading(false);
  };

  const handleSave = async (formData) => {
    if (editingClient) {
      await base44.entities.Client.update(editingClient.id, formData);
    } else {
      await base44.entities.Client.create(formData);
    }
    setShowForm(false);
    setEditingClient(null);
    loadClients();
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client) => {
    if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
      await base44.entities.Client.delete(client.id);
      setSelectedClient(null);
      loadClients();
    }
  };

  const canEdit = !user || ["admin", "leadership", "team_lead", "csm"].includes(user?.role);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* List Panel */}
      <div className={`${selectedClient ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 border-r border-slate-200 bg-white flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <h1 className="font-bold text-slate-800">Clients</h1>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setShowBatchUpload(true)} className="h-8 text-xs">
                <Upload className="w-3.5 h-3.5 mr-1" /> Import
              </Button>
              <Button size="sm" onClick={() => { setEditingClient(null); setShowForm(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
        <ClientList clients={clients} selectedId={selectedClient?.id} onSelect={setSelectedClient} healthMap={healthMap} lastActivityMap={lastActivityMap} />
      </div>

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {selectedClient ? (
          <ClientDetail
            client={selectedClient}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBack={() => setSelectedClient(null)}
            canEdit={canEdit}
            userRole={user?.role}
            health={healthMap[selectedClient?.id]}
            lastActivityDate={lastActivityMap[selectedClient?.id]}
          />
        ) : (
          <div className="hidden md:flex items-center justify-center h-full text-slate-400 flex-col gap-2">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm">Select a client to view details</p>
          </div>
        )}
      </div>

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <ClientBatchUpload
          onClose={() => setShowBatchUpload(false)}
          onUploaded={() => { setShowBatchUpload(false); loadClients(); }}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingClient ? "Edit Client" : "Add New Client"}</h2>
              <button onClick={() => { setShowForm(false); setEditingClient(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ClientForm initial={editingClient} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingClient(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}