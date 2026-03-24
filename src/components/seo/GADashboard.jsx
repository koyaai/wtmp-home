import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Eye, MousePointer, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? "—"}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function fmtDuration(secs) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#6366f1"];

export default function GADashboard({ client }) {
  const [gaData, setGaData] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMonths, setSyncMonths] = useState(1);

  useEffect(() => {
    if (!client?.id) return;
    base44.entities.GAData.filter({ client_id: client.id }, "-report_date", 12).then(setGaData);
  }, [client?.id]);

  const handleSync = async () => {
    if (!client?.ga_property_id) {
      setSyncError("No GA4 Property ID set for this client. Add it in the client profile.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      await base44.functions.invoke('syncGA', {
        client_id: client.id,
        property_id: client.ga_property_id,
        sync_months: syncMonths,
      });
      base44.entities.GAData.filter({ client_id: client.id }, "-report_date", 12).then(setGaData);
    } catch (err) {
      setSyncError(err?.response?.data?.error || "Sync failed. Check that the GA4 property ID is correct.");
    }
    setSyncing(false);
  };

  const latest = gaData[0];

  const chartData = [...gaData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sessions: d.sessions,
    users: d.users,
  }));

  let topPages = [];
  let trafficSources = [];
  try { topPages = latest?.top_pages ? JSON.parse(latest.top_pages) : []; } catch {}
  try { trafficSources = latest?.traffic_sources ? JSON.parse(latest.traffic_sources) : []; } catch {}

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={syncMonths}
          onChange={e => setSyncMonths(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value={1}>Last 1 Month</option>
          <option value={3}>Last 3 Months</option>
          <option value={6}>Last 6 Months</option>
          <option value={12}>Last 12 Months</option>
        </select>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync GA4"}
        </Button>
        {!client?.ga_property_id && (
          <p className="text-xs text-amber-600">⚠ Add a GA4 Property ID in the client profile to enable sync.</p>
        )}
        {syncError && <p className="text-xs text-red-500">{syncError}</p>}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Sessions" value={latest?.sessions?.toLocaleString()} icon={MousePointer} color="bg-blue-500" />
        <MetricCard label="Users" value={latest?.users?.toLocaleString()} icon={Users} color="bg-violet-500" />
        <MetricCard label="Pageviews" value={latest?.pageviews?.toLocaleString()} icon={Eye} color="bg-emerald-500" />
        <MetricCard label="Avg. Session" value={fmtDuration(latest?.avg_session_duration)} icon={Clock} color="bg-amber-500" />
      </div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="font-semibold text-slate-800 mb-4">Sessions & Users Over Time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sessions" />
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Pages + Traffic Sources */}
      {(topPages.length > 0 || trafficSources.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {topPages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Top Pages</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                    <th className="px-4 py-2 text-left">Page</th>
                    <th className="px-4 py-2 text-right">Sessions</th>
                    <th className="px-4 py-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topPages.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 truncate max-w-[180px]" title={p.page}>{p.page}</td>
                      <td className="px-4 py-2 text-right text-slate-800">{p.sessions?.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{p.pageviews?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {trafficSources.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Traffic Sources</h2>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trafficSources} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                      {trafficSources.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      {gaData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Report History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Pageviews</th>
                  <th className="px-4 py-3 text-right">Bounce Rate</th>
                  <th className="px-4 py-3 text-right">Avg. Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gaData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{d.period_start} – {d.period_end}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{d.sessions?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.users?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.pageviews?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.bounce_rate != null ? `${d.bounce_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtDuration(d.avg_session_duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gaData.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No GA4 data yet. Add a Property ID in the client profile and click Sync.</p>
        </div>
      )}
    </div>
  );
}