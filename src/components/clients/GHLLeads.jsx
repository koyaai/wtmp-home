import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Trophy, XCircle, RefreshCw, ChevronDown, ChevronUp, DollarSign, Circle, DatabaseZap, PhoneCall, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inRange } from "@/utils/leadDateRange";
import { cn } from "@/lib/utils";

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

// Re-aggregate a flat array of opportunities into the summary shape used by the UI.
function aggregateOpps(opps) {
  const summary = {
    total: opps.length,
    won: 0,
    lost: 0,
    open: 0,
    revenue_won: 0,
    sources: {},
    sessionSources: {},
    tags: {},
    pipelines: {},
  };
  for (const opp of opps) {
    if (opp.status === "won") {
      summary.won++;
      summary.revenue_won += opp.value || 0;
    } else if (opp.status === "lost") {
      summary.lost++;
    } else {
      summary.open++;
    }
    const src = opp.source || "Direct";
    summary.sources[src] = (summary.sources[src] || 0) + 1;
    if (opp.sessionSource) {
      summary.sessionSources[opp.sessionSource] = (summary.sessionSources[opp.sessionSource] || 0) + 1;
    }
    for (const tag of opp.tags || []) {
      summary.tags[tag] = (summary.tags[tag] || 0) + 1;
    }
    const pipelineName = opp.pipeline || "Default";
    const stageName = opp.stage || "Unknown";
    if (!summary.pipelines[pipelineName]) {
      summary.pipelines[pipelineName] = { total: 0, won: 0, lost: 0, open: 0, revenue_won: 0, stages: {} };
    }
    const p = summary.pipelines[pipelineName];
    p.total++;
    p.stages[stageName] = (p.stages[stageName] || 0) + 1;
    if (opp.status === "won") { p.won++; p.revenue_won += opp.value || 0; }
    else if (opp.status === "lost") p.lost++;
    else p.open++;
  }
  return summary;
}

function isFirstTimeCall(opp) {
  return (opp.tags || []).some((t) => {
    const lower = t.toLowerCase();
    return lower.includes("first") && lower.includes("call");
  });
}

export default function GHLLeads({ client, dateRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPipeline, setExpandedPipeline] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);

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
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    const now = new Date();
    const [syncYear, syncMonth] = [now.getFullYear(), now.getMonth() + 1];
    const res = await base44.functions.invoke("syncGHLLeads", {
      client_id: client.id,
      year: syncYear,
      month: syncMonth - 1,
    });
    setSyncResult(res.data?.results?.find((r) => r.client === client.name) || { action: "done" });
    setSyncing(false);
    fetchData();
  };

  useEffect(() => {
    if (client.ghl_location_id && client.ghl_api_key) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.ghl_location_id, client.ghl_api_key]);

  // Reset tag selections when the date range changes (tags are derived from the filtered set)
  useEffect(() => {
    setSelectedTags([]);
    setFirstTimeOnly(false);
  }, [dateRange?.start, dateRange?.end]);

  // Flatten all opportunities across every month and filter by the selected date range.
  const allOpps = useMemo(() => {
    if (!data?.monthly_data) return [];
    const flat = [];
    for (const monthKey of Object.keys(data.monthly_data)) {
      for (const opp of data.monthly_data[monthKey].opportunities || []) {
        flat.push(opp);
      }
    }
    if (!dateRange) return flat;
    return flat.filter((opp) => inRange(opp.createdAt, dateRange.start, dateRange.end));
  }, [data, dateRange]);

  // Available tags come from the date-filtered set (before tag/first-time narrowing).
  const availableTags = useMemo(() => {
    const counts = {};
    for (const opp of allOpps) {
      for (const tag of opp.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allOpps]);

  // Apply tag + first-time-call filters on top of the date-filtered set.
  const filteredOpps = useMemo(() => {
    let result = allOpps;
    if (selectedTags.length > 0) {
      result = result.filter((opp) =>
        selectedTags.some((t) => (opp.tags || []).includes(t))
      );
    }
    if (firstTimeOnly) {
      result = result.filter(isFirstTimeCall);
    }
    return result;
  }, [allOpps, selectedTags, firstTimeOnly]);

  const summary = useMemo(() => aggregateOpps(filteredOpps), [filteredOpps]);

  const firstTimeCount = useMemo(
    () => allOpps.filter(isFirstTimeCall).length,
    [allOpps]
  );

  // Auto-expand the first pipeline whenever the filtered set changes
  useEffect(() => {
    const firstPipeline = Object.keys(summary.pipelines)[0];
    setExpandedPipeline(firstPipeline || null);
  }, [summary]);

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

  const sources = Object.entries(summary.sources).sort((a, b) => b[1] - a[1]);
  const sessionSources = Object.entries(summary.sessionSources).sort((a, b) => b[1] - a[1]);
  const tags = Object.entries(summary.tags).sort((a, b) => b[1] - a[1]);
  const pipelines = Object.entries(summary.pipelines);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">GHL Pipeline Data</h3>
        <div className="flex gap-2 items-center">
          {syncResult && (
            <span className="text-xs text-emerald-600 font-medium">
              {syncResult.action === "error" ? "⚠ Sync failed" : syncResult.action === "created" ? "✓ Lead record created" : "✓ Lead record updated"}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-7 text-xs gap-1">
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <DatabaseZap className="w-3 h-3" />}
            {syncing ? "Syncing…" : "Sync to Leads"}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData} className="h-7 text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tag chips + First-time Calls toggle */}
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {availableTags.length > 0 && (
            <>
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Tags</span>
              {availableTags.map(([tag, count]) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      active
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
                    )}
                  >
                    {tag} <span className={active ? "text-amber-100" : "text-amber-500"}>({count})</span>
                  </button>
                );
              })}
            </>
          )}
          <button
            onClick={() => setFirstTimeOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              availableTags.length > 0 && "ml-1",
              firstTimeOnly
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400"
            )}
          >
            <PhoneCall className="w-3 h-3" />
            First-time Calls
          </button>
        </div>
      </div>

      {/* Active-filter summary cards */}
      {(firstTimeOnly || selectedTags.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {firstTimeOnly && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">First-time Calls</p>
                <p className="text-lg font-bold text-blue-800">{firstTimeCount}</p>
              </div>
            </div>
          )}
          {selectedTags.map((tag) => {
            const count = filteredOpps.filter((opp) => (opp.tags || []).includes(tag)).length;
            return (
              <div key={tag} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-amber-600 font-medium truncate">{tag}</p>
                  <p className="text-lg font-bold text-amber-800">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="New Opps" value={summary.total} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Open" value={summary.open} icon={Circle} color="bg-violet-500" />
        <StatCard label="Won" value={summary.won} icon={Trophy} color="bg-emerald-500" />
        <StatCard label="Lost" value={summary.lost} icon={XCircle} color="bg-red-400" />
      </div>

      {/* Won Revenue */}
      {summary.revenue_won > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 font-medium">Won Revenue (selected range)</p>
            <p className="text-xl font-bold text-emerald-800">${summary.revenue_won.toLocaleString()}</p>
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
                      style={{ width: `${Math.min(100, (count / summary.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{count} ({Math.round((count / summary.total) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Source Breakdown */}
      {sessionSources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Session Sources</p>
          <div className="flex flex-wrap gap-2">
            {sessionSources.map(([source, count]) => (
              <span key={source} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-medium">
                {source} <span className="text-blue-500">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags Breakdown */}
      {tags.length > 0 && (
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
      )}

      {/* Pipeline Breakdown */}
      {pipelines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pipeline Breakdown</p>
          {pipelines.map(([pipelineName, p]) => (
            <div key={pipelineName} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpandedPipeline(expandedPipeline === pipelineName ? null : pipelineName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-800">{pipelineName}</p>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.total} total</span>
                  {p.revenue_won > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">${p.revenue_won.toLocaleString()} won</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-medium">{p.won} won</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-600 font-medium">{p.open} open</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-red-500 font-medium">{p.lost} lost</span>
                  </div>
                  {expandedPipeline === pipelineName ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedPipeline === pipelineName && (
                <div className="border-t border-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">By Stage</p>
                  <div className="space-y-2">
                    {Object.entries(p.stages).map(([stage, count]) => (
                      <div key={stage} className="flex items-center gap-3">
                        <p className="text-sm text-slate-700 flex-1">{stage}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, (count / p.total) * 100)}%` }}
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
      {filteredOpps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Opportunities — {filteredOpps.length} shown
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredOpps.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{opp.name}</p>
                  <p className="text-xs text-slate-400">{opp.contactName}{opp.source ? ` · ${opp.source}` : ""}</p>
                  {(opp.sessionSource || opp.utmSource) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Session: {[opp.sessionSource, opp.utmSource].filter(Boolean).join(" / ")}
                      {opp.utmCampaign ? ` | ${opp.utmCampaign}` : ""}
                    </p>
                  )}
                  {opp.createdAt && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(opp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  {opp.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {opp.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[opp.status] || statusStyles.open}`}>
                    {opp.stage !== opp.status ? opp.stage : opp.status}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{opp.status}</span>
                  {opp.value > 0 && <p className="text-xs text-slate-500">${opp.value.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredOpps.length === 0 && allOpps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <p className="text-slate-400 text-sm">No opportunities match the selected filters.</p>
        </div>
      )}
    </div>
  );
}