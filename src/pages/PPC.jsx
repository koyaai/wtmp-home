import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, DollarSign, MousePointer, TrendingUp, Target, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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

export default function PPC() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [ppcData, setPpcData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "Google Ads" });
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMonths, setSyncMonths] = useState(1);

  useEffect(() => {
    base44.entities.Client.list().then(all => {
      const ppcClients = all.filter(c => c.services?.includes("PPC"));
      setClients(ppcClients);
      if (ppcClients.length > 0) setSelectedClientId(ppcClients[0].id);
    });
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.PPCData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setPpcData);
  }, [selectedClientId]);

  const latest = ppcData[0];
  const canEdit = ["admin", "leadership", "team_lead", "ppc_specialist"].includes(user?.role);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleSave = async () => {
    const data = { ...form, client_id: selectedClientId };
    const numericFields = ['budget','spend','impressions','clicks','ctr','cpc','conversions','cost_per_conversion','roas'];
    numericFields.forEach(f => { if (data[f]) data[f] = parseFloat(data[f]); });
    await base44.entities.PPCData.create(data);
    setShowForm(false);
    setForm({ platform: 'Google Ads' });
    base44.entities.PPCData.filter({ client_id: selectedClientId }, '-report_date', 12).then(setPpcData);
  };

  const handleGoogleAdsSync = async () => {
    if (!selectedClient?.google_ads_account_id) {
      setSyncError("No Google Ads Account ID set for this client. Add it in the client profile.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      await base44.functions.invoke('syncGoogleAds', {
        client_id: selectedClientId,
        customer_id: selectedClient.google_ads_account_id,
        sync_months: syncMonths,
      });
      base44.entities.PPCData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setPpcData);
    } catch (err) {
      setSyncError(err?.response?.data?.error || "Sync failed. Check the Google Ads Account ID and credentials.");
    }
    setSyncing(false);
  };

  const chartData = [...ppcData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    spend: d.spend,
    conversions: d.conversions,
    roas: d.roas,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PPC Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitor ad performance across all platforms</p>
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
              <Button size="sm" variant="outline" onClick={handleGoogleAdsSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Google Ads"}
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Log Report
              </Button>
            </>
          )}
        </div>
        {syncError && <p className="text-xs text-red-500 mt-1 w-full">{syncError}</p>}
        {!selectedClient?.google_ads_account_id && canEdit && (
          <p className="text-xs text-amber-600 w-full">⚠ Add a Google Ads Account ID in the client profile to enable sync.</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Spend" value={latest?.spend ? `$${latest.spend.toLocaleString()}` : null} icon={DollarSign} color="bg-blue-500"
          sub={latest?.budget ? `Budget: $${latest.budget.toLocaleString()}` : null} />
        <MetricCard label="Conversions" value={latest?.conversions} icon={Target} color="bg-emerald-500"
          sub={latest?.cost_per_conversion ? `$${latest.cost_per_conversion} / conv.` : null} />
        <MetricCard label="Clicks" value={latest?.clicks?.toLocaleString()} icon={MousePointer} color="bg-violet-500"
          sub={latest?.ctr ? `${latest.ctr}% CTR` : null} />
        <MetricCard label="ROAS" value={latest?.roas ? `${latest.roas}x` : null} icon={TrendingUp} color="bg-amber-500"
          sub={latest?.cpc ? `$${latest.cpc} CPC` : null} />
      </div>

      {chartData.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Ad Spend Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${v}`} />
                <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Conversions Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {ppcData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Report History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Platform</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conv.</th>
                  <th className="px-4 py-3 text-right">ROAS</th>
                  <th className="px-4 py-3 text-right">CPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ppcData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{d.platform}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{d.spend ? `$${d.spend.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.clicks?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.conversions || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.roas ? `${d.roas}x` : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.cpc ? `$${d.cpc}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ppcData.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No PPC data yet. Log a report to get started.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Log PPC Report</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600">Platform</label>
                <select value={form.platform || "Google Ads"} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  {["Google Ads", "Meta Ads", "Microsoft Ads", "Other"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              {[
                { key: "report_date", label: "Report Date", type: "date" },
                { key: "budget", label: "Budget ($)", type: "number" },
                { key: "spend", label: "Spend ($)", type: "number" },
                { key: "impressions", label: "Impressions", type: "number" },
                { key: "clicks", label: "Clicks", type: "number" },
                { key: "ctr", label: "CTR (%)", type: "number" },
                { key: "cpc", label: "CPC ($)", type: "number" },
                { key: "conversions", label: "Conversions", type: "number" },
                { key: "cost_per_conversion", label: "Cost/Conv. ($)", type: "number" },
                { key: "roas", label: "ROAS (x)", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-600">{f.label}</label>
                  <input type={f.type} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
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