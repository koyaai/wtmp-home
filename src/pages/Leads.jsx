import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, TrendingUp, Users, Calendar, DollarSign, X, Pencil } from "lucide-react";
import GHLLeads from "@/components/clients/GHLLeads";
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

export default function Leads() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [leadData, setLeadData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({});
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    base44.entities.Client.list().then(all => {
      const ghlClients = all.filter(c => c.ghl_location_id);
      const eligible = ghlClients.length > 0 ? ghlClients : all;
      setClients(eligible);
      if (eligible.length > 0) setSelectedClientId(eligible[0].id);
    });
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);





  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.LeadData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setLeadData);
  }, [selectedClientId]);

  const latest = leadData[0];
  const canEdit = ["leadership", "team_lead", "csm"].includes(user?.role);

  const openNew = () => { setEditingRecord(null); setForm({}); setShowForm(true); };
  const openEdit = (record) => { setEditingRecord(record); setForm({ ...record }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingRecord(null); setForm({}); };

  const handleSave = async () => {
    const parsed = { ...form, client_id: selectedClientId };
    ["total_leads", "new_leads", "qualified_leads", "appointments_booked", "appointments_showed", "closed_deals", "revenue_generated"].forEach(k => {
      if (parsed[k] !== undefined && parsed[k] !== "") parsed[k] = parseFloat(parsed[k]);
    });
    if (editingRecord) {
      await base44.entities.LeadData.update(editingRecord.id, parsed);
    } else {
      await base44.entities.LeadData.create(parsed);
    }
    closeForm();
    base44.entities.LeadData.filter({ client_id: selectedClientId }, "-report_date", 12).then(setLeadData);
  };

  const closeRate = latest?.appointments_showed && latest?.closed_deals
    ? `${Math.round((latest.closed_deals / latest.appointments_showed) * 100)}%`
    : null;

  const chartData = [...leadData].reverse().map(d => ({
    date: new Date(d.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    leads: d.total_leads,
    closed: d.closed_deals,
    revenue: d.revenue_generated,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lead Tracker</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitor leads & conversion performance per client</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Log Manual
            </Button>
          )}
        </div>
      </div>

      {/* GHL Monthly Data */}
      {selectedClient?.ghl_location_id && (
        <GHLLeads client={selectedClient} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={latest?.total_leads} icon={Users} color="bg-blue-500"
          sub={latest?.new_leads ? `${latest.new_leads} new` : null} />
        <MetricCard label="Appt. Booked" value={latest?.appointments_booked} icon={Calendar} color="bg-violet-500"
          sub={latest?.appointments_showed ? `${latest.appointments_showed} showed` : null} />
        <MetricCard label="Closed Deals" value={latest?.closed_deals} icon={TrendingUp} color="bg-emerald-500"
          sub={closeRate ? `Close rate: ${closeRate}` : null} />
        <MetricCard label="Revenue" value={latest?.revenue_generated ? `$${latest.revenue_generated.toLocaleString()}` : null}
          icon={DollarSign} color="bg-amber-500" />
      </div>

      {/* Lead Tags */}
      {latest?.lead_tags && (() => {
        try {
          const tags = JSON.parse(latest.lead_tags);
          const entries = Object.entries(tags);
          if (entries.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-3">Lead Tags (From GHL Sync)</h2>
              <div className="flex flex-wrap gap-2">
                {entries.sort((a,b) => b[1] - a[1]).map(([tag, count]) => (
                  <span key={tag} className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
                    {tag} ({count})
                  </span>
                ))}
              </div>
            </div>
          );
        } catch { return null; }
      })()}

      {/* Funnel */}
      {latest && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4">Lead Funnel</h2>
          <div className="flex items-end gap-2">
            {[
              { label: "Total Leads", value: latest.total_leads, color: "bg-blue-500" },
              { label: "Qualified", value: latest.qualified_leads, color: "bg-violet-500" },
              { label: "Appt. Booked", value: latest.appointments_booked, color: "bg-amber-500" },
              { label: "Showed", value: latest.appointments_showed, color: "bg-orange-500" },
              { label: "Closed", value: latest.closed_deals, color: "bg-emerald-500" },
            ].map((step, i, arr) => {
              const max = arr[0].value || 1;
              const height = Math.max(((step.value || 0) / max) * 120, 8);
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{step.value || 0}</span>
                  <div className={`w-full rounded-t-lg ${step.color}`} style={{ height: `${height}px` }} />
                  <span className="text-xs text-slate-500 text-center leading-tight">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Leads Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="font-semibold text-slate-800 mb-4">Revenue Generated</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${v?.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Records Table */}
      {leadData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Monthly Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Month</th>
                  <th className="text-right px-4 py-2.5">Leads</th>
                  <th className="text-right px-4 py-2.5">Appts Booked</th>
                  <th className="text-right px-4 py-2.5">Showed</th>
                  <th className="text-right px-4 py-2.5">Closed</th>
                  <th className="text-right px-4 py-2.5">Revenue</th>
                  {canEdit && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leadData.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {new Date(r.report_date + 'T12:00:00').toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.total_leads ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.appointments_booked ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.appointments_showed ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.closed_deals ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.revenue_generated ? `$${r.revenue_generated.toLocaleString()}` : "—"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leadData.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No lead data yet. Log a report to get started.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingRecord ? "Edit Lead Record" : "Log Lead Report"}</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { key: "report_date", label: "Report Date", type: "date" },
                { key: "total_leads", label: "Total Leads", type: "number" },
                { key: "new_leads", label: "New Leads", type: "number" },
                { key: "qualified_leads", label: "Qualified Leads", type: "number" },
                { key: "appointments_booked", label: "Appts. Booked", type: "number" },
                { key: "appointments_showed", label: "Appts. Showed", type: "number" },
                { key: "closed_deals", label: "Closed Deals", type: "number" },
                { key: "revenue_generated", label: "Revenue Generated ($)", type: "number" },
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
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
                {editingRecord ? "Update Record" : "Save Report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}