import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CLIMATE_TYPES = ["Hot/Humid", "Hot/Dry", "Temperate", "Cold/Snowy", "Coastal", "Desert", "Tropical"];
const PRICE_TIERS = ["Budget", "Mid-Range", "Premium", "Luxury"];

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function BrandProfileForm({ initial, clients, onSave, onCancel }) {
  const [form, setForm] = useState({
    client_id: "",
    name: "",
    location: "",
    climate_type: "",
    price_tier: "Mid-Range",
    products_offered: [],
    target_audience: [],
    ...initial,
  });

  const [productsInput, setProductsInput] = useState((initial?.products_offered || []).join(", "));
  const [audienceInput, setAudienceInput] = useState((initial?.target_audience || []).join(", "));

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    onSave({
      ...form,
      products_offered: productsInput.split(",").map(s => s.trim()).filter(Boolean),
      target_audience: audienceInput.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="p-6 space-y-4">
      <Field label="Linked Client">
        <select value={form.client_id} onChange={e => set("client_id", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">— No client linked —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Brand Name *">
        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g., Luxe Blinds Co."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Location *">
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g., Dallas, TX"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </Field>
        <Field label="Climate Type">
          <select value={form.climate_type} onChange={e => set("climate_type", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Select...</option>
            {CLIMATE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Price Tier *">
        <select value={form.price_tier} onChange={e => set("price_tier", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {PRICE_TIERS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="Products Offered * (comma-separated)">
        <input value={productsInput} onChange={e => setProductsInput(e.target.value)}
          placeholder="e.g., Roller Blinds, Shutters, Curtains"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </Field>

      <Field label="Target Audience * (comma-separated)">
        <input value={audienceInput} onChange={e => setAudienceInput(e.target.value)}
          placeholder="e.g., Homeowners, Interior Designers, Contractors"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}
          disabled={!form.name || !form.location || !form.price_tier}>
          Save Brand Profile
        </Button>
      </div>
    </div>
  );
}