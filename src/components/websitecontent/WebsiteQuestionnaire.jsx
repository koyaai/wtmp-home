import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Info } from "lucide-react";

const DEFAULT_FORM = {
  business_name: '', city: '', state: '', cities_served: '',
  years_in_business: '', tagline: '',
  primary_cta: 'Schedule a complimentary in-home consultation',
  // Blinds
  wood_blinds: false, faux_wood_blinds: false, vertical_blinds: false,
  // Shades
  roller_shades: false, roman_shades: false, woven_wood_shades: false, honeycomb_shades: false,
  // Shutters
  plantation_shutters: false, wood_shutters: false, composite_shutters: false, vinyl_shutters: false,
  // Other
  draperies: false, motorization: false,
  // Services
  in_home_consultation: true, measuring_installation: true, new_construction: false, redesign: false,
  // Context
  climate_description: '', brands_carried: '', additional_info: '',
  usps: ['', '', '', '', ''],
};

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4 pb-3 border-b border-slate-200">
      <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </div>
  );
}

function CheckItem({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer text-slate-700">{label}</Label>
    </div>
  );
}

export default function WebsiteQuestionnaire({ clients, selectedClientId, onClientChange, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const handleClientChange = (clientId) => {
    onClientChange(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const parts = (client.location || '').split(',').map(s => s.trim());
      setForm(f => ({
        ...f,
        business_name: client.name || f.business_name,
        city: parts[0] || f.city,
        state: parts[1] || f.state,
      }));
    }
  };

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setUsp = (i, value) => setForm(f => {
    const usps = [...f.usps];
    usps[i] = value;
    return { ...f, usps };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.business_name || !form.city) return alert('Business Name and City are required.');
    onSubmit(form);
  };

  const hasAnyBlind = form.wood_blinds || form.faux_wood_blinds || form.vertical_blinds;
  const hasAnyShade = form.roller_shades || form.roman_shades || form.woven_wood_shades || form.honeycomb_shades;
  const hasAnyShutter = form.plantation_shutters || form.wood_shutters || form.composite_shutters || form.vinyl_shutters;
  const pageCount = 6
    + (form.new_construction ? 1 : 0)
    + (form.motorization ? 1 : 0)
    + (hasAnyBlind ? 1 + [form.wood_blinds, form.faux_wood_blinds, form.vertical_blinds].filter(Boolean).length : 0)
    + (hasAnyShade ? 1 + [form.roller_shades, form.roman_shades, form.woven_wood_shades, form.honeycomb_shades].filter(Boolean).length : 0)
    + (hasAnyShutter ? 1 + [form.plantation_shutters, form.wood_shutters, form.composite_shutters, form.vinyl_shutters].filter(Boolean).length : 0)
    + (form.draperies ? 1 : 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">

      {/* Client selector */}
      {clients.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <Label className="text-xs font-semibold text-blue-800 mb-2 block">Link to Client (auto-fills business details)</Label>
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Business Info */}
      <div>
        <SectionHeader title="Business Information" description="Core details used across every page" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600">Business Name *</Label>
            <Input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="e.g., Naka's Drapery" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Primary City *</Label>
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g., Maui" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">State / Region</Label>
            <Input value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g., Hawaii / HI" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600">All Cities / Areas Served</Label>
            <Input value={form.cities_served} onChange={e => set('cities_served', e.target.value)} placeholder="e.g., Wailea, Kihei, Lahaina, Wailuku, Upcountry Maui" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Years in Business</Label>
            <Input value={form.years_in_business} onChange={e => set('years_in_business', e.target.value)} placeholder="e.g., Over 60 years" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Tagline / Slogan</Label>
            <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g., The Name to Trust on Maui" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-slate-600">Primary Call to Action</Label>
            <Input value={form.primary_cta} onChange={e => set('primary_cta', e.target.value)} placeholder="e.g., Schedule a complimentary in-home consultation" className="mt-1" />
          </div>
        </div>
      </div>

      {/* Products */}
      <div>
        <SectionHeader title="Products Offered" description="Check all products. Individual pages will be generated for each one." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Blinds</p>
            <div className="space-y-2.5">
              <CheckItem id="wood_blinds" label="Wood Blinds" checked={form.wood_blinds} onChange={v => set('wood_blinds', v)} />
              <CheckItem id="faux_wood_blinds" label="Faux Wood Blinds" checked={form.faux_wood_blinds} onChange={v => set('faux_wood_blinds', v)} />
              <CheckItem id="vertical_blinds" label="Vertical Blinds" checked={form.vertical_blinds} onChange={v => set('vertical_blinds', v)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Shades</p>
            <div className="space-y-2.5">
              <CheckItem id="roller_shades" label="Roller Shades" checked={form.roller_shades} onChange={v => set('roller_shades', v)} />
              <CheckItem id="roman_shades" label="Roman Shades" checked={form.roman_shades} onChange={v => set('roman_shades', v)} />
              <CheckItem id="woven_wood_shades" label="Woven Wood Shades" checked={form.woven_wood_shades} onChange={v => set('woven_wood_shades', v)} />
              <CheckItem id="honeycomb_shades" label="Honeycomb Shades" checked={form.honeycomb_shades} onChange={v => set('honeycomb_shades', v)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Shutters</p>
            <div className="space-y-2.5">
              <CheckItem id="plantation_shutters" label="Plantation Shutters" checked={form.plantation_shutters} onChange={v => set('plantation_shutters', v)} />
              <CheckItem id="wood_shutters" label="Wood Shutters" checked={form.wood_shutters} onChange={v => set('wood_shutters', v)} />
              <CheckItem id="composite_shutters" label="Composite Shutters" checked={form.composite_shutters} onChange={v => set('composite_shutters', v)} />
              <CheckItem id="vinyl_shutters" label="Vinyl Shutters" checked={form.vinyl_shutters} onChange={v => set('vinyl_shutters', v)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Other</p>
            <div className="space-y-2.5">
              <CheckItem id="draperies" label="Custom Draperies" checked={form.draperies} onChange={v => set('draperies', v)} />
              <CheckItem id="motorization" label="Motorization" checked={form.motorization} onChange={v => set('motorization', v)} />
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div>
        <SectionHeader title="Services Offered" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CheckItem id="in_home_consultation" label="In-Home Consultation" checked={form.in_home_consultation} onChange={v => set('in_home_consultation', v)} />
          <CheckItem id="measuring_installation" label="Measuring & Installation" checked={form.measuring_installation} onChange={v => set('measuring_installation', v)} />
          <CheckItem id="new_construction" label="New Home Construction" checked={form.new_construction} onChange={v => set('new_construction', v)} />
          <CheckItem id="redesign" label="Redesign & Refresh" checked={form.redesign} onChange={v => set('redesign', v)} />
        </div>
      </div>

      {/* Climate & Context */}
      <div>
        <SectionHeader title="Climate & Local Context" description="Used to tailor every page to the local lifestyle and environment" />
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Climate Description</Label>
            <Input value={form.climate_description} onChange={e => set('climate_description', e.target.value)}
              placeholder="e.g., Tropical island — intense afternoon sun, coastal humidity, ocean views, trade winds" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Brands Carried</Label>
            <Input value={form.brands_carried} onChange={e => set('brands_carried', e.target.value)}
              placeholder="e.g., Hunter Douglas, Norman, Graber, Alta" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Additional Notes (optional)</Label>
            <Textarea value={form.additional_info} onChange={e => set('additional_info', e.target.value)}
              placeholder="Unique story, awards, certifications, special services, showroom info..." className="mt-1 h-20" />
          </div>
        </div>
      </div>

      {/* USPs */}
      <div>
        <SectionHeader title="Unique Selling Propositions" description="Up to 5 differentiators woven throughout all pages" />
        <div className="space-y-2">
          {form.usps.map((usp, i) => (
            <Input key={i} value={usp} onChange={e => setUsp(i, e.target.value)}
              placeholder={
                i === 0 ? 'USP 1 — e.g., Over 60 years of local expertise' :
                i === 1 ? 'USP 2 — e.g., Locally owned and operated' :
                i === 2 ? 'USP 3 — e.g., Custom fabrication and professional installation' :
                `USP ${i + 1}`
              }
              className="text-sm" />
          ))}
        </div>
      </div>

      {/* Page count preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-600">
          Based on your selections, <strong>{pageCount} pages</strong> will be generated.
          Uses advanced AI — may take <strong>45–90 seconds</strong>.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Sparkles className="w-4 h-4" />
          Generate {pageCount} Pages
        </Button>
      </div>
    </form>
  );
}