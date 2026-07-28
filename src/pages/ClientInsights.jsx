import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import InsightInput from "@/components/csm/InsightInput";
import InsightCard from "@/components/csm/InsightCard";
import ClientSelect from "@/components/clients/ClientSelect";

export default function ClientInsights() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [insights, setInsights] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.Client.list("-name").then(setClients);
  }, []);

  useEffect(() => {
    if (selectedClientId) loadInsights();
  }, [selectedClientId]);

  const loadInsights = async () => {
    const data = await base44.entities.ClientInsight.filter({ client_id: selectedClientId }, "-created_date");
    setInsights(data);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filtered = statusFilter === "all" ? insights : insights.filter(i => i.status === statusFilter);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Client Insights</h1>
            <p className="text-sm text-slate-500">Paste transcripts or emails — AI extracts to-dos, requests & red flags</p>
          </div>
        </div>

        {/* Client Selector */}
        <ClientSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Select a client..." className="w-full" />

        {selectedClientId && (
          <>
            <InsightInput
              clientId={selectedClientId}
              clientName={selectedClient?.name || ""}
              onSaved={loadInsights}
            />

            {/* Filter + list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-700">Previous Insights ({filtered.length})</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-dashed border-slate-200">
                  No insights yet. Paste a transcript above to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(insight => (
                    <InsightCard key={insight.id} insight={insight} onUpdate={loadInsights} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}