import { useState } from "react";
import { Button } from "@/components/ui/button";

const SERVICES = ["SEO", "Local SEO", "PPC", "Social Media", "Web Design", "GHL Automations", "Customer Success"];

function Field({ label, name, type = "text", placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </div>
  );
}

export default function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: "", contact_name: "", contact_email: "", contact_phone: "",
    website: "", location: "", status: "active", services: [],
    retainer_fee: "", start_date: "", csm_assigned: "",
    google_search_console_url: "", gbp_url: "", ghl_location_id: "", ghl_api_key: "",
    google_ads_account_id: "", ga_property_id: "", wordpress_url: "", wordpress_username: "",
    wordpress_app_password: "", notes: "",
    ...initial,
    retainer_fee: initial?.retainer_fee || "",
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleService = (s) => {
    set("services", form.services?.includes(s)
      ? form.services.filter(x => x !== s)
      : [...(form.services || []), s]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, retainer_fee: form.retainer_fee ? parseFloat(form.retainer_fee) : null });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {/* Basic Info */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Basic Info</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Business Name *" name="name" placeholder="e.g. Sunshine Blinds" value={form.name} onChange={set} />
          <Field label="Contact Name" name="contact_name" placeholder="e.g. John Smith" value={form.contact_name} onChange={set} />
          <Field label="Email" name="contact_email" type="email" placeholder="john@example.com" value={form.contact_email} onChange={set} />
          <Field label="Phone" name="contact_phone" placeholder="(555) 000-0000" value={form.contact_phone} onChange={set} />
          <Field label="Website" name="website" placeholder="https://..." value={form.website} onChange={set} />
          <Field label="Location (City, State)" name="location" placeholder="Miami, FL" value={form.location} onChange={set} />
        </div>
      </div>

      {/* Account Info */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {["active", "onboarding", "paused", "churned", "offboarded"].map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Program</label>
            <select value={form.program || ""} onChange={e => set("program", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">— None —</option>
              {["Growth", "Outshine", "Rocketfuel"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <Field label="Monthly Retainer ($)" name="retainer_fee" type="number" placeholder="2500" value={form.retainer_fee} onChange={set} />
          <Field label="Start Date" name="start_date" type="date" value={form.start_date} onChange={set} />
        </div>
        <div className="mt-3">
          <Field label="Assigned CSM (email)" name="csm_assigned" placeholder="csm@agency.com" value={form.csm_assigned} onChange={set} />
        </div>
      </div>

      {/* Services */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Active Services</p>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(s => (
            <button type="button" key={s} onClick={() => toggleService(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${form.services?.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Integration IDs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="GHL Location ID" name="ghl_location_id" placeholder="abc123..." value={form.ghl_location_id} onChange={set} />
          <Field label="GHL API Key" name="ghl_api_key" placeholder="eyJ..." value={form.ghl_api_key} onChange={set} />
          <Field label="Google Ads Account ID" name="google_ads_account_id" placeholder="123-456-7890" value={form.google_ads_account_id} onChange={set} />
          <Field label="Google Search Console URL" name="google_search_console_url" placeholder="https://..." value={form.google_search_console_url} onChange={set} />
          <Field label="Google Business Profile URL" name="gbp_url" placeholder="https://..." value={form.gbp_url} onChange={set} />
          <Field label="GA4 Property ID" name="ga_property_id" placeholder="e.g. 123456789" value={form.ga_property_id} onChange={set} />
          <Field label="Slack Channel" name="slack_channel" placeholder="e.g. sunshine-blinds or C1234567890" value={form.slack_channel} onChange={set} />
        </div>
      </div>

      {/* BrightLocal */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">BrightLocal</p>
        <Field label="BrightLocal Report URL" name="brightlocal_report_url" placeholder="https://www.local-marketing-reports.com/location-dashboard/..." value={form.brightlocal_report_url} onChange={set} />
        <p className="text-xs text-slate-400 mt-1">Used for Local SEO clients — paste the permanent dashboard link from BrightLocal.</p>
      </div>

      {/* WordPress */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">WordPress Integration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="WordPress Site URL" name="wordpress_url" placeholder="https://clientsite.com" value={form.wordpress_url} onChange={set} />
          <Field label="WordPress Username" name="wordpress_username" placeholder="admin" value={form.wordpress_username} onChange={set} />
          <div className="sm:col-span-2">
            <Field label="Application Password" name="wordpress_app_password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={form.wordpress_app_password} onChange={set} />
            <p className="text-xs text-slate-400 mt-1">Generate in WP Admin → Users → Profile → Application Passwords</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
        <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)}
          rows={3} placeholder="Any general notes about this client..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
          {initial ? "Save Changes" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}