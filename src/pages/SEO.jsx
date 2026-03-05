import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, TrendingUp, Eye, MousePointer, BarChart2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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

export default function SEO() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [seoData, setSeoData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMonths, setSyncMonths] = useState(1);

  useEffect(() => {
    base44.entities.Client.filter({ services: "SEO" }).then(c => {
      // fallback: get all if filter doesn't support array
      base44.entities.Client.list().then(all => {
        const seoClients = all.filter(c => c.services?.includes("SEO"));
        setClients(seoClients);
        if (seoClients.length > 0) setSelectedClientId(seoClients[0].id);
      });
    }).catch(() => {
      base44.entities.Client.list().then(all => {
        const seoClients = all.filter(c => c.services?.includes("SEO"));
        setClients(seoClients);
        if (seoClients.length > 0) setSelectedClientId(seoClients[0].id);
      });
    });
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
  }, [selectedClientId]);

  const latest = seoData[0];
  const canEdit = !user || ["admin", "leadership", "team_lead", "seo_specialist"].includes(user?.role);

  const handleGSCSync = async () => {
    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (!selectedClient?.google_search_console_url) {
      setSyncError("This client has no Google Search Console URL set. Please add it in the client profile.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      await base44.functions.invoke('syncGSC', {
        client_id: selectedClientId,
        site_url: selectedClient.google_search_console_url,
        sync_months: syncMonths,
      });
      base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
    } catch (err) {
      setSyncError(err?.response?.data?.error || "Sync failed. Check that the service account has access to this GSC property.");
    }
    setSyncing(false);
  };

  const handleSave = async () => {
    await base44.entities.SEOData.create({ ...form, client_id: selectedClientId });
    setShowForm(false);
    setForm({});
    base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
  };

  const chartData = [...seoData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    clicks: d.organic_clicks,
    impressions: d.organic_impressions,
    position: d.avg_position,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SEO Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitor organic performance & GBP metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {canEdit && (
            <>
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
              <Button size="sm" variant="outline" onClick={handleGSCSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync GSC"}
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Log Report
              </Button>
            </>
          )}
          {syncError && (
            <p className="text-xs text-red-500 w-full mt-1">{syncError}</p>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Organic Clicks" value={latest?.organic_clicks?.toLocaleString()} icon={MousePointer} color="bg-blue-500" />
        <MetricCard label="Impressions" value={latest?.organic_impressions?.toLocaleString()} icon={Eye} color="bg-violet-500" />
        <MetricCard label="Avg. Position" value={latest?.avg_position ? `#${latest.avg_position}` : null} icon={TrendingUp} color="bg-emerald-500" />
        <MetricCard label="CTR" value={latest?.ctr ? `${latest.ctr}%` : null} icon={BarChart2} color="bg-amber-500" />
      </div>

      {/* GBP Metrics */}
      {(latest?.gbp_views || latest?.gbp_calls || latest?.gbp_direction_requests) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4">Google Business Profile</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{latest?.gbp_views?.toLocaleString() || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{latest?.gbp_calls?.toLocaleString() || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{latest?.gbp_direction_requests?.toLocaleString() || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">Direction Requests</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Clicks Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Avg. Position Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis reversed tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Table */}
      {seoData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Report History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Avg. Pos</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">GBP Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {seoData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">{d.organic_clicks?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.organic_impressions?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.avg_position ? `#${d.avg_position}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.ctr ? `${d.ctr}%` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.gbp_views?.toLocaleString() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seoData.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No SEO data yet. Log a report to get started.</p>
        </div>
      )}

      {/* Log Report Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Log SEO Report</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { key: "report_date", label: "Report Date", type: "date" },
                { key: "organic_clicks", label: "Organic Clicks", type: "number" },
                { key: "organic_impressions", label: "Impressions", type: "number" },
                { key: "avg_position", label: "Avg. Position", type: "number" },
                { key: "ctr", label: "CTR (%)", type: "number" },
                { key: "gbp_views", label: "GBP Views", type: "number" },
                { key: "gbp_calls", label: "GBP Calls", type: "number" },
                { key: "gbp_direction_requests", label: "GBP Direction Requests", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-600">{f.label}</label>
                  <input type={f.type} value={form[f.key] || ""} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Save Report</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}