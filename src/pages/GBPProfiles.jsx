import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, Loader2, Search, ExternalLink, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import GBPProfileForm from '@/components/seo/GBPProfileForm';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X } from 'lucide-react';

export default function GBPProfiles() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: gbpProfiles = [], isLoading } = useQuery({
        queryKey: ['gbpProfiles'],
        queryFn: () => base44.entities.GBPProfile.list('-created_date')
    });

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => base44.entities.Client.list()
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.GBPProfile.delete(id),
        onSuccess: () => { queryClient.invalidateQueries(['gbpProfiles']); toast.success("Profile deleted."); }
    });

    const handleDelete = (id) => {
        if (window.confirm("Delete this GBP Profile?")) deleteMutation.mutate(id);
    };

    const handleEdit = (profile) => { setEditingProfile(profile); setShowForm(true); };
    const handleClose = () => { setShowForm(false); setEditingProfile(null); };

    const filtered = gbpProfiles.filter(p =>
        p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.primary_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.core_services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">GBP Profiles</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage Google Business Profile data for your clients</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditingProfile(null); setShowForm(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> New GBP Profile
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by client, city, or service..." className="pl-9" />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No GBP Profiles found</p>
                    <p className="text-xs mt-1">Create a profile to start generating GBP content calendars</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(profile => (
                        <div key={profile.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{profile.client_name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {profile.primary_city}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(profile)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(profile.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {profile.core_services?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {profile.core_services.slice(0, 3).map(s => (
                                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s}</span>
                                    ))}
                                    {profile.core_services.length > 3 && (
                                        <span className="text-xs text-slate-400">+{profile.core_services.length - 3}</span>
                                    )}
                                </div>
                            )}

                            {profile.main_offer && (
                                <p className="text-xs text-slate-500 border-t border-slate-50 pt-2">{profile.main_offer}</p>
                            )}

                            <Link to={createPageUrl(`GenerateGBPCalendar?gbpProfileId=${profile.id}`)} className="mt-auto">
                                <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                    Generate Calendar <ExternalLink className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="font-bold text-slate-800">{editingProfile ? "Edit GBP Profile" : "New GBP Profile"}</h2>
                            <button onClick={handleClose}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <GBPProfileForm profile={editingProfile} clients={clients} onSave={handleClose} onCancel={handleClose} />
                    </div>
                </div>
            )}
        </div>
    );
}