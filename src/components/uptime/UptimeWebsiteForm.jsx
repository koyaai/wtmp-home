import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ClientSelect from "@/components/clients/ClientSelect";
import { base44 } from "@/api/base44Client";

export default function UptimeWebsiteForm({ open, onClose, onSaved, website, clients }) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    expected_status_code: 200,
    is_active: true,
    notes: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      website
        ? {
            name: website.name || "",
            url: website.url || "",
            expected_status_code: website.expected_status_code ?? 200,
            is_active: website.is_active !== false,
            notes: website.notes || "",
            client_id: website.client_id || "",
          }
        : { name: "", url: "", expected_status_code: 200, is_active: true, notes: "", client_id: "" }
    );
  }, [open, website]);

  const save = async () => {
    if (!form.name || !form.url || !form.client_id) return;
    setSaving(true);
    const client = clients.find((c) => c.id === form.client_id);
    const code =
      form.expected_status_code === "" || form.expected_status_code == null
        ? null
        : Number(form.expected_status_code);
    const payload = {
      name: form.name,
      url: form.url,
      expected_status_code: code,
      is_active: form.is_active,
      notes: form.notes,
      client_id: form.client_id,
      client_name: client?.name || "",
    };
    try {
      if (website) await base44.entities.Website.update(website.id, payload);
      else await base44.entities.Website.create(payload);
      onSaved();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{website ? "Edit Website" : "Add Website"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-500">Client</Label>
            <div className="mt-1">
              <ClientSelect
                clients={clients}
                value={form.client_id}
                onChange={(id) => setForm((f) => ({ ...f, client_id: id }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500">Site Name</Label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Main Website"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500">URL</Label>
            <Input
              className="mt-1"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500">
              Expected Status Code (blank = any 2xx)
            </Label>
            <Input
              type="number"
              className="mt-1"
              value={form.expected_status_code ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, expected_status_code: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500">Notes</Label>
            <textarea
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
            <Label className="text-sm text-slate-600">Active (monitored)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !form.name || !form.url || !form.client_id}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}