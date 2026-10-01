import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";

const ENDPOINT_GROUPS = [
  { key: "calendars", label: "Calendars / Events" },
  { key: "forms", label: "Forms" },
  { key: "conversations", label: "Conversations" },
  { key: "calls", label: "Calls" },
  { key: "integrations", label: "Integrations" },
];

export default function MonitorSettings({ settings, onSaved }) {
  const [form, setForm] = useState(settings || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings || {}); }, [settings]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: "default",
        threshold_missed_calls: Number(form.threshold_missed_calls) || 10,
        threshold_unread_conversations: Number(form.threshold_unread_conversations) || 10,
        threshold_cancelled_resched_pct: Number(form.threshold_cancelled_resched_pct) || 30,
        ...Object.fromEntries(ENDPOINT_GROUPS.flatMap(g => [
          [`version_${g.key}`, form[`version_${g.key}`] || "v3"],
          [`fallback_${g.key}`, form[`fallback_${g.key}`] || "2021-07-28"],
        ])),
        updated_at: new Date().toISOString(),
      };
      const saved = settings?.id
        ? await base44.entities.GHLMonitorSettings.update(settings.id, payload)
        : await base44.entities.GHLMonitorSettings.create(payload);
      onSaved(saved);
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-slate-800 text-sm">Alert Thresholds</h3>
        <p className="text-xs text-slate-500 mt-0.5">Metrics crossing these values trigger alerts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div>
            <Label className="text-xs">Missed Calls (count)</Label>
            <Input type="number" value={form.threshold_missed_calls ?? 10} onChange={e => set("threshold_missed_calls", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Unread Conversations (count)</Label>
            <Input type="number" value={form.threshold_unread_conversations ?? 10} onChange={e => set("threshold_unread_conversations", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Cancelled+Rescheduled (%)</Label>
            <Input type="number" value={form.threshold_cancelled_resched_pct ?? 30} onChange={e => set("threshold_cancelled_resched_pct", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 text-sm">GHL API Versioning</h3>
        <p className="text-xs text-slate-500 mt-0.5">Default <code className="bg-slate-100 px-1 rounded">v3</code> per endpoint; falls back to the date-based version on 404/400.</p>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-500 px-1">
            <div>Endpoint Group</div><div>Version Header</div><div>Fallback Version</div>
          </div>
          {ENDPOINT_GROUPS.map(g => (
            <div key={g.key} className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-slate-700">{g.label}</Label>
              <Input value={form[`version_${g.key}`] ?? "v3"} onChange={e => set(`version_${g.key}`, e.target.value)} className="h-8 text-xs" />
              <Input value={form[`fallback_${g.key}`] ?? "2021-07-28"} onChange={e => set(`fallback_${g.key}`, e.target.value)} className="h-8 text-xs" />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </Button>
    </div>
  );
}