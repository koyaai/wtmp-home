import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Trophy, XCircle, RefreshCw, ChevronDown, ChevronUp, DollarSign, Circle, DatabaseZap, ChevronLeft, ChevronRight } from "lucide-react";
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

function formatMonth(key) {
  const [year, month] = key.split('-');
  return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function GHLLeads({ client }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [expandedPipeline, setExpandedPipeline] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

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
      // Default to most recent month
      if (res.data.months?.length > 0) {
        setSelectedMonth(res.data.months[0]);
      }
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    // Parse the selected month key (e.g. "2026-04") to pass year/month to sync
    const [syncYear, syncMonth] = selectedMonth
      ? selectedMonth.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];
    const res = await base44.functions.invoke('syncGHLLeads', {
      client_id: client.id,
      year: syncYear,
      month: syncMonth - 1, // 0-indexed
    });
    setSyncResult(res.data?.results?.find(r => r.client === client.name) || { action: 'done' });
    setSyncing(false);
    fetchData();
  };

  useEffect(() => {
    if (client.ghl_location_id && client.ghl_api_key) fetchData();
  }, [client.ghl_location_id, client.ghl_api_key]);

  // Reset expanded pipeline when month changes
  useEffect(() => {
    if (selectedMonth && data) {
      const firstPipeline = Object.keys(data.monthly_data?.[selectedMonth]?.pipelines || {})[0];
      setExpandedPipeline(firstPipeline || null);
    }
  }, [selectedMonth]);

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

  if (!data || !selectedMonth) return null;

  const months = data.months || [];
  const monthIndex = months.indexOf(selectedMonth);
  const monthData = data.monthly_data?.[selectedMonth] || {};
  const pipelines = Object.entries(monthData.pipelines || {});
  const sources = Object.entries(monthData.sources || {}).sort((a, b) => b[1] - a[1]);

  const prevMonth = months[monthIndex + 1] || null;
  const nextMonth = months[monthIndex - 1] || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">GHL Pipeline Data</h3>
        <div className="flex gap-2 items-center">
          {syncResult && (
            <span className="text-xs text-emerald-600 font-medium">
              {syncResult.action === 'error' ? '⚠ Sync failed' : syncResult.action === 'created' ? '✓ Lead record created' : '✓ Lead record updated'}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-7 text-xs gap-1">
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <DatabaseZap className="w-3 h-3" />}
            {syncing ? 'Syncing…' : 'Sync to Leads'}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData} className="h-7 text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => prevMonth && setSelectedMonth(prevMonth)}
          disabled={!prevMonth}
          className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">{formatMonth(selectedMonth)}</p>
          <p className="text-xs text-slate-400">{monthData.total || 0} opportunities</p>
        </div>
        <button
          onClick={() => nextMonth && setSelectedMonth(nextMonth)}
          disabled={!nextMonth}
          className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="New Opps" value={monthData.total} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Open" value={monthData.open} icon={Circle} color="bg-violet-500" />
        <StatCard label="Won" value={monthData.won} icon={Trophy} color="bg-emerald-500" />
        <StatCard label="Lost" value={monthData.lost} icon={XCircle} color="bg-red-400" />
      </div>

      {/* Won Revenue */}
      {monthData.revenue_won > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 font-medium">Won Revenue This Month</p>
            <p className="text-xl font-bold text-emerald-800">${monthData.revenue_won.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Lead Sources */}
      {sources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Where Leads Came From</p>
          <div className="space-y-2">
            {sources.map(([source, count]) => (
              <div key={source} className="flex items-center gap-3">
                <p className="text-sm text-slate-700 flex-1 capitalize">{source}</p>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-400 rounded-full"
                      style={{ width: `${Math.min(100, (count / monthData.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{count} ({Math.round((count / monthData.total) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Breakdown */}
      {(() => {
        const tags = Object.entries(monthData.tags || {}).sort((a, b) => b[1] - a[1]);
        if (tags.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Lead Tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.map(([tag, count]) => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
                  {tag} <span className="text-amber-500">({count})</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pipeline Breakdown */}
      {pipelines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pipeline Breakdown</p>
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

      {/* Opportunities List */}
      {monthData.opportunities?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Opportunities — {formatMonth(selectedMonth)}
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {monthData.opportunities.map(opp => (
              <div key={opp.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{opp.name}</p>
                  <p className="text-xs text-slate-400">{opp.contactName} · {opp.source || 'No source'}</p>
                  {opp.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {opp.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
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