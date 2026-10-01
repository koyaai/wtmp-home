import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Loader2, Play, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import MonitorSettings from "@/components/ghl/MonitorSettings";
import SubaccountHealthTable from "@/components/ghl/SubaccountHealthTable";
import SubaccountTrendView from "@/components/ghl/SubaccountTrendView";
import GHLAlertsList from "@/components/ghl/GHLAlertsList";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function prevMonthKey() {
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    opts.push(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return opts;
}

export default function GHLSubaccountMonitor() {
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [monthKey, setMonthKey] = useState(prevMonthKey());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [trendClient, setTrendClient] = useState(null);
  const [trendReports, setTrendReports] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const loadClients = useCallback(async () => {
    const all = await base44.entities.Client.list("-name", 500);
    setClients(all.filter(c => c.ghl_location_id && c.ghl_api_key));
  }, []);

  const loadReports = useCallback(async (mk) => {
    const recs = await base44.entities.GHLMonthlyReport.filter({ month_key: mk }, "-client_name", 500);
    setReports(recs);
  }, []);

  const loadAlerts = useCallback(async () => {
    const recs = await base44.entities.GHLAlert.filter({ resolved: false }, "-created_date", 500);
    setAlerts(recs);
  }, []);

  const loadSettings = useCallback(async () => {
    const recs = await base44.entities.GHLMonitorSettings.filter({}, "created_date", 1);
    setSettings(recs[0] || null);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadClients(), loadReports(monthKey), loadAlerts(), loadSettings()]);
      } finally { setLoading(false); }
    })();
  }, []);

  const reportsByClient = {};
  for (const r of reports) reportsByClient[r.client_id] = r;

  const runAudit = async (clientId) => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await base44.functions.invoke("ghlSubaccountAudit", { month_key: monthKey, ...(clientId ? { client_id: clientId } : {}) });
      setRunResult(res.data);
      await Promise.all([loadClients(), loadReports(monthKey), loadAlerts()]);
      if (trendClient) {
        const tr = await base44.entities.GHLMonthlyReport.filter({ client_id: trendClient.id }, "-month_key", 50);
        setTrendReports(tr);
      }
    } catch (e) {
      setRunResult({ error: e.message });
    } finally { setRunning(false); }
  };

  const runOne = async (c) => {
    setRunningId(c.id);
    try {
      await base44.functions.invoke("ghlSubaccountAudit", { month_key: monthKey, client_id: c.id });
      await Promise.all([loadReports(monthKey), loadAlerts()]);
      if (trendClient?.id === c.id) {
        const tr = await base44.entities.GHLMonthlyReport.filter({ client_id: c.id }, "-month_key", 50);
        setTrendReports(tr);
      }
    } finally { setRunningId(null); }
  };

  const toggleActive = async (c) => {
    setTogglingId(c.id);
    try {
      await base44.entities.Client.update(c.id, { ghl_monitor_active: !c.ghl_monitor_active });
      await loadClients();
    } finally { setTogglingId(null); }
  };

  const selectTrend = async (c) => {
    setTrendClient(c);
    const tr = await base44.entities.GHLMonthlyReport.filter({ client_id: c.id }, "-month_key", 50);
    setTrendReports(tr);
  };

  const resolveAlert = async (a) => {
    setResolvingId(a.id);
    try {
      await base44.entities.GHLAlert.update(a.id, { resolved: true, resolved_at: new Date().toISOString() });
      await loadAlerts();
    } finally { setResolvingId(null); }
  };

  const onMonthChange = async (mk) => {
    setMonthKey(mk);
    await loadReports(mk);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">GHL Subaccount Monitor</h1>
          <p className="text-sm text-slate-500">Monthly health audit of GoHighLevel subaccounts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={monthKey} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {buildMonthOptions().map(mk => <SelectItem key={mk} value={mk}>{monthLabel(mk)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => runAudit()} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Now
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(s => !s)}>
            <SettingsIcon className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {runResult && (
        <div className={`rounded-xl border p-3 text-sm ${runResult.error ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          {runResult.error ? `Error: ${runResult.error}` : `Audit complete — ${runResult.processed} subaccount(s) processed, ${runResult.alerts} alert(s) generated for ${monthLabel(runResult.month_key)}.`}
        </div>
      )}

      {showSettings && <MonitorSettings settings={settings} onSaved={(s) => { setSettings(s); setShowSettings(false); }} />}

      {/* Open Alerts */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-slate-700 text-sm">Open Alerts ({alerts.length})</h2>
        </div>
        <GHLAlertsList alerts={alerts} onResolve={resolveAlert} resolvingId={resolvingId} />
      </div>

      {/* Health Table */}
      <div>
        <h2 className="font-semibold text-slate-700 text-sm mb-2">Subaccount Health — {monthLabel(monthKey)}</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <SubaccountHealthTable
            clients={clients}
            reportsByClient={reportsByClient}
            settings={settings}
            onToggleActive={toggleActive}
            togglingId={togglingId}
            onRunOne={runOne}
            runningId={runningId}
          />
        )}
      </div>

      {/* Trend View */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h2 className="font-semibold text-slate-700 text-sm">Month-over-Month Trend</h2>
          <Select value={trendClient?.id || ""} onValueChange={(id) => selectTrend(clients.find(c => c.id === id))}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select a subaccount" /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SubaccountTrendView client={trendClient} reports={trendReports} />
      </div>

      {/* Manual check items note */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Manual monthly check items (not available via API):</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong>Workflow errors</strong> — GHL exposes no execution-history/error endpoint at any API version. Review in Execution Logs UI.</li>
          <li><strong>Email & SMS deliverability</strong> — no public endpoint for delivered/bounced/opens/clicks. Review in GHL UI. Only meaningful for Mailgun/LC Email subaccounts (SMTP subaccounts never get delivered/bounced data).</li>
        </ul>
      </div>
    </div>
  );
}