import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, RefreshCw } from "lucide-react";

export default function SubaccountsTable({ subaccounts, alerts, reports, onRun, running, onChanged }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", ghl_location_id: "", ghl_api_key: "", active: true });
  const [saving, setSaving] = useState(false);

  const alertsBySub = {};
  for (const a of alerts) (alertsBySub[a.subaccount_id] = alertsBySub[a.subaccount_id] || []).push(a);
  const reportsBySub = {};
  for (const r of reports) if (!reportsBySub[r.subaccount_id]) reportsBySub[r.subaccount_id] = r;

  const health = (sub) => {
    const sa = alertsBySub[sub.id] || [];
    if (sa.some((a) => a.severity === "critical")) return { label: "Red", color: "bg-rose-500" };
    if (sa.some((a) => a.severity === "warning")) return { label: "Yellow", color: "bg-amber-400" };
    return { label: "Green", color: "bg-emerald-500" };
  };

  const add = async () => {
    setSaving(true);
    try {
      await base44.entities.Subaccount.create(form);
      setForm({ name: "", ghl_location_id: "", ghl_api_key: "", active: true });
      setOpen(false);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (sub) => {
    await base44.entities.Subaccount.update(sub.id, { active: !sub.active });
    onChanged?.();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 text-sm">Subaccounts ({subaccounts.length})</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Subaccount
        </Button>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Health</th>
              <th className="text-left px-3 py-2">Sync</th>
              <th className="text-right px-3 py-2">Missed calls</th>
              <th className="text-right px-3 py-2">Appts</th>
              <th className="text-left px-3 py-2">Last synced</th>
              <th className="text-left px-3 py-2">Active</th>
              <th className="text-right px-3 py-2">Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subaccounts.map((sub) => {
              const h = health(sub);
              const rep = reportsBySub[sub.id];
              return (
                <tr key={sub.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">{sub.name}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${h.color}`} />
                      {h.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {sub.last_sync_status === "failed" ? <span className="text-rose-600">Failed</span> : sub.last_sync_status === "success" ? <span className="text-emerald-600">OK</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{rep?.calls_missed ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{rep?.total_appointments ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{sub.last_synced_at ? new Date(sub.last_synced_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2"><Switch checked={!!sub.active} onCheckedChange={() => toggleActive(sub)} /></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" disabled={running} onClick={() => onRun(sub.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!subaccounts.length && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400 text-sm">No subaccounts yet. Add one to begin syncing.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add GHL Subaccount</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>GHL Location ID</Label>
              <Input value={form.ghl_location_id} onChange={(e) => setForm({ ...form, ghl_location_id: e.target.value })} />
            </div>
            <div>
              <Label>GHL API Key (Private Integration)</Label>
              <Input type="password" value={form.ghl_api_key} onChange={(e) => setForm({ ...form, ghl_api_key: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving || !form.name || !form.ghl_location_id || !form.ghl_api_key} onClick={add}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}