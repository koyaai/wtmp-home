import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, HeartPulse, Table2, LineChart as LineIcon, Bell } from "lucide-react";
import SubaccountHealthTable from "@/components/ghl/SubaccountHealthTable";
import SubaccountTrendView from "@/components/ghl/SubaccountTrendView";
import GHLAlertsList from "@/components/ghl/GHLAlertsList";
import GHLAuditSettingsModal from "@/components/ghl/GHLAuditSettingsModal";
import { monthLabel } from "@/utils/ghlAudit";

const TABS = [
  { key: "health", label: "Health Table", icon: Table2 },
  { key: "trends", label: "Trends", icon: LineIcon },
  { key: "alerts", label: "Alerts", icon: Bell },
];

function priorMonthKey() {
  const now = new Date();
  const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
}

export default function GHLSubaccountMonitor() {
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("health");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [trendClient, setTrendClient] = useState(null);
  const [settingsClient, setSettingsClient] = useState(null);
  const [running, setRunning] = useState(null);
  const [resolving, setResolving] = useState(null);

  const ghlClients = useMemo(
    () => clients.filter((c) => c.ghl_location_id && c.ghl_api_key),
    [clients],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, a] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.GHLMonthlyReport.list("-month_key", 500),
        base44.entities.GHLAlert.filter({ resolved: false }, "-created_date", 500),
      ]);
      setClients(c);
      setReports(r);
      setAlerts(a);
      setSelectedMonth((prev) => prev || (r[0]?.month_key ?? priorMonthKey()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableMonths = useMemo(() => {
    const set = new Set(reports.map((r) => r.month_key));
    set.add(priorMonthKey());
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const runAudit = async (clientId) => {
    setRunning(clientId || "all");
    try {
      const [y, m] = (selectedMonth || priorMonthKey()).split("-");
      await base44.functions.invoke("ghlSubaccountAudit", {
        client_id: clientId || undefined,
        year: Number(y),
        month: Number(m) - 1,
      });
      await load();
    } finally {
      setRunning(null);
    }
  };

  const resolveAlert = async (id) => {
    setResolving(id);
    try {
      await base44.entities.GHLAlert.update(id, { resolved: true, resolved_at: new Date().toISOString() });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setResolving(null);
    }
  };

  const openAlertCount = alerts.length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">GHL Subaccount Monitor</h1>
            <p className="text-sm text-slate-500">Monthly health audit across all GoHighLevel subaccounts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white"
          >
            {availableMonths.map((mk) => (
              <option key={mk} value={mk}>
                {monthLabel(mk)}
              </option>
            ))}
          </select>
          <Button onClick={() => runAudit(null)} disabled={!!running}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${running === "all" ? "animate-spin" : ""}`} />
            Run All
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === "alerts" && openAlertCount > 0 && (
              <span className="ml-1 text-xs bg-rose-100 text-rose-600 rounded-full px-2 py-0.5 font-semibold">
                {openAlertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === "health" && (
            <SubaccountHealthTable
              clients={ghlClients}
              reports={reports}
              selectedMonth={selectedMonth}
              onRunOne={runAudit}
              onShowTrends={(id) => {
                setTrendClient(ghlClients.find((c) => c.id === id) || null);
                setTab("trends");
              }}
              onEditSettings={setSettingsClient}
              running={running}
            />
          )}

          {tab === "trends" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Subaccount:</span>
                <select
                  value={trendClient?.id || ""}
                  onChange={(e) => setTrendClient(ghlClients.find((c) => c.id === e.target.value) || null)}
                  className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white min-w-[220px]"
                >
                  <option value="">Select…</option>
                  {[...ghlClients]
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <SubaccountTrendView client={trendClient} reports={reports} />
            </div>
          )}

          {tab === "alerts" && (
            <GHLAlertsList alerts={alerts} clients={ghlClients} onResolve={resolveAlert} resolving={resolving} />
          )}
        </>
      )}

      <GHLAuditSettingsModal
        client={settingsClient}
        open={!!settingsClient}
        onClose={() => setSettingsClient(null)}
        onSaved={load}
      />
    </div>
  );
}