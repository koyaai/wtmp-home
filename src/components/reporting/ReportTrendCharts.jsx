import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

const CHARTS = [
  { title: "GA4 Sessions", dataKey: "sessions", color: "#8b5cf6" },
  { title: "Organic Clicks (GSC)", dataKey: "organicClicks", color: "#10b981" },
  { title: "Leads (GHL)", dataKey: "leads", color: "#14b8a6" },
];

export default function ReportTrendCharts({ data }) {
  if (!data || data.length === 0) return null;
  const hasAny = data.some(d => d.sessions > 0 || d.organicClicks > 0 || d.leads > 0);
  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-sm text-slate-700">6-Month Trend</h3>
        <span className="text-xs text-slate-400 ml-auto">{data[0].label} – {data[data.length - 1].label}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
        {CHARTS.map(c => {
          const hasData = data.some(d => d[c.dataKey] > 0);
          if (!hasData) {
            return (
              <div key={c.dataKey} className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex items-center justify-center">
                <p className="text-xs text-slate-400">No {c.title} data</p>
              </div>
            );
          }
          return (
            <div key={c.dataKey} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">{c.title}</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "4px 8px" }} />
                  <Line type="monotone" dataKey={c.dataKey} stroke={c.color} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}