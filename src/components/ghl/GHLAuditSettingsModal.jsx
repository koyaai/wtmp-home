import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { DEFAULT_THRESHOLDS } from "@/utils/ghlAudit";

export default function GHLAuditSettingsModal({ client, open, onClose, onSaved }) {
  const [active, setActive] = useState(true);
  const [missed, setMissed] = useState("");
  const [unread, setUnread] = useState("");
  const [crPct, setCrPct] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setActive(client.ghl_audit_active !== false);
      setMissed(client.ghl_threshold_missed_calls != null ? String(client.ghl_threshold_missed_calls) : "");
      setUnread(client.ghl_threshold_unread_conversations != null ? String(client.ghl_threshold_unread_conversations) : "");
      setCrPct(client.ghl_threshold_cancelled_resched_pct != null ? String(client.ghl_threshold_cancelled_resched_pct) : "");
    }
  }, [client]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ghl_audit_active: active,
        ghl_threshold_missed_calls: missed === "" ? null : Number(missed),
        ghl_threshold_unread_conversations: unread === "" ? null : Number(unread),
        ghl_threshold_cancelled_resched_pct: crPct === "" ? null : Number(crPct),
      };
      await base44.entities.Client.update(client.id, payload);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Audit settings — {client?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <Label>Include in monthly audit</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <p className="text-xs text-slate-500">
          Leave a threshold blank to use the global default (shown in parentheses).
        </p>

        <div className="space-y-3 py-2">
          <div>
            <Label>Missed-call threshold ({DEFAULT_THRESHOLDS.missed_calls})</Label>
            <Input type="number" value={missed} onChange={(e) => setMissed(e.target.value)} placeholder={String(DEFAULT_THRESHOLDS.missed_calls)} />
          </div>
          <div>
            <Label>Unread conversations threshold ({DEFAULT_THRESHOLDS.unread_conversations})</Label>
            <Input type="number" value={unread} onChange={(e) => setUnread(e.target.value)} placeholder={String(DEFAULT_THRESHOLDS.unread_conversations)} />
          </div>
          <div>
            <Label>Cancelled/Rescheduled share % ({DEFAULT_THRESHOLDS.cancelled_resched_pct})</Label>
            <Input type="number" value={crPct} onChange={(e) => setCrPct(e.target.value)} placeholder={String(DEFAULT_THRESHOLDS.cancelled_resched_pct)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}