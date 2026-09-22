import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Search, Users, Activity, Clock, MousePointer, Eye,
  TrendingUp, BarChart2, AlertCircle, ArrowLeft, MapPin
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";

const HERO_IMG = "https://media.base44.com/images/public/69a8542871f0800172d1b793/bf3bff6a0_generated_e9d121d3.jpg";
const ASIDE_IMG = "https://media.base44.com/images/public/69a8542871f0800172d1b793/74ecc408a_generated_2c37f207.jpg";

const SOURCE_COLORS = ["#79eee0", "#9a7bff", "#edb85d", "#54d2c2", "#b8b3c8", "#f59e0b"];

function fmtDuration(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

function monthKey(rec) {
  const d = rec.period_start || rec.report_date;
  return d ? d.slice(0, 7) : "";
}

function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(`${y}-${m}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fullMonthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(`${y}-${m}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function TrendBadge({ change }) {
  if (change == null) return null;
  const up = change >= 0;
  return (
    <em className={`not-italic text-xs font-bold ${up ? "text-emerald-500" : "text-rose-400"}`}>
      {up ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
    </em>
  );
}

function MetricCard({ label, value, change }) {
  return (
    <div className="relative min-h-[156px] p-6 border border-violet-100 rounded-2xl bg-white/80 shadow-[0_14px_35px_rgba(50,35,110,0.08)] backdrop-blur-md overflow-hidden">
      <div className="absolute w-[130px] h-[130px] -right-10 -top-12 rounded-full bg-violet-400/10" />
      <small className="block text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</small>
      <strong className="block mt-4 text-slate-800 text-3xl tracking-tight">{value}</strong>
      <div className="mt-2"><TrendBadge change={change} /></div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, dark = true }) {
  return (
    <div className={dark ? "rounded-2xl p-5 bg-[#211b48] overflow-hidden" : "rounded-2xl p-5 bg-white border border-slate-100"}>
      {title && <p className={dark ? "font-semibold text-white text-sm mb-1" : "font-semibold text-slate-800 text-sm mb-1"}>{title}</p>}
      {subtitle && <p className={dark ? "text-xs text-violet-200/70 mb-4" : "text-xs text-slate-400 mb-4"}>{subtitle}</p>}
      {children}
    </div>
  );
}

const TABS = ["Overview", "Traffic Sources", "SEO Visibility"];

export default function ClientGADashboard() {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [gaRecords, setGaRecords] = useState([]);
  const [seoRecords, setSeoRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [rangeMonths, setRangeMonths] = useState(6);
  const [syncingGA, setSyncingGA] = useState(false);
  const [syncingGSC, setSyncingGSC] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    Promise.all([
      base44.entities.Client.list(),
      base44.entities.GAData.filter({ client_id: clientId }, "report_date", 200),
      base44.entities.SEOData.filter({ client_id: clientId }, "report_date", 200),
    ]).then(([clients, ga, seo]) => {
      setClient(clients.find(c => c.id === clientId) || { id: clientId, name: "Unknown Client" });
      setGaRecords(ga);
      setSeoRecords(seo);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clientId]);

  const canEdit = !user || ["admin", "leadership", "team_lead", "seo_specialist"].includes(user?.role);

  // GA records sorted ascending by period, filtered to range
  const gaAsc = useMemo(() => [...gaRecords].sort((a, b) => (monthKey(a)).localeCompare(monthKey(b))), [gaRecords]);
  const gaInRange = useMemo(() => gaAsc.slice(-rangeMonths), [gaAsc, rangeMonths]);
  const seoAsc = useMemo(() => [...seoRecords].sort((a, b) => (a.report_date || "").localeCompare(b.report_date || "")), [seoRecords]);
  const seoInRange = useMemo(() => seoAsc.slice(-rangeMonths), [seoAsc, rangeMonths]);

  // KPI totals (sum across range) + MoM change (last vs prev month)
  const kpis = useMemo(() => {
    const sum = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0);
    const last = gaInRange[gaInRange.length - 1];
    const prev = gaInRange[gaInRange.length - 2];
    const avgDur = gaInRange.length ? gaInRange.reduce((s, r) => s + (r.avg_session_duration || 0), 0) / (gaInRange.filter(r => r.avg_session_duration != null).length || 1) : null;
    return {
      new_users: sum(gaInRange, "new_users"),
      sessions: sum(gaInRange, "sessions"),
      engaged_sessions: sum(gaInRange, "engaged_sessions"),
      avg_duration: avgDur,
      change_new_users: pctChange(last?.new_users, prev?.new_users),
      change_sessions: pctChange(last?.sessions, prev?.sessions),
      change_engaged: pctChange(last?.engaged_sessions, prev?.engaged_sessions),
      change_duration: pctChange(last?.avg_session_duration, prev?.avg_session_duration),
    };
  }, [gaInRange]);

  // Chart data for GA
  const gaChartData = useMemo(() => gaInRange.map(d => ({
    month: monthLabel(monthKey(d)),
    new_users: d.new_users ?? 0,
    sessions: d.sessions ?? 0,
    engaged: d.engaged_sessions ?? 0,
  })), [gaInRange]);

  // Chart data for GSC
  const gscChartData = useMemo(() => seoInRange.map(d => ({
    month: monthLabel(d.report_date?.slice(0, 7)),
    clicks: d.organic_clicks ?? 0,
    impressions: d.organic_impressions ?? 0,
    position: d.avg_position ?? null,
    ctr: d.ctr ?? null,
  })), [seoInRange]);

  // GSC KPIs (latest in range)
  const gscKpis = useMemo(() => {
    const last = seoInRange[seoInRange.length - 1];
    const prev = seoInRange[seoInRange.length - 2];
    return {
      clicks: last?.organic_clicks,
      impressions: last?.organic_impressions,
      position: last?.avg_position,
      ctr: last?.ctr,
      change_clicks: pctChange(last?.organic_clicks, prev?.organic_clicks),
      change_impr: pctChange(last?.organic_impressions, prev?.organic_impressions),
      change_position: pctChange(last?.avg_position, prev?.avg_position),
      change_ctr: pctChange(last?.ctr, prev?.ctr),
    };
  }, [seoInRange]);

  // Traffic sources (latest GA record)
  const trafficSources = useMemo(() => {
    const last = gaInRange[gaInRange.length - 1];
    if (!last?.traffic_sources) return [];
    try { return JSON.parse(last.traffic_sources); } catch { return []; }
  }, [gaInRange]);

  // Top pages GA (latest)
  const gaTopPages = useMemo(() => {
    const last = gaInRange[gaInRange.length - 1];
    if (!last?.top_pages) return [];
    try { return JSON.parse(last.top_pages); } catch { return []; }
  }, [gaInRange]);

  // Top keywords + top pages GSC (latest)
  const topKeywords = useMemo(() => {
    const last = seoInRange[seoInRange.length - 1];
    if (!last?.top_keywords) return [];
    try { return JSON.parse(last.top_keywords); } catch { return []; }
  }, [seoInRange]);
  const gscTopPages = useMemo(() => {
    const last = seoInRange[seoInRange.length - 1];
    if (!last?.top_pages) return [];
    try { return JSON.parse(last.top_pages); } catch { return []; }
  }, [seoInRange]);

  const refresh = async () => {
    const [ga, seo] = await Promise.all([
      base44.entities.GAData.filter({ client_id: clientId }, "report_date", 200),
      base44.entities.SEOData.filter({ client_id: clientId }, "report_date", 200),
    ]);
    setGaRecords(ga);
    setSeoRecords(seo);
  };

  const handleSyncGA = async () => {
    if (!client?.ga_property_id) { setSyncError("No GA4 Property ID set for this client."); return; }
    setSyncingGA(true); setSyncError("");
    try {
      await base44.functions.invoke("syncGA", { client_id: clientId, property_id: client.ga_property_id, sync_months: rangeMonths });
      await refresh();
    } catch (err) { setSyncError(err?.response?.data?.error || "GA4 sync failed."); }
    setSyncingGA(false);
  };

  const handleSyncGSC = async () => {
    if (!client?.google_search_console_url) { setSyncError("No GSC URL set for this client."); return; }
    setSyncingGSC(true); setSyncError("");
    try {
      await base44.functions.invoke("syncGSC", { client_id: clientId, site_url: client.google_search_console_url, sync_months: rangeMonths });
      await refresh();
    } catch (err) { setSyncError(err?.response?.data?.error || "GSC sync failed."); }
    setSyncingGSC(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const hasGA = !!client?.ga_property_id;
  const hasGSC = !!client?.google_search_console_url;

  return (
    <div className="bg-[#f5f3ff] min-h-full">
      {/* Hero */}
      <section className="relative min-h-[420px] px-6 md:px-16 py-10 overflow-hidden text-white bg-[#151332]">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0d2b]/95 via-[#1c1645]/75 to-[#1d1343]/35" />
        <div className="relative z-10">
          <div className="flex items-center justify-between pb-6 border-b border-white/20">
            <div className="flex items-center gap-3 text-lg font-bold tracking-wide">
              <span className="block w-8 h-8 rounded-full border-2 border-[#7ef0e3] shadow-[0_0_22px_rgba(126,240,227,0.5)]" />
              WTMP
            </div>
            <div className="text-xs md:text-sm text-violet-200 tracking-wide">
              Google Analytics Overview / {client?.name}
            </div>
          </div>
          <div className="pt-12 max-w-4xl">
            <div className="text-xs uppercase tracking-[0.2em] text-[#86eee3] font-bold">Google Analytics Overview</div>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight leading-tight">{client?.name}</h1>
            <p className="mt-3 text-violet-200 text-base md:text-lg max-w-2xl">
              Historical GA4 traffic &amp; Google Search Console visibility trends for this client.
            </p>
            <div className="flex gap-3 mt-8 flex-wrap">
              <span className="px-4 py-2 border border-white/20 rounded-full bg-white/10 backdrop-blur-md text-xs text-violet-100">Historical performance</span>
              <span className="px-4 py-2 border border-white/20 rounded-full bg-white/10 backdrop-blur-md text-xs text-violet-100">SEO reporting</span>
              <span className="px-4 py-2 border border-white/20 rounded-full bg-white/10 backdrop-blur-md text-xs text-violet-100">{hasGA ? "GA4 connected" : "No GA4 property"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="relative z-10 px-6 md:px-16 py-10 max-w-[1400px] mx-auto">
        <Link to="/GADashboardOverview" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to overview
        </Link>

        {/* Tabs */}
        <nav className="flex gap-1 p-1.5 w-max border border-violet-100 rounded-2xl bg-white/65 shadow-[0_15px_40px_rgba(50,35,110,0.08)] backdrop-blur-md overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                tab === t ? "bg-[#312569] text-white shadow-[0_7px_18px_rgba(49,37,105,0.22)]" : "text-slate-500 hover:bg-violet-50 hover:text-[#22174d]"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-5 my-7 flex-wrap">
          <div>
            <h2 className="text-2xl tracking-tight text-[#29234e] font-bold">
              {tab === "SEO Visibility" ? "Search visibility" : "Performance overview"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tab === "SEO Visibility" ? "GSC organic performance" : "Selected range"} · Last {rangeMonths} months
            </p>
          </div>
          <div className="flex gap-2.5 items-center flex-wrap">
            <select
              value={rangeMonths}
              onChange={e => setRangeMonths(Number(e.target.value))}
              className="h-11 px-4 text-sm border border-violet-100 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            {canEdit && (
              <>
                <Button variant="outline" size="default" onClick={handleSyncGA} disabled={syncingGA || !hasGA} className="h-11">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingGA ? "animate-spin" : ""}`} />
                  {syncingGA ? "Syncing…" : "Sync GA4"}
                </Button>
                <Button variant="outline" size="default" onClick={handleSyncGSC} disabled={syncingGSC || !hasGSC} className="h-11">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingGSC ? "animate-spin" : ""}`} />
                  {syncingGSC ? "Syncing…" : "Sync GSC"}
                </Button>
              </>
            )}
          </div>
        </div>

        {syncError && <p className="text-xs text-rose-500 mb-4">{syncError}</p>}

        {/* OVERVIEW TAB */}
        {tab === "Overview" && (
          <div className="space-y-10">
            {!hasGA && (
              <div className="text-center py-10 text-slate-400">
                <AlertCircle className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No GA4 property ID set for this client. Add one in the client profile to sync traffic data.</p>
              </div>
            )}
            {hasGA && gaInRange.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <AlertCircle className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No GA4 data synced yet for this range. Click "Sync GA4" to pull historical traffic data.</p>
              </div>
            )}
            {hasGA && gaInRange.length > 0 && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="New Users" value={kpis.new_users.toLocaleString()} change={kpis.change_new_users} />
                  <MetricCard label="Sessions" value={kpis.sessions.toLocaleString()} change={kpis.change_sessions} />
                  <MetricCard label="Engaged Sessions" value={kpis.engaged_sessions.toLocaleString()} change={kpis.change_engaged} />
                  <MetricCard label="Avg. Session Duration" value={fmtDuration(kpis.avg_duration)} change={kpis.change_duration} />
                </div>

                {/* Historical chart */}
                <div className="p-6 md:p-8 border border-violet-100 rounded-3xl bg-white/75 shadow-[0_18px_55px_rgba(50,35,110,0.09)] backdrop-blur-md">
                  <div className="flex items-start justify-between gap-6 mb-6 flex-wrap">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[#29234e]">Historical performance</h3>
                      <p className="mt-1 text-sm text-slate-500">New users &amp; sessions over the last {rangeMonths} months</p>
                    </div>
                  </div>
                  <div className="rounded-2xl p-5 bg-[#211b48] overflow-hidden">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={gaChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: "#bcb5dd", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#bcb5dd", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#30265d", border: "none", borderRadius: 12, color: "#fff" }} />
                        <Line type="monotone" dataKey="new_users" stroke="#79eee0" strokeWidth={3} dot={{ r: 3, fill: "#79eee0" }} name="New Users" />
                        <Line type="monotone" dataKey="sessions" stroke="#9a7bff" strokeWidth={3} dot={{ r: 3, fill: "#9a7bff" }} name="Sessions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-6 mt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#79eee0]" /> New Users</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#9a7bff]" /> Sessions</span>
                  </div>
                </div>

                {/* Split: monthly history table + traffic sources aside */}
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
                  <div className="overflow-hidden border border-violet-100 rounded-2xl bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-violet-50 text-violet-700 text-xs uppercase tracking-wider">
                          <th className="px-5 py-4 text-left">Period</th>
                          <th className="px-5 py-4 text-right">New Users</th>
                          <th className="px-5 py-4 text-right">Sessions</th>
                          <th className="px-5 py-4 text-right">Engaged</th>
                          <th className="px-5 py-4 text-right">Avg. Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {gaInRange.map(d => (
                          <tr key={d.id} className="hover:bg-violet-50/40">
                            <td className="px-5 py-4 font-semibold text-[#29234e]">{fullMonthLabel(monthKey(d))}</td>
                            <td className="px-5 py-4 text-right text-slate-600">{d.new_users?.toLocaleString() ?? "—"}</td>
                            <td className="px-5 py-4 text-right text-slate-600">{d.sessions?.toLocaleString() ?? "—"}</td>
                            <td className="px-5 py-4 text-right text-slate-600">{d.engaged_sessions?.toLocaleString() ?? "—"}</td>
                            <td className="px-5 py-4 text-right text-slate-600">{fmtDuration(d.avg_session_duration)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <aside className="p-6 rounded-2xl bg-[#30265d] text-white relative overflow-hidden">
                    <img src={ASIDE_IMG} alt="" className="w-full h-[150px] object-cover rounded-xl opacity-75 mb-5" />
                    <h4 className="text-lg font-bold">Traffic sources</h4>
                    {trafficSources.length === 0 ? (
                      <p className="text-violet-200/80 text-sm mt-3 leading-relaxed">No traffic source breakdown available for the latest period.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {trafficSources.slice(0, 5).map((s, i) => (
                          <p key={i} className="text-violet-200 text-sm flex justify-between">
                            <span>{s.source}</span>
                            <span className="font-semibold text-white">{s.sessions?.toLocaleString?.() ?? s.sessions ?? "—"}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </aside>
                </div>
              </>
            )}
          </div>
        )}

        {/* TRAFFIC SOURCES TAB */}
        {tab === "Traffic Sources" && (
          <div className="space-y-6">
            {trafficSources.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No traffic source data available. Sync GA4 to populate this view.</p>
              </div>
            ) : (
              <>
                <div className="p-6 border border-violet-100 rounded-3xl bg-white/75 shadow-[0_18px_55px_rgba(50,35,110,0.09)]">
                  <h3 className="text-lg font-bold text-[#29234e] mb-1">Traffic sources</h3>
                  <p className="text-sm text-slate-500 mb-5">Sessions by source for {fullMonthLabel(monthKey(gaInRange[gaInRange.length - 1] || {}))}</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={trafficSources} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="sessions" radius={[0, 6, 6, 0]}>
                        {trafficSources.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {gaTopPages.length > 0 && (
                  <div className="overflow-hidden border border-violet-100 rounded-2xl bg-white">
                    <div className="px-5 py-4 border-b border-violet-50 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-violet-500" />
                      <h3 className="font-bold text-[#29234e] text-sm">Top Pages (GA4)</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="bg-violet-50 text-xs text-violet-700 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Page</th>
                        <th className="px-5 py-3 text-right">Sessions</th>
                        <th className="px-5 py-3 text-right">Pageviews</th>
                      </tr></thead>
                      <tbody className="divide-y divide-violet-50">
                        {gaTopPages.slice(0, 10).map((p, i) => (
                          <tr key={i} className="hover:bg-violet-50/40">
                            <td className="px-5 py-3 text-slate-700 truncate max-w-[300px]" title={p.page}>{p.page}</td>
                            <td className="px-5 py-3 text-right text-slate-600">{p.sessions?.toLocaleString() ?? "—"}</td>
                            <td className="px-5 py-3 text-right text-slate-600">{p.pageviews?.toLocaleString() ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SEO VISIBILITY TAB */}
        {tab === "SEO Visibility" && (
          <div className="space-y-8">
            {!hasGSC && (
              <div className="text-center py-10 text-slate-400">
                <AlertCircle className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No Google Search Console URL set for this client. Add one in the client profile to sync search visibility data.</p>
              </div>
            )}
            {hasGSC && seoInRange.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <AlertCircle className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No GSC data synced yet. Click "Sync GSC" to pull organic search metrics.</p>
              </div>
            )}
            {hasGSC && seoInRange.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Organic Clicks" value={gscKpis.clicks?.toLocaleString() ?? "—"} change={gscKpis.change_clicks} />
                  <MetricCard label="Impressions" value={gscKpis.impressions?.toLocaleString() ?? "—"} change={gscKpis.change_impr} />
                  <MetricCard label="Avg. Position" value={gscKpis.position != null ? `#${gscKpis.position}` : "—"} change={gscKpis.change_position} />
                  <MetricCard label="CTR" value={gscKpis.ctr != null ? `${gscKpis.ctr}%` : "—"} change={gscKpis.change_ctr} />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <ChartCard title="Clicks & Impressions" subtitle="Google Search Console">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={gscChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: "#bcb5dd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#bcb5dd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#30265d", border: "none", borderRadius: 12, color: "#fff" }} />
                        <Line type="monotone" dataKey="clicks" stroke="#79eee0" strokeWidth={2.5} dot={false} name="Clicks" />
                        <Line type="monotone" dataKey="impressions" stroke="#9a7bff" strokeWidth={2.5} dot={false} name="Impressions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Avg. Position" subtitle="Lower is better">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={gscChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: "#bcb5dd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis reversed tick={{ fill: "#bcb5dd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#30265d", border: "none", borderRadius: 12, color: "#fff" }} />
                        <Line type="monotone" dataKey="position" stroke="#edb85d" strokeWidth={2.5} dot={false} name="Position" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {topKeywords.length > 0 && (
                    <div className="overflow-hidden border border-violet-100 rounded-2xl bg-white">
                      <div className="px-5 py-4 border-b border-violet-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-violet-500" />
                        <h3 className="font-bold text-[#29234e] text-sm">Top Keywords</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="bg-violet-50 text-xs text-violet-700 uppercase tracking-wider">
                          <th className="px-5 py-3 text-left">Query</th>
                          <th className="px-5 py-3 text-right">Clicks</th>
                          <th className="px-5 py-3 text-right">Pos</th>
                        </tr></thead>
                        <tbody className="divide-y divide-violet-50">
                          {topKeywords.slice(0, 10).map((k, i) => (
                            <tr key={i} className="hover:bg-violet-50/40">
                              <td className="px-5 py-3 text-slate-700 truncate max-w-[220px]" title={k.query}>{k.query}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{k.clicks ?? "—"}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{k.position ? `#${k.position}` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {gscTopPages.length > 0 && (
                    <div className="overflow-hidden border border-violet-100 rounded-2xl bg-white">
                      <div className="px-5 py-4 border-b border-violet-50 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-violet-500" />
                        <h3 className="font-bold text-[#29234e] text-sm">Top Pages (GSC)</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="bg-violet-50 text-xs text-violet-700 uppercase tracking-wider">
                          <th className="px-5 py-3 text-left">Page</th>
                          <th className="px-5 py-3 text-right">Clicks</th>
                          <th className="px-5 py-3 text-right">Pos</th>
                        </tr></thead>
                        <tbody className="divide-y divide-violet-50">
                          {gscTopPages.slice(0, 10).map((p, i) => (
                            <tr key={i} className="hover:bg-violet-50/40">
                              <td className="px-5 py-3 text-slate-700 truncate max-w-[220px]" title={p.page}>{p.page?.replace(/^https?:\/\/[^/]+/, '') || p.page}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{p.clicks ?? "—"}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{p.position ? `#${p.position}` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bottom banner */}
        <div className="relative mt-10 min-h-[200px] overflow-hidden rounded-3xl text-white p-8 md:p-10 bg-[#241b51]">
          <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#18113d]/95 to-[#261954]/30" />
          <div className="relative z-10 max-w-xl">
            <h3 className="text-2xl md:text-3xl font-bold leading-tight">SEO visibility</h3>
            <p className="mt-2 text-violet-200 leading-relaxed">
              Historical page performance, search discovery and engaged sessions are collected in one view for {client?.name}.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}