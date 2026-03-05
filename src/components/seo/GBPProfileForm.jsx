import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
    client_name: '', primary_city: '', secondary_cities: [], service_radius: '',
    has_showroom: false, showroom_address: '', appointment_required: false,
    core_services: [], secondary_services: [], primary_service_keywords: [],
    secondary_service_keywords: [], products_offered: [], target_customer_types: [],
    years_in_business: '', average_rating: '', review_count: '', warranty_details: '',
    certifications: [], brands_carried: [], main_offer: '', recurring_promotions: '',
    free_consultation: false, free_measurement: false, financing_available: false,
    seasonal_peak_months: [], notes_for_local_positioning: ''
};

function TagInput({ listName, value, onChange, placeholder }) {
    const [input, setInput] = useState('');
    const add = () => {
        if (input.trim()) { onChange([...(value || []), input.trim()]); setInput(''); }
    };
    const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
    return (
        <div>
            <div className="flex gap-1 flex-wrap mb-2">
                {value?.map((item, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                        {item}
                        <button type="button" onClick={() => remove(i)}><X className="w-3 h-3" /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-1">
                <Input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder={placeholder} className="text-xs h-8" />
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={add}>
                    <Plus className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

export default function GBPProfileForm({ profile, clients = [], onSave, onCancel }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ ...emptyForm, ...profile });

    useEffect(() => { if (profile) setForm({ ...emptyForm, ...profile }); }, [profile]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.GBPProfile.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['gbpProfiles']); toast.success("GBP Profile created!"); onSave(); }
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.GBPProfile.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['gbpProfiles']); toast.success("GBP Profile updated!"); onSave(); }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (profile?.id) updateMutation.mutate({ id: profile.id, data: form });
        else createMutation.mutate(form);
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Client link */}
            {clients.length > 0 && (
                <div>
                    <Label className="mb-1 block">Linked Client <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <select value={form.client_id || ''} onChange={e => set('client_id', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="">— No client linked —</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="mb-1 block">Client Name *</Label>
                    <Input value={form.client_name} onChange={e => set('client_name', e.target.value)} required />
                </div>
                <div>
                    <Label className="mb-1 block">Primary City *</Label>
                    <Input value={form.primary_city} onChange={e => set('primary_city', e.target.value)} required />
                </div>
            </div>

            <div>
                <Label className="mb-1 block">Secondary Cities</Label>
                <TagInput value={form.secondary_cities} onChange={v => set('secondary_cities', v)} placeholder="Add city..." />
            </div>

            <div>
                <Label className="mb-1 block">Service Radius</Label>
                <Input value={form.service_radius} onChange={e => set('service_radius', e.target.value)} placeholder="e.g., 50 miles" />
            </div>

            <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                    <Checkbox checked={form.has_showroom} onCheckedChange={v => set('has_showroom', v)} id="has_showroom" />
                    <Label htmlFor="has_showroom">Has Showroom?</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox checked={form.appointment_required} onCheckedChange={v => set('appointment_required', v)} id="appt_req" />
                    <Label htmlFor="appt_req">Appointment Required?</Label>
                </div>
            </div>

            {form.has_showroom && (
                <div>
                    <Label className="mb-1 block">Showroom Address</Label>
                    <Input value={form.showroom_address} onChange={e => set('showroom_address', e.target.value)} />
                </div>
            )}

            <div>
                <Label className="mb-1 block">Core Services *</Label>
                <TagInput value={form.core_services} onChange={v => set('core_services', v)} placeholder="Add core service..." />
            </div>

            <div>
                <Label className="mb-1 block">Secondary Services</Label>
                <TagInput value={form.secondary_services} onChange={v => set('secondary_services', v)} placeholder="Add secondary service..." />
            </div>

            <div>
                <Label className="mb-1 block">Primary SEO Keywords</Label>
                <TagInput value={form.primary_service_keywords} onChange={v => set('primary_service_keywords', v)} placeholder="Add keyword..." />
            </div>

            <div>
                <Label className="mb-1 block">Secondary SEO Keywords</Label>
                <TagInput value={form.secondary_service_keywords} onChange={v => set('secondary_service_keywords', v)} placeholder="Add keyword..." />
            </div>

            <div>
                <Label className="mb-1 block">Products Offered</Label>
                <TagInput value={form.products_offered} onChange={v => set('products_offered', v)} placeholder="Add product..." />
            </div>

            <div>
                <Label className="mb-1 block">Target Customer Types</Label>
                <TagInput value={form.target_customer_types} onChange={v => set('target_customer_types', v)} placeholder="Add customer type..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label className="mb-1 block">Years in Business</Label>
                    <Input value={form.years_in_business} onChange={e => set('years_in_business', e.target.value)} />
                </div>
                <div>
                    <Label className="mb-1 block">Avg. Rating</Label>
                    <Input value={form.average_rating} onChange={e => set('average_rating', e.target.value)} placeholder="e.g., 4.8" />
                </div>
                <div>
                    <Label className="mb-1 block">Review Count</Label>
                    <Input value={form.review_count} onChange={e => set('review_count', e.target.value)} placeholder="e.g., 150" />
                </div>
            </div>

            <div>
                <Label className="mb-1 block">Warranty Details</Label>
                <Textarea value={form.warranty_details} onChange={e => set('warranty_details', e.target.value)} rows={2} />
            </div>

            <div>
                <Label className="mb-1 block">Certifications</Label>
                <TagInput value={form.certifications} onChange={v => set('certifications', v)} placeholder="Add certification..." />
            </div>

            <div>
                <Label className="mb-1 block">Brands Carried</Label>
                <TagInput value={form.brands_carried} onChange={v => set('brands_carried', v)} placeholder="Add brand..." />
            </div>

            <div>
                <Label className="mb-1 block">Main Offer</Label>
                <Input value={form.main_offer} onChange={e => set('main_offer', e.target.value)} placeholder="e.g., 10% off new installations" />
            </div>

            <div>
                <Label className="mb-1 block">Recurring Promotions</Label>
                <Textarea value={form.recurring_promotions} onChange={e => set('recurring_promotions', e.target.value)} rows={2} />
            </div>

            <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                    <Checkbox checked={form.free_consultation} onCheckedChange={v => set('free_consultation', v)} id="free_consult" />
                    <Label htmlFor="free_consult">Free Consultation?</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox checked={form.free_measurement} onCheckedChange={v => set('free_measurement', v)} id="free_measure" />
                    <Label htmlFor="free_measure">Free Measurement?</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox checked={form.financing_available} onCheckedChange={v => set('financing_available', v)} id="financing" />
                    <Label htmlFor="financing">Financing Available?</Label>
                </div>
            </div>

            <div>
                <Label className="mb-1 block">Seasonal Peak Months</Label>
                <TagInput value={form.seasonal_peak_months} onChange={v => set('seasonal_peak_months', v)} placeholder="Add month..." />
            </div>

            <div>
                <Label className="mb-1 block">Notes for Local Positioning</Label>
                <Textarea value={form.notes_for_local_positioning} onChange={e => set('notes_for_local_positioning', e.target.value)} rows={3} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {profile ? "Update Profile" : "Create Profile"}
                </Button>
            </div>
        </form>
    );
}