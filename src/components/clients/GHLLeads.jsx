import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Users, TrendingUp, Trophy, XCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

export default function GHLLeads({ client }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPipeline, setExpandedPipeline] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("ghlLeads", { location_id: client.ghl_location_id });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setData(res.data);
      // Auto-expand first pipeline
      const firstPipeline = Object.keys(res.data.pipeline_summary || {})[0];
      if (firstPipeline) setExpandedPipeline(firstPipeline);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (client.ghl_location_id) fetchData();
  }, [client.ghl_location_id]);

  if (!client.ghl_location_id) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <p className="text-slate-400 text-sm">No GHL Location ID set for this client.</p>
        <p className="text-slate-400 text-xs mt-1">Add it in the client edit form to enable GHL sync.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500 text-sm">Fetching GHL data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-6 text-center space-y-3">
        <p className="text-red-600 text-sm font-medium">GHL Error</p>
        <p className="text-slate-500 text-xs">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const pipelines = Object.entries(data.pipeline_summary || {});
  const totalWon = pipelines.reduce((sum, [, p]) => sum + p.won, 0);
  const totalOpen = pipelines.reduce((sum, [, p]) => sum + p.open, 0);
  const totalLost = pipelines.reduce((sum, [, p]) => sum + p.lost, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">GHL Lead Data</h3>
        <Button size="sm" variant="outline" onClick={fetchData} className="h-7 text-xs gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Contacts" value={data.total_contacts} icon={Users} color="bg-blue-500" />
        <StatCard label="Opportunities" value={data.total_opportunities} icon={TrendingUp} color="bg-violet-500" />
        <StatCard label="Won" value={totalWon} icon={Trophy} color="bg-emerald-500" />
        <StatCard label="Lost" value={totalLost} icon={XCircle} color="bg-red-400" />
      </div>

      {/* Pipeline Breakdown */}
      {pipelines.length > 0 && (
        <div className="space-y-2">
          {pipelines.map(([pipelineName, summary]) => (
            <div key={pipelineName} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpandedPipeline(expandedPipeline === pipelineName ? null : pipelineName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-800">{pipelineName}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{summary.total} total</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-medium">{summary.won} won</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-600 font-medium">{summary.open} open</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-red-500 font-medium">{summary.lost} lost</span>
                  </div>
                  {expandedPipeline === pipelineName ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedPipeline === pipelineName && (
                <div className="border-t border-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">By Stage</p>
                  <div className="space-y-2">
                    {Object.entries(summary.stages).map(([stage, count]) => (
                      <div key={stage} className="flex items-center gap-3">
                        <p className="text-sm text-slate-700 flex-1">{stage}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, (count / summary.total) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Contacts */}
      {data.recent_contacts?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Most Recent Contacts</p>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recent_contacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{contact.name}</p>
                  <p className="text-xs text-slate-400">{contact.email || contact.phone || "No contact info"}</p>
                </div>
                <div className="text-right">
                  {contact.source && <p className="text-xs text-slate-400">{contact.source}</p>}
                  {contact.dateAdded && (
                    <p className="text-xs text-slate-300">{new Date(contact.dateAdded).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}