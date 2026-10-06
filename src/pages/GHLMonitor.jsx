import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Activity, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import SubaccountsTable from "@/components/ghl/SubaccountsTable";
import OpenAlerts from "@/components/ghl/OpenAlerts";
import MonitorSettings from "@/components/ghl/MonitorSettings";

export default function GHLMonitor() {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [subaccounts, setSubaccounts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    const [subs, al, reps] = await Promise.all([
      base44.entities.Subaccount.list(),
      base44.entities.GHLAlert.filter({ resolved: false }, "-created_date", 500),
      base44.entities.MonthlyReport.list(),
    ]);
    setSubaccounts(subs);
    setAlerts(al);
    setReports(reps);
    let set = await base44.entities.GHLMonitorSettings.filter({ name: "default" }, "-created_date", 1);
    if (!set.length) {
      set = [
        await base44.entities.GHLMonitorSettings.create({
          name: "default",
          missed_call_statuses: '["no-answer","busy","voicemail"]',
          version_calendars: "v3", fallback_calendars: "2021-07-28",
          version_events: "v3", fallback_events: "2021-07-28",
          version_calls: "v3", fallback_calls: "2021-07-28",
          version_forms: "v3", fallback_forms: "2021-07-28",
          version_conversations: "v3", fallback_conversations: "2021-07-28",
          version_integrations: "v3", fallback_integrations: "2021-07-28",
          notify_day_of_month: 1, notify_time: "08:00", notify_timezone: "Asia/Manila",
          include_no_alerts: true, diagnostics_call_statuses: "[]", diagnostics_appt_statuses: "[]",
          threshold_missed_calls: 10, threshold_unread_conversations: 10,
          threshold_cancelled_pct: 30, threshold_noshow_pct: 30, slack_webhook_url: "",
          updated_at: new Date().toISOString(),
        }),
      ];
    }
    setSettings(set[0]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const runNow = async (subaccountId) => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("ghlSubaccountMonitor", {
        mode: "run_now",
        ...(subaccountId ? { subaccount_id: subaccountId } : {}),
      });
      toast({
        title: "Run complete",
        description: `Synced ${res.data?.sync?.results?.length || 0} subaccount(s); ${res.data?.report?.alerts || 0} alert(s).`,
      });
      await loadData();
    } catch (e) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const resolveAlert = async (id) => {
    setResolvingId(id);
    try {
      await base44.entities.GHLAlert.update(id, { resolved: true, resolved_at: new Date().toISOString() });
      setAlerts((a) => a.filter((x) => x.id !== id));
    } finally {
      setResolvingId(null);
    }
  };

  const saveSettings = async (data) => {
    await base44.entities.GHLMonitorSettings.update(settings.id, { ...data, updated_at: new Date().toISOString() });
    await loadData();
    toast({ title: "Settings saved" });
  };

  const sendTest = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("ghlSubaccountMonitor", { mode: "test_notification" });
      toast({
        title: res.data?.slack?.sent ? "Test sent" : "Test failed",
        description: res.data?.slack?.error || "Check Slack",
        variant: res.data?.slack?.sent ? "default" : "destructive",
      });
      await loadData();
    } catch (e) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const importFromClients = async () => {
    setImporting(true);
    try {
      const clients = await base44.entities.Client.list();
      const eligible = clients.filter((c) => c.ghl_location_id && c.ghl_api_key);
      const existing = new Set(subaccounts.map((s) => s.ghl_location_id));
      const toCreate = eligible
        .filter((c) => !existing.has(c.ghl_location_id))
        .map((c) => ({ name: c.name, ghl_location_id: c.ghl_location_id, ghl_api_key: c.ghl_api_key, active: true }));
      if (toCreate.length) await base44.entities.Subaccount.bulkCreate(toCreate);
      toast({ title: "Import complete", description: `${toCreate.length} subaccount(s) added from clients.` });
      await loadData();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading GHL Monitor…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">GHL Subaccount Monitor</h1>
          <p className="text-sm text-slate-500">Daily call & appointment syncs, monthly health reports, and Slack alerts.</p>
        </div>
        <Button onClick={() => runNow()} disabled={running}>
          <RefreshCw className={`w-4 h-4 mr-1 ${running ? "animate-spin" : ""}`} /> Run Now
        </Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="w-4 h-4 mr-1" /> Alerts</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="w-4 h-4 mr-1" /> Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card className="p-4">
            <SubaccountsTable subaccounts={subaccounts} alerts={alerts} reports={reports} onRun={runNow} running={running} onChanged={loadData} onImportFromClients={importFromClients} importing={importing} />
          </Card>
        </TabsContent>
        <TabsContent value="alerts">
          <Card className="p-4">
            <OpenAlerts alerts={alerts} onResolve={resolveAlert} resolvingId={resolvingId} />
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <Card className="p-4">{settings && <MonitorSettings settings={settings} onSave={saveSettings} onTest={sendTest} sending={sending} />}</Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}