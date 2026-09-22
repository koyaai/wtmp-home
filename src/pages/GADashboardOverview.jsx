import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RefreshCw, Search, AlertCircle } from "lucide-react";
import SourceMultiSelect from "@/components/ga/SourceMultiSelect";

function fmtDuration(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgoStr(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function startOfWeekStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().split('T')[0];
}

const PRESETS = [
  { label: "This Week", gran: "week", get: () => ({ start: startOfWeekStr(), end: todayStr() }) },
  { label: "Last Week", gran: "week", get: () => {
    const s = startOfWeekStr();
    const d1 = new Date(s); d1.setDate(d1.getDate() - 7);
    const d2 = new Date(s); d2.setDate(d2.getDate() - 1);
    return { start: d1.toISOString().split('T')[0], end: d2.toISOString().split('T')[0] };
  }},
  { label: "Last 2 Weeks", gran: "week", get: () => {
    const s = startOfWeekStr();
    const d1 = new Date(s); d1.setDate(d1.getDate() - 7);
    return { start: d1.toISOString().split('T')[0], end: todayStr() };
  }},
  { label: "This Month", gran: "month", get: () => ({ start: new Date().toISOString().slice(0, 8) + "01", end: todayStr() }) },
  { label: "Last Month", gran: "month", get: () => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const start = d.toISOString().slice(0, 8) + "01";
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  }},
  { label: "Last 3 Months", gran: "month", get: () => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1);
    return { start: d.toISOString().split('T')[0], end: todayStr() };
  }},
];

export default function GADashboardOverview() {
  const [clients, setClients] = useState([]);
  const [gaRecords, setGaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState("month");
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().slice(0, 8) + "01", end: todayStr() });
  const [selectedSources, setSelectedSources] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [syncing, setSyncing] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    Promise.all([
      base44.entities.Client.list(),
      base44.entities.GAData.list("-report_date", 1000),
    ]).then(([c, g]) => { setClients(c); setGaRecords(g); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const canEdit = !user || ["admin", "leadership", "team_lead", "seo_specialist"].includes(user?.role);

  // Matching records for selected granularity + date range
  const matching = useMemo(() => {
    return gaRecords.filter(r => {
      const pt = r.period_type || "month";
      if (pt !== granularity) return false;
      const ps = r.period_start || r.report_date;
      const pe = r.period_end || r.report_date;
      if (!ps || !pe) return false;
      return ps <= dateRange.end && pe >= dateRange.start;
    });
  }, [gaRecords, granularity, dateRange]);

  // Aggregate per client
  const aggByClient = useMemo(() => {
    const map = {};
    matching.forEach(r => {
      if (!map[r.client_id]) map[r.client_id] = { sessions: 0, new_users: 0, engaged_sessions: 0, durSum: 0, durCount: 0, sources: new Set() };
      const a = map[r.client_id];
      a.sessions += r.sessions || 0;
      a.new_users += r.new_users || 0;
      a.engaged_sessions += r.engaged_sessions || 0;
      if (r.avg_session_duration != null) { a.durSum += r.avg_session_duration; a.durCount += 1; }
      if (r.traffic_sources) {
        try { JSON.parse(r.traffic_sources).forEach(s => { if (s.source) a.sources.add(s.source); }); } catch {}
      }
    });
    return map;
  }, [matching]);

  const availableSources = useMemo(() => {
    const set = new Set();
    Object.values(aggByClient).forEach(a => a.sources.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [aggByClient]);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [clients]
  );

  const rows = useMemo(() => {
    return sortedClients
      .filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
      .map(c => {
        const agg = aggByClient[c.id];
        const hasGA = !!c.ga_property_id;
        let status = "none";
        if (agg) status = "ok";
        else if (hasGA) status = "connected";
        const sources = agg ? Array.from(agg.sources) : [];
        return { client: c, agg, status, sources };
      })
      .filter(r => selectedSources.length === 0 || r.sources.some(s => selectedSources.includes(s)));
  }, [sortedClients, aggByClient, clientSearch, selectedSources]);

  const totals = useMemo(() => {
    const t = { new_users: 0, sessions: 0, engaged_sessions: 0, durSum: 0, durCount: 0 };
    rows.forEach(r => {
      if (!r.agg) return;
      t.new_users += r.agg.new_users;
      t.sessions += r.agg.sessions;
      t.engaged_sessions += r.agg.engaged_sessions;
      t.durSum += r.agg.durSum;
      t.durCount += r.agg.durCount;
    });
    return t;
  }, [rows]);

  const runSync = async ({ sync_months, backfill, granularity: gran, label }) => {
    const withGA = clients.filter(c => c.ga_property_id);
    if (withGA.length === 0) return;
    setSyncing({ label, done: 0, total: withGA.length, name: "" });
    let done = 0;
    for (const c of withGA) {
      setSyncing({ label, done, total: withGA.length, name: c.name });
      try {
        await base44.functions.invoke("syncGA", { client_id: c.id, property_id: c.ga_property_id, sync_months, backfill, granularity: gran });
      } catch {}
      done++;
    }
    setSyncing({ label, done, total: withGA.length, name: "" });
    const g = await base44.entities.GAData.list("-report_date", 1000);
    setGaRecords(g);
    setSyncing(null);
  };

  const applyPreset = (p) => { setGranularity(p.gran); setDateRange(p.get()); };

  const statusDot = (status) => {
    const color = status === "ok" ? "bg-emerald-500" : status === "connected" ? "bg-amber-400" : "bg-slate-300";
    const title = status === "ok" ? "Has data in range" : status === "connected" ? "GA connected, no data in range" : "No GA property set";
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={title} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">All Clients Google Analytics Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            New users, sessions, engaged sessions &amp; average session duration across every client
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSync({ sync_months: 1, backfill: false, granularity: "month", label: "Current month" })}
              disabled={!!syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing?.label === "Current month" ? "animate-spin" : ""}`} />
              Sync All (Current Month)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSync({ sync_months: 12, backfill: true, granularity: "month", label: "Backfill" })}
              disabled={!!syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing?.label === "Backfill" ? "animate-spin" : ""}`} />
              Backfill Previous Months
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSync({ sync_months: 8, backfill: false, granularity: "week", label: "Weekly" })}
              disabled={!!syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing?.label === "Weekly" ? "animate-spin" : ""}`} />
              Sync All (Weekly)
            </Button>
          </div>
        )}
      </div>

      {syncing && (
        <div className="text-xs text-slate-500">
          {syncing.label}: <span className="font-medium text-slate-700">{syncing.name || "…"}</span> ({syncing.done}/{syncing.total})
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters:</span>

          {/* Granularity toggle */}
          <div className="flex p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setGranularity("month")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${granularity === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setGranularity("week")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${granularity === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Weekly
            </button>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Source multi-select */}
          <SourceMultiSelect sources={availableSources} selected={selectedSources} onChange={setSelectedSources} />

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-56"
            />
          </div>

          <span className="text-xs text-slate-400 ml-auto">
            {rows.length} client{rows.length !== 1 ? "s" : ""} · {dateRange.start} to {dateRange.end}
          </span>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick select:</span>
          {PRESETS.map(p => {
            const active = granularity === p.gran;
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-50 text-xs text-slate-600 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">New Users</th>
                <th className="px-4 py-3 text-right">Sessions</th>
                <th className="px-4 py-3 text-right">Engaged Sessions</th>
                <th className="px-4 py-3 text-right">Avg. Session Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ client, agg, status }) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusDot(status)}
                      <Link to={`/ga/${client.id}`} className="font-medium text-slate-800 hover:text-violet-700 hover:underline">
                        {client.name}
                      </Link>
                      {status === "none" && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">No GA</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{agg?.new_users?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{agg?.sessions?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{agg?.engaged_sessions?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{agg && agg.durCount > 0 ? fmtDuration(agg.durSum / agg.durCount) : "—"}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td className="px-4 py-3">Totals ({rows.length})</td>
                <td className="px-4 py-3 text-right">{totals.new_users.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{totals.sessions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{totals.engaged_sessions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {totals.durCount > 0 ? fmtDuration(totals.durSum / totals.durCount) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">
            {gaRecords.length === 0
              ? "No GA data synced yet. Click \"Sync All\" to pull data for every client with a GA4 property ID."
              : "No clients match the current filters. Try a different date range or granularity."}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Status:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Has data in range</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> GA connected, no data in range</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> No GA property set</span>
      </div>
    </div>
  );
}