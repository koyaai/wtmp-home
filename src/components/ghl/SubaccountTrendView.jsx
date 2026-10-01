import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

function MiniBar({ title, data, dataKey, color }) {
  const hasData = data.some(d => d[dataKey] != null && d[dataKey] > 0);
  if (!hasData) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex items-center justify-center">
        <p className="text-xs text-slate-400">No {title} data</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SubaccountTrendView({ client, reports }) {
  if (!client) {
    return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-sm text-slate-400">Select a subaccount to view its 6-month trend.</div>;
  }
  // Sort ascending by month_key, take last 6
  const sorted = [...reports].sort((a, b) => a.month_key.localeCompare(b.month_key)).slice(-6);
  const data = sorted.map(r => ({
    label: r.month?.slice(0, 3) || r.month_key.slice(5),
    forms: r.form_submissions,
    appts: r.cal_total,
    unread: r.unread_conversations,
    missed: r.calls_missed,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-sm text-slate-700">{client.name} — 6-Month Trend</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        <MiniBar title="Form Submissions" data={data} dataKey="forms" color="#6366f1" />
        <MiniBar title="Appointments (total)" data={data} dataKey="appts" color="#0ea5e9" />
        <MiniBar title="Unread Conversations" data={data} dataKey="unread" color="#f59e0b" />
        <MiniBar title="Missed Calls" data={data} dataKey="missed" color="#ef4444" />
      </div>
    </div>
  );
}