import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, Activity, Users, MousePointer, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

function fmtDuration(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

function monthKey(periodStart) {
  return periodStart ? periodStart.slice(0, 7) : "";
}

function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(`${y}-${m}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function GADashboardOverview() {
  const [clients, setClients] = useState([]);
  const [gaRecords, setGaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSource, setSelectedSource] = useState("All Sources");
  const [clientSearch, setClientSearch] = useState("");
  const [syncing, setSyncing] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    Promise.all([
      base44.entities.Client.list(),
      base44.entities.GAData.list("-report_date", 500),
    ]).then(([c, g]) => {
      setClients(c);
      setGaRecords(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const canEdit = !user || ["admin", "leadership", "team_lead", "seo_specialist"].includes(user?.role);

  // Available months (desc) from all GA records
  const availableMonths = useMemo(() => {
    const set = new Set();
    gaRecords.forEach(r => { const k = monthKey(r.period_start || r.report_date); if (k) set.add(k); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [gaRecords]);

  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
  }, [availableMonths, selectedMonth]);

  // Map client_id -> record for the selected month
  const recordByClient = useMemo(() => {
    const map = {};
    gaRecords.forEach(r => {
      if (monthKey(r.period_start || r.report_date) === selectedMonth) map[r.client_id] = r;
    });
    return map;
  }, [gaRecords, selectedMonth]);

  // All distinct traffic sources for the selected month
  const availableSources = useMemo(() => {
    const set = new Set();
    Object.values(recordByClient).forEach(r => {
      if (!r.traffic_sources) return;
      try {
        JSON.parse(r.traffic_sources).forEach(s => { if (s.source) set.add(s.source); });
      } catch {}
    });
    return Array.from(set).sort();
  }, [recordByClient]);

  // Sorted clients (alphabetical)
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [clients]
  );

  // Filtered rows
  const rows = useMemo(() => {
    return sortedClients
      .filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
      .map(c => {
        const rec = recordByClient[c.id];
        let sources = [];
        if (rec?.traffic_sources) {
          try { sources = JSON.parse(rec.traffic_sources).map(s => s.source); } catch {}
        }
        const hasGA = !!c.ga_property_id;
        const hasData = !!rec;
        let status = "none";
        if (hasData) status = "ok";
        else if (hasGA) status = "connected";
        return { client: c, rec, sources, status };
      })
      .filter(r => selectedSource === "All Sources" || r.sources.includes(selectedSource));
  }, [sortedClients, recordByClient, clientSearch, selectedSource]);

  // Totals
  const totals = useMemo(() => {
    const t = { new_users: 0, sessions: 0, engaged_sessions: 0, durationSum: 0, durationCount: 0 };
    rows.forEach(r => {
      if (!r.rec) return;
      t.new_users += r.rec.new_users || 0;
      t.sessions += r.rec.sessions || 0;
      t.engaged_sessions += r.rec.engaged_sessions || 0;
      if (r.rec.avg_session_duration != null) {
        t.durationSum += r.rec.avg_session_duration;
        t.durationCount += 1;
      }
    });
    return t;
  }, [rows]);

  const runSync = async ({ sync_months, backfill, label }) => {
    const withGA = clients.filter(c => c.ga_property_id);
    if (withGA.length === 0) return;
    setSyncing({ label, done: 0, total: withGA.length, name: "" });
    let done = 0;
    for (const c of withGA) {
      setSyncing({ label, done, total: withGA.length, name: c.name });
      try {
        await base44.functions.invoke("syncGA", {
          client_id: c.id,
          property_id: c.ga_property_id,
          sync_months,
          backfill,
        });
      } catch {}
      done++;
    }
    setSyncing({ label, done, total: withGA.length, name: "" });
    const g = await base44.entities.GAData.list("-report_date", 500);
    setGaRecords(g);
    setSyncing(null);
  };

  const statusDot = (status) => {
    const color = status === "ok" ? "bg-emerald-500" : status === "connected" ? "bg-amber-400" : "bg-slate-300";
    const title = status === "ok" ? "Has data for this month" : status === "connected" ? "GA connected, no data this month" : "No GA property set";
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
            New users, sessions, engaged sessions & average session duration across every client
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSync({ sync_months: 1, backfill: false, label: "Current month" })}
              disabled={!!syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing?.label === "Current month" ? "animate-spin" : ""}`} />
              Sync All (Current Month)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSync({ sync_months: 12, backfill: true, label: "Backfill" })}
              disabled={!!syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing?.label === "Backfill" ? "animate-spin" : ""}`} />
              Backfill Previous Months
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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters:</span>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {availableMonths.length === 0 && <option value="">No data yet</option>}
          {availableMonths.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
        </select>
        <select
          value={selectedSource}
          onChange={e => setSelectedSource(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="All Sources">All Sources</option>
          {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
          {rows.length} client{rows.length !== 1 ? "s" : ""}{selectedMonth && ` · ${monthLabel(selectedMonth)}`}
        </span>
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
              {rows.map(({ client, rec, status }) => (
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
                  <td className="px-4 py-3 text-right text-slate-700">{rec?.new_users?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{rec?.sessions?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{rec?.engaged_sessions?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{rec ? fmtDuration(rec.avg_session_duration) : "—"}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td className="px-4 py-3">Totals ({rows.length})</td>
                <td className="px-4 py-3 text-right">{totals.new_users.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{totals.sessions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{totals.engaged_sessions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {totals.durationCount > 0 ? fmtDuration(totals.durationSum / totals.durationCount) : "—"}
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
              ? "No GA data synced yet. Click \"Sync All\" to pull the current month for every client with a GA4 property ID."
              : "No clients match the current filters."}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Status:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Has data this month</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> GA connected, no data this month</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> No GA property set</span>
      </div>
    </div>
  );
}