import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { cancelledReschedPct, monthLabel } from "@/utils/ghlAudit";

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">{title}</h4>
      <div className="h-56">{children}</div>
    </div>
  );
}

export default function SubaccountTrendView({ client, reports }) {
  const data = useMemo(() => {
    return reports
      .filter((r) => r.client_id === client?.id)
      .sort((a, b) => (a.month_key || "").localeCompare(b.month_key || ""))
      .map((r) => ({
        month: (r.month_key || "").slice(5),
        label: monthLabel(r.month_key),
        missed: r.calls_missed ?? null,
        unread: r.unread_conversations ?? null,
        forms: r.form_submissions ?? null,
        new: r.cal_new || 0,
        confirmed: r.cal_confirmed || 0,
        cancelled: r.cal_cancelled || 0,
        rescheduled: r.cal_rescheduled || 0,
        cr_pct: cancelledReschedPct(r),
      }));
  }, [client, reports]);

  if (!client) {
    return <div className="text-slate-400 text-sm p-8 text-center">Select a subaccount to view trends.</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-slate-400 text-sm p-8 text-center">
        No monthly snapshots yet for {client.name}. Run an audit to start collecting trend data.
      </div>
    );
  }

  const tooltipStyle = { fontSize: 12, borderRadius: 8 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Missed Calls (missed-call tag)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="missed" stroke="#e11d48" strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Unread Conversations">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="unread" stroke="#f59e0b" strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Form Submissions">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="forms" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Calendar Events by Status">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="new" stackId="a" fill="#10b981" />
            <Bar dataKey="confirmed" stackId="a" fill="#3b82f6" />
            <Bar dataKey="cancelled" stackId="a" fill="#f43f5e" />
            <Bar dataKey="rescheduled" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cancelled + Rescheduled Share (%)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="cr_pct" stroke="#8b5cf6" strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}