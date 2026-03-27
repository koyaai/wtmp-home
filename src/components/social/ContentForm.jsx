import { useState } from "react";
import { Button } from "@/components/ui/button";

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Google Business Profile", "Blog", "Other"];
const CONTENT_TYPES = ["Reel/Video", "Static Image", "Carousel", "Story", "Blog Post", "GBP Post", "Other"];
const STATUSES = ["idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

function Field({ label, name, type = "text", placeholder, large, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {large ? (
        <textarea value={value || ""} onChange={e => onChange(name, e.target.value)} rows={3}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
      ) : (
        <input type={type} value={value || ""} onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      )}
    </div>
  );
}

function Select({ label, name, options, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select value={value || ""} onChange={e => onChange(name, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
        {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function ContentForm({ initial, clients, onSave, onCancel }) {
  const [form, setForm] = useState({
    client_id: clients[0]?.id || "",
    title: "",
    platform: "Instagram",
    content_type: "Static Image",
    topic: "",
    caption_direction: "",
    visual_direction: "",
    target_audience: "",
    cta: "",
    hashtags: "",
    scheduled_date: "",
    status: "idea",
    assigned_to: "",
    notes: "",
    ...initial,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-5">
      {/* Basic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Client *</label>
          <select value={form.client_id} onChange={e => set("client_id", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><Field label="Content Title *" name="title" placeholder="e.g. Spring Blinds Promo Reel" value={form.title} onChange={set} /></div>
        <Select label="Platform" name="platform" options={PLATFORMS} value={form.platform} onChange={set} />
        <Select label="Content Type" name="content_type" options={CONTENT_TYPES} value={form.content_type} onChange={set} />
      </div>

      {/* Direction */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Creative Direction</p>
        <Field label="Topic / Concept" name="topic" placeholder="What is this content about?" value={form.topic} onChange={set} />
        <Field label="Caption Direction" name="caption_direction" large placeholder="Guide the copywriter — tone, key messages, what to highlight..." value={form.caption_direction} onChange={set} />
        <Field label="Visual Direction" name="visual_direction" large placeholder="Describe the look/feel — colors, scenes, style, overlays..." value={form.visual_direction} onChange={set} />
      </div>

      {/* Strategy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide sm:col-span-2">Strategy</p>
        <Field label="Target Audience" name="target_audience" placeholder="e.g. homeowners, 35-55, Miami area" value={form.target_audience} onChange={set} />
        <Field label="Call to Action (CTA)" name="cta" placeholder="e.g. DM us for a free quote" value={form.cta} onChange={set} />
        <div className="sm:col-span-2"><Field label="Hashtags" name="hashtags" placeholder="#windowtreatments #blinds #homedecor" value={form.hashtags} onChange={set} /></div>
      </div>

      {/* Logistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide sm:col-span-3">Logistics</p>
        <Field label="Scheduled Date" name="scheduled_date" type="date" value={form.scheduled_date} onChange={set} />
        <Field label="Assigned To" name="assigned_to" placeholder="Team member name/email" value={form.assigned_to} onChange={set} />
        <Select label="Status" name="status" options={STATUSES.map(s => ({ value: s, label: s.replace("_", " ") }))} value={form.status} onChange={set} />
        <div className="sm:col-span-3"><Field label="Internal Notes" name="notes" placeholder="Any other notes for the team..." value={form.notes} onChange={set} /></div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => { if (form.title && form.client_id) onSave(form); }}>
          {initial ? "Save Changes" : "Create Content Plan"}
        </Button>
      </div>
    </div>
  );
}