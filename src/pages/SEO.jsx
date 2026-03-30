import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, TrendingUp, Eye, MousePointer, BarChart2, X, RefreshCw, Users, Clock, Search, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, Legend
} from "recharts";

function MetricCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? "—"}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, color = "bg-blue-500" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-5 rounded-full ${color}`} />
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{children}</h2>
    </div>
  );
}

function fmtDuration(secs) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function SEO() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [seoData, setSeoData] = useState([]);
  const [gaData, setGaData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [user, setUser] = useState(null);

  const [syncingGSC, setSyncingGSC] = useState(false);
  const [syncingGA, setSyncingGA] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMonths, setSyncMonths] = useState(3);

  useEffect(() => {
    base44.entities.Client.list().then(all => {
      const seoClients = all.filter(c => c.services?.includes("SEO"));
      setClients(seoClients);
      if (seoClients.length > 0) setSelectedClientId(seoClients[0].id);
    });
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
    base44.entities.GAData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setGaData);
  }, [selectedClientId]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const latestSEO = seoData[0];
  const latestGA = gaData[0];
  const canEdit = !user || ["admin", "leadership", "team_lead", "seo_specialist"].includes(user?.role);

  const handleGSCSync = async () => {
    if (!selectedClient?.google_search_console_url) {
      setSyncError("No GSC URL set for this client. Add it in the client profile.");
      return;
    }
    setSyncingGSC(true);
    setSyncError("");
    try {
      await base44.functions.invoke('syncGSC', {
        client_id: selectedClientId,
        site_url: selectedClient.google_search_console_url,
        sync_months: syncMonths,
      });
      base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
    } catch (err) {
      setSyncError(err?.response?.data?.error || "GSC sync failed.");
    }
    setSyncingGSC(false);
  };

  const handleGASync = async () => {
    if (!selectedClient?.ga_property_id) {
      setSyncError("No GA4 Property ID set for this client. Add it in the client profile.");
      return;
    }
    setSyncingGA(true);
    setSyncError("");
    try {
      await base44.functions.invoke('syncGA', {
        client_id: selectedClientId,
        property_id: selectedClient.ga_property_id,
        sync_months: syncMonths,
      });
      base44.entities.GAData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setGaData);
    } catch (err) {
      setSyncError(err?.response?.data?.error || "GA4 sync failed.");
    }
    setSyncingGA(false);
  };

  const handleSave = async () => {
    await base44.entities.SEOData.create({ ...form, client_id: selectedClientId });
    setShowForm(false);
    setForm({});
    base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setSeoData);
  };

  // Combined chart data — merge by date
  const gscChartData = [...seoData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    clicks: d.organic_clicks,
    impressions: d.organic_impressions,
    position: d.avg_position,
  }));

  const gaChartData = [...gaData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    sessions: d.sessions,
    users: d.users,
  }));

  let topKeywords = [];
  let gscTopPages = [];
  let gaTopPages = [];
  let trafficSources = [];
  try { topKeywords = latestSEO?.top_keywords ? JSON.parse(latestSEO.top_keywords) : []; } catch {}
  try { gscTopPages = latestSEO?.top_pages ? JSON.parse(latestSEO.top_pages) : []; } catch {}
  try { gaTopPages = latestGA?.top_pages ? JSON.parse(latestGA.top_pages) : []; } catch {}
  try { trafficSources = latestGA?.traffic_sources ? JSON.parse(latestGA.traffic_sources) : []; } catch {}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SEO & Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Unified view of organic search & website performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={syncMonths} onChange={e => setSyncMonths(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value={1}>Last 1 Month</option>
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={handleGSCSync} disabled={syncingGSC}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingGSC ? "animate-spin" : ""}`} />
                {syncingGSC ? "Syncing..." : "Sync GSC"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleGASync} disabled={syncingGA}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingGA ? "animate-spin" : ""}`} />
                {syncingGA ? "Syncing..." : "Sync GA4"}
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Log SEO
              </Button>
            </>
          )}
        </div>
        {syncError && <p className="w-full text-xs text-red-500">{syncError}</p>}
      </div>

      {/* GSC Metrics */}
      <div className="space-y-3">
        <SectionLabel color="bg-blue-500">Google Search Console</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Organic Clicks" value={latestSEO?.organic_clicks?.toLocaleString()} icon={MousePointer} color="bg-blue-500" />
          <MetricCard label="Impressions" value={latestSEO?.organic_impressions?.toLocaleString()} icon={Eye} color="bg-violet-500" />
          <MetricCard label="Avg. Position" value={latestSEO?.avg_position ? `#${latestSEO.avg_position}` : null} icon={TrendingUp} color="bg-emerald-500" />
          <MetricCard label="CTR" value={latestSEO?.ctr ? `${latestSEO.ctr}%` : null} icon={BarChart2} color="bg-amber-500" />
        </div>
      </div>

      {/* GA4 Metrics */}
      <div className="space-y-3">
        <SectionLabel color="bg-orange-500">Google Analytics 4</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard label="Sessions" value={latestGA?.sessions?.toLocaleString()} icon={Activity} color="bg-orange-500" />
          <MetricCard label="Users" value={latestGA?.users?.toLocaleString()} icon={Users} color="bg-rose-500" />
          <MetricCard label="New Users" value={latestGA?.new_users?.toLocaleString()} icon={Users} color="bg-pink-500" />
          <MetricCard label="Pageviews" value={latestGA?.pageviews?.toLocaleString()} icon={Eye} color="bg-cyan-500" />
          <MetricCard label="Bounce Rate" value={latestGA?.bounce_rate != null ? `${latestGA.bounce_rate}%` : null} icon={TrendingUp} color="bg-slate-500" />
          <MetricCard label="Avg. Session" value={fmtDuration(latestGA?.avg_session_duration)} icon={Clock} color="bg-teal-500" />
        </div>
      </div>

      {/* GBP Metrics */}
      {(latestSEO?.gbp_views || latestSEO?.gbp_calls || latestSEO?.gbp_direction_requests) && (
        <div className="space-y-3">
          <SectionLabel color="bg-green-500">Google Business Profile</SectionLabel>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{latestSEO?.gbp_views?.toLocaleString() || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{latestSEO?.gbp_calls?.toLocaleString() || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">Calls</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{latestSEO?.gbp_direction_requests?.toLocaleString() || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">Direction Requests</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Charts */}
      {(gscChartData.length > 1 || gaChartData.length > 1) && (
        <div className="grid md:grid-cols-2 gap-4">
          {gscChartData.length > 1 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800 mb-1">Clicks & Impressions</p>
              <p className="text-xs text-slate-400 mb-4">Google Search Console</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={gscChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                  <Line type="monotone" dataKey="impressions" stroke="#a78bfa" strokeWidth={2} dot={false} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {gaChartData.length > 1 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800 mb-1">Sessions & Users</p>
              <p className="text-xs text-slate-400 mb-4">Google Analytics 4</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={gaChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#f97316" strokeWidth={2} dot={false} name="Sessions" />
                  <Line type="monotone" dataKey="users" stroke="#f43f5e" strokeWidth={2} dot={false} name="Users" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {gscChartData.length > 1 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800 mb-1">Avg. Position</p>
              <p className="text-xs text-slate-400 mb-4">Google Search Console</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={gscChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis reversed tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {trafficSources.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800 mb-1">Traffic Sources</p>
              <p className="text-xs text-slate-400 mb-4">Google Analytics 4</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trafficSources} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                    {trafficSources.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top Keywords + Pages */}
      {(topKeywords.length > 0 || gscTopPages.length > 0 || gaTopPages.length > 0) && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topKeywords.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Top Keywords</h2>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-2 text-left">Query</th>
                  <th className="px-4 py-2 text-right">Clicks</th>
                  <th className="px-4 py-2 text-right">Pos</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {topKeywords.slice(0, 8).map((k, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]">{k.query}</td>
                      <td className="px-4 py-2 text-right text-slate-800">{k.clicks ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{k.position ? `#${k.position}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {gscTopPages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Top Pages (GSC)</h2>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-2 text-left">Page</th>
                  <th className="px-4 py-2 text-right">Clicks</th>
                  <th className="px-4 py-2 text-right">Pos</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {gscTopPages.slice(0, 8).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]" title={p.page}>{p.page?.replace(/^https?:\/\/[^/]+/, '') || p.page}</td>
                      <td className="px-4 py-2 text-right text-slate-800">{p.clicks ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{p.position ? `#${p.position}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {gaTopPages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Top Pages (GA4)</h2>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-2 text-left">Page</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Views</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {gaTopPages.slice(0, 8).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]" title={p.page}>{p.page}</td>
                      <td className="px-4 py-2 text-right text-slate-800">{p.sessions?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{p.pageviews?.toLocaleString() ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {seoData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="font-semibold text-slate-800">GSC History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">Impr.</th>
                    <th className="px-4 py-3 text-right">Pos</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {seoData.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{new Date(d.report_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{d.organic_clicks?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.organic_impressions?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.avg_position ? `#${d.avg_position}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.ctr ? `${d.ctr}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {gaData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <h2 className="font-semibold text-slate-800">GA4 History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Sessions</th>
                    <th className="px-4 py-3 text-right">Users</th>
                    <th className="px-4 py-3 text-right">New Users</th>
                    <th className="px-4 py-3 text-right">Bounce</th>
                    <th className="px-4 py-3 text-right">Avg. Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gaData.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{d.period_start ? new Date(d.period_start).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{d.sessions?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.users?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.new_users?.toLocaleString() || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{d.bounce_rate != null ? `${d.bounce_rate}%` : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtDuration(d.avg_session_duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {seoData.length === 0 && gaData.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No data yet. Sync GSC & GA4 to populate this dashboard.</p>
        </div>
      )}

      {/* Manual Log Form */}
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