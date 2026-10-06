import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Send, Save } from "lucide-react";

const ENDPOINTS = [
  { key: "calendars", label: "Calendars list" },
  { key: "events", label: "Calendar events" },
  { key: "calls", label: "Calls (messages export)" },
  { key: "forms", label: "Forms" },
  { key: "conversations", label: "Conversations" },
  { key: "integrations", label: "Integrations" },
];

export default function MonitorSettings({ settings, onSave, onTest, sending }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings) {
      let list = [];
      try {
        list = JSON.parse(settings.missed_call_statuses || "[]");
      } catch {
        list = [];
      }
      setForm({ ...settings, missed_call_statuses_list: list.join(", ") });
    }
  }, [settings]);

  if (!form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const { missed_call_statuses_list, ...rest } = form;
    onSave({
      ...rest,
      missed_call_statuses: JSON.stringify(
        missed_call_statuses_list.split(",").map((s) => s.trim()).filter(Boolean)
      ),
    });
  };

  let diagCall = [];
  let diagAppt = [];
  try { diagCall = JSON.parse(settings.diagnostics_call_statuses || "[]"); } catch { diagCall = []; }
  try { diagAppt = JSON.parse(settings.diagnostics_appt_statuses || "[]"); } catch { diagAppt = []; }

  return (
    <div className="space-y-6">
      {/* Thresholds */}
      <section>
        <h3 className="font-semibold text-slate-700 text-sm mb-2">Alert Thresholds</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Missed calls</Label>
            <Input type="number" value={form.threshold_missed_calls ?? 0} onChange={(e) => set("threshold_missed_calls", Number(e.target.value))} />
          </div>
          <div>
            <Label>Unread conversations</Label>
            <Input type="number" value={form.threshold_unread_conversations ?? 0} onChange={(e) => set("threshold_unread_conversations", Number(e.target.value))} />
          </div>
          <div>
            <Label>Cancelled %</Label>
            <Input type="number" value={form.threshold_cancelled_pct ?? 0} onChange={(e) => set("threshold_cancelled_pct", Number(e.target.value))} />
          </div>
          <div>
            <Label>No-show %</Label>
            <Input type="number" value={form.threshold_noshow_pct ?? 0} onChange={(e) => set("threshold_noshow_pct", Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Missed-call statuses (comma-separated)</Label>
          <Input value={form.missed_call_statuses_list} onChange={(e) => set("missed_call_statuses_list", e.target.value)} placeholder="no-answer, busy, voicemail" />
        </div>
      </section>

      {/* Versioning */}
      <section>
        <h3 className="font-semibold text-slate-700 text-sm mb-2">Per-Endpoint Version Headers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENDPOINTS.map((ep) => (
            <div key={ep.key} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
              <div className="col-span-2 text-xs font-medium text-slate-500">{ep.label}</div>
              <div>
                <Label className="text-xs">Version</Label>
                <Input value={form[`version_${ep.key}`] ?? "v3"} onChange={(e) => set(`version_${ep.key}`, e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fallback</Label>
                <Input value={form[`fallback_${ep.key}`] ?? ""} onChange={(e) => set(`fallback_${ep.key}`, e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Slack + schedule */}
      <section>
        <h3 className="font-semibold text-slate-700 text-sm mb-2">Slack & Notification Schedule</h3>
        <div className="space-y-3">
          <div>
            <Label>Slack Incoming Webhook URL</Label>
            <Input type="password" value={form.slack_webhook_url ?? ""} onChange={(e) => set("slack_webhook_url", e.target.value)} placeholder="https://hooks.slack.com/services/..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Day of month</Label>
              <Input type="number" value={form.notify_day_of_month ?? 1} onChange={(e) => set("notify_day_of_month", Number(e.target.value))} />
            </div>
            <div>
              <Label>Time</Label>
              <Input value={form.notify_time ?? "08:00"} onChange={(e) => set("notify_time", e.target.value)} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={form.notify_timezone ?? "Asia/Manila"} onChange={(e) => set("notify_timezone", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!form.include_no_alerts} onCheckedChange={(v) => set("include_no_alerts", v)} />
            <Label className="text-sm">Include subaccounts with no alerts in the Slack message</Label>
          </div>
        </div>
      </section>

      {/* Last notification */}
      <section className="flex items-center gap-3 text-sm">
        <span className="text-slate-500">Last notification:</span>
        {settings.last_notification_status ? (
          <span className={settings.last_notification_status === "success" ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
            {settings.last_notification_status}
          </span>
        ) : (
          <span className="text-slate-400">never</span>
        )}
        {settings.last_notification_at && <span className="text-slate-400">{new Date(settings.last_notification_at).toLocaleString()}</span>}
      </section>

      {/* Diagnostics */}
      <section>
        <h3 className="font-semibold text-slate-700 text-sm mb-2">Diagnostics (statuses seen during syncs)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Call statuses</p>
            <div className="flex flex-wrap gap-1.5">
              {diagCall.map((d) => (
                <span key={d.status} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700" title={d.last_seen ? `last seen ${new Date(d.last_seen).toLocaleString()}` : ""}>
                  {d.status} · {d.count}
                </span>
              ))}
              {!diagCall.length && <span className="text-xs text-slate-400">None yet</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Appointment statuses</p>
            <div className="flex flex-wrap gap-1.5">
              {diagAppt.map((d) => (
                <span key={d.status} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700" title={d.last_seen ? `last seen ${new Date(d.last_seen).toLocaleString()}` : ""}>
                  {d.status} · {d.count}
                </span>
              ))}
              {!diagAppt.length && <span className="text-xs text-slate-400">None yet</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Save Settings</Button>
        <Button variant="outline" onClick={onTest} disabled={sending}><Send className="w-4 h-4 mr-1" /> {sending ? "Sending..." : "Send Test Notification"}</Button>
      </div>
    </div>
  );
}