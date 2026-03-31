import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Trophy, XCircle, RefreshCw, ChevronDown, ChevronUp, DollarSign, Circle } from "lucide-react";
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

const statusStyles = {
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
  open: "bg-blue-100 text-blue-700",
};

export default function GHLLeads({ client }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPipeline, setExpandedPipeline] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("ghlLeads", {
      location_id: client.ghl_location_id,
      api_key: client.ghl_api_key,
    });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setData(res.data);
      const firstPipeline = Object.keys(res.data.pipeline_summary || {})[0];
      if (firstPipeline) setExpandedPipeline(firstPipeline);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (client.ghl_location_id && client.ghl_api_key) fetchData();
  }, [client.ghl_location_id, client.ghl_api_key]);

  if (!client.ghl_location_id || !client.ghl_api_key) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <p className="text-slate-400 text-sm">No GHL Location ID or API Key set for this client.</p>
        <p className="text-slate-400 text-xs mt-1">Add both in the client edit form to enable GHL sync.</p>
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
  const sources = Object.entries(data.source_counts || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">GHL Pipeline Data</h3>
        <Button size="sm" variant="outline" onClick={fetchData} className="h-7 text-xs gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Opps" value={data.total_opportunities} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Open" value={data.total_open} icon={Circle} color="bg-violet-500" />
        <StatCard label="Won" value={data.total_won} icon={Trophy} color="bg-emerald-500" />
        <StatCard label="Lost" value={data.total_lost} icon={XCircle} color="bg-red-400" />
      </div>

      {/* Won Revenue */}
      {data.total_won_revenue > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 font-medium">Total Won Revenue</p>
            <p className="text-xl font-bold text-emerald-800">${data.total_won_revenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Pipeline Breakdown */}
      {pipelines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pipelines</p>
          {pipelines.map(([pipelineName, summary]) => (
            <div key={pipelineName} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpandedPipeline(expandedPipeline === pipelineName ? null : pipelineName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-800">{pipelineName}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{summary.total} total</span>
                  {summary.revenue_won > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">${summary.revenue_won.toLocaleString()} won</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs">
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

      {/* Lead Sources */}
      {sources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Lead Sources</p>
          <div className="space-y-2">
            {sources.map(([source, count]) => (
              <div key={source} className="flex items-center gap-3">
                <p className="text-sm text-slate-700 flex-1 capitalize">{source}</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-400 rounded-full"
                      style={{ width: `${Math.min(100, (count / data.total_opportunities) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Opportunities */}
      {data.recent_opportunities?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Opportunities</p>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recent_opportunities.map(opp => (
              <div key={opp.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{opp.name}</p>
                  <p className="text-xs text-slate-400">{opp.contactName} · {opp.pipeline}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[opp.status] || statusStyles.open}`}>
                    {opp.stage}
                  </span>
                  {opp.value > 0 && <p className="text-xs text-slate-500">${opp.value.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}