import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InsightInput from "@/components/csm/InsightInput";
import InsightCard from "@/components/csm/InsightCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartHandshake } from "lucide-react";

export default function CSMHub() {
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["insights", refreshKey],
    queryFn: () => base44.entities.ClientInsight.list("-created_date", 100)
  });

  const filtered = insights.filter(i => {
    const clientMatch = filterClient === "all" || i.client_id === filterClient;
    const statusMatch = filterStatus === "all" || i.status === filterStatus;
    return clientMatch && statusMatch;
  });

  const redFlagCount = insights.filter(i => i.red_flags?.length > 0 && i.status !== "resolved").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <HeartHandshake className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CSM Hub</h1>
          <p className="text-sm text-slate-500">Track client insights, requests, and red flags</p>
        </div>
        {redFlagCount > 0 && (
          <div className="ml-auto bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
            ⚠ {redFlagCount} Active Red Flag{redFlagCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Input */}
      <InsightInput clients={clients} onSaved={refresh} />

      {/* Filters + Feed */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-700 flex-1">Insight Feed</h2>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No insights yet. Paste a transcript above to get started.</p>
        )}
        <div className="space-y-3">
          {filtered.map(insight => (
            <InsightCard key={insight.id} insight={insight} onUpdated={refresh} onDeleted={refresh} />
          ))}
        </div>
      </div>
    </div>
  );
}