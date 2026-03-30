import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Save, Trash2, ToggleLeft, ToggleRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const RANGE_OPTIONS = [
  { value: 1, label: "Past 1 Month" },
  { value: 3, label: "Past 3 Months" },
  { value: 6, label: "Past 6 Months" },
  { value: 12, label: "Past 12 Months" },
];

export default function SyncScheduleModal({ client, onClose }) {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    frequency: "weekly",
    data_range_months: 3,
    sync_gsc: true,
    sync_ga4: true,
    active: true,
  });

  useEffect(() => {
    loadSetting();
  }, [client.id]);

  const loadSetting = async () => {
    setLoading(true);
    const results = await base44.entities.SyncSettings.filter({ client_id: client.id });
    if (results[0]) {
      setSetting(results[0]);
      setForm({
        frequency: results[0].frequency || "weekly",
        data_range_months: results[0].data_range_months || 3,
        sync_gsc: results[0].sync_gsc !== false,
        sync_ga4: results[0].sync_ga4 !== false,
        active: results[0].active !== false,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      client_id: client.id,
      client_name: client.name,
      ...form,
    };
    if (setting) {
      await base44.entities.SyncSettings.update(setting.id, payload);
    } else {
      const created = await base44.entities.SyncSettings.create(payload);
      setSetting(created);
    }
    toast.success("Sync schedule saved!");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!setting) return;
    if (!confirm("Remove auto-sync schedule for this client?")) return;
    await base44.entities.SyncSettings.delete(setting.id);
    toast.success("Schedule removed.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Auto-Sync Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-700">Auto-sync enabled</p>
                <p className="text-xs text-slate-400">Automatically sync on schedule</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                {form.active
                  ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                  : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Sync Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.frequency === opt.value
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data range */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Data Range Per Sync</label>
              <div className="grid grid-cols-2 gap-2">
                {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, data_range_months: opt.value }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.data_range_months === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* What to sync */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Data Sources</label>
              <div className="space-y-2">
                {[
                  { key: "sync_gsc", label: "Google Search Console", disabled: !client.google_search_console_url, hint: client.google_search_console_url ? null : "No GSC URL set on client" },
                  { key: "sync_ga4", label: "Google Analytics 4", disabled: !client.ga_property_id, hint: client.ga_property_id ? null : "No GA4 Property ID set on client" },
                ].map(({ key, label, disabled, hint }) => (
                  <div key={key} className={`flex items-center justify-between p-3 rounded-xl border ${disabled ? "opacity-50 bg-slate-50 border-slate-100" : "bg-white border-slate-200"}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{label}</p>
                      {hint && <p className="text-xs text-amber-600">{hint}</p>}
                    </div>
                    <button
                      disabled={disabled}
                      onClick={() => !disabled && setForm(f => ({ ...f, [key]: !f[key] }))}
                    >
                      {form[key] && !disabled
                        ? <ToggleRight className="w-7 h-7 text-blue-500" />
                        : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Last synced */}
            {setting?.last_synced_at && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Last synced: {new Date(setting.last_synced_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-6 pb-6">
          {setting ? (
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Remove Schedule
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-800 hover:bg-slate-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}