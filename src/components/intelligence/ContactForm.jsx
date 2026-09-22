import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { QUESTIONNAIRE_SECTIONS, emptyQuestionnaire, buildSheetPrompt, AI_SHEET_SCHEMA } from "@/utils/contactQuestionnaire";

export default function ContactForm({ open, onClose, client, contact, onSaved }) {
  const isEdit = !!contact;
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [questionnaire, setQuestionnaire] = useState(emptyQuestionnaire());
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({ client_snapshot: true });

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setFullName(contact.full_name || "");
      setPreferredName(contact.preferred_name || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setQuestionnaire(contact.questionnaire || emptyQuestionnaire());
      setSelectedClientId(contact.client_id || "");
    } else {
      setFullName(""); setPreferredName(""); setEmail(""); setPhone("");
      setQuestionnaire(emptyQuestionnaire());
      setSelectedClientId(client?.id || "");
    }
    setOpenSections({ client_snapshot: true });
  }, [open, isEdit, contact, client]);

  useEffect(() => {
    if (open && !isEdit && !client) {
      base44.entities.Client.list().then((list) => {
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setClients(sorted);
        if (!selectedClientId && sorted[0]) setSelectedClientId(sorted[0].id);
      }).catch(() => {});
    }
  }, [open, isEdit, client]);

  const setField = (section, key, value) => {
    setQuestionnaire((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };
  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    if (!fullName.trim()) { alert("Please enter the contact's name."); return; }
    if (!isEdit && !client && !selectedClientId) { alert("Please select a client."); return; }
    setSaving(true);
    try {
      const clientId = client?.id || selectedClientId;
      const clientName = client?.name || clients.find((c) => c.id === selectedClientId)?.name || "";
      let aiSheet = contact?.ai_sheet || null;
      if (!isEdit) {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: buildSheetPrompt({ full_name: fullName, preferred_name: preferredName }, questionnaire),
          response_json_schema: AI_SHEET_SCHEMA,
        });
        aiSheet = res && (res.three_words || res.personality_summary) ? res : (res?.output || res) || null;
      }
      let saved;
      if (isEdit) {
        saved = await base44.entities.ClientContact.update(contact.id, {
          full_name: fullName, preferred_name: preferredName, email, phone, questionnaire,
        });
      } else {
        saved = await base44.entities.ClientContact.create({
          client_id: clientId, client_name: clientName,
          full_name: fullName, preferred_name: preferredName, email, phone,
          questionnaire, ai_sheet: aiSheet, timeline_notes: [],
        });
      }
      if (onSaved) onSaved(saved, isEdit);
      onClose();
    } catch (e) {
      alert("Could not save contact: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const needClientSelect = !isEdit && !client;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact Questionnaire" : "Add Client Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Full Name *</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Preferred Name</label>
              <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5" />
            </div>
          </div>
          {needClientSelect && (
            <div>
              <label className="text-xs font-semibold text-slate-500">Client *</label>
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5 bg-white">
                <option value="">Select a client…</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          )}
          {QUESTIONNAIRE_SECTIONS.map((s) => (
            <div key={s.key} className="border border-slate-200 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection(s.key)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100">
                <span className="text-sm font-bold text-slate-800">{s.label}</span>
                {openSections[s.key] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {openSections[s.key] && (
                <div className="p-4 space-y-3">
                  {s.fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-slate-500">{f.label}</label>
                      <textarea value={questionnaire[s.key]?.[f.key] || ""} onChange={(e) => setField(s.key, f.key, e.target.value)} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 mt-0.5 resize-y" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {isEdit ? "Save Changes" : "Create & Generate Sheet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}