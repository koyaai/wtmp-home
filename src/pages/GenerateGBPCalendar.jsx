import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Save } from 'lucide-react';
import GBPCalendarDisplay from '@/components/seo/GBPCalendarDisplay';
import { toast } from 'sonner';
import moment from 'moment';

const MONTHS = moment.months();

export default function GenerateGBPCalendar() {
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const initialProfileId = urlParams.get('gbpProfileId') || '';

    const [selectedProfile, setSelectedProfile] = useState(initialProfileId);
    const [month, setMonth] = useState('');
    const [season, setSeason] = useState('');
    const [priorityService, setPriorityService] = useState('');
    const [postsPerWeek, setPostsPerWeek] = useState('');
    const [generatedCalendar, setGeneratedCalendar] = useState(null);

    const { data: gbpProfiles = [] } = useQuery({
        queryKey: ['gbpProfiles'],
        queryFn: () => base44.entities.GBPProfile.list('-created_date')
    });

    const generateMutation = useMutation({
        mutationFn: (params) => base44.functions.invoke('generateGBPCalendar', params),
        onSuccess: (response) => {
            if (response.data?.calendar_data) {
                setGeneratedCalendar(response.data);
                toast.success("GBP Calendar generated!");
            } else {
                toast.error("Failed to generate calendar. Please try again.");
            }
        },
        onError: (error) => toast.error(`Error: ${error.message}`)
    });

    const saveMutation = useMutation({
        mutationFn: (data) => base44.entities.GBPCalendar.create(data),
        onSuccess: () => {
            toast.success("Calendar saved!");
            setGeneratedCalendar(null);
            setMonth(''); setSeason(''); setPriorityService(''); setPostsPerWeek('');
            queryClient.invalidateQueries(['gbpCalendars']);
        },
        onError: (error) => toast.error(`Error saving: ${error.message}`)
    });

    const handleGenerate = () => {
        const profile = gbpProfiles.find(p => p.id === selectedProfile);
        if (!profile || !month || !season || !postsPerWeek) {
            toast.error("Please fill in all required fields.");
            return;
        }
        generateMutation.mutate({
            gbp_profile_id: selectedProfile,
            client_name: profile.client_name,
            month, season,
            priority_service: priorityService,
            posts_per_week: parseInt(postsPerWeek),
            gbp_profile_data: profile
        });
    };

    const handleSave = () => {
        if (!generatedCalendar) return;
        saveMutation.mutate({
            gbp_profile_id: generatedCalendar.gbp_profile_id,
            client_name: generatedCalendar.client_name,
            month: generatedCalendar.month,
            season: generatedCalendar.season,
            priority_service: generatedCalendar.priority_service,
            posts_per_week: generatedCalendar.posts_per_week,
            calendar_data: generatedCalendar.calendar_data
        });
    };

    const canGenerate = selectedProfile && month && season && postsPerWeek;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Generate GBP Calendar</h1>
                <p className="text-slate-500 text-sm mt-0.5">Create targeted Google Business Profile content schedules for your clients.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Calendar Configuration</CardTitle>
                        <CardDescription>Define the parameters for your GBP content calendar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div>
                            <Label className="mb-1.5 block">GBP Profile *</Label>
                            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                                <SelectTrigger><SelectValue placeholder="Select a GBP profile" /></SelectTrigger>
                                <SelectContent>
                                    {gbpProfiles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.client_name} — {p.primary_city}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {gbpProfiles.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">No GBP profiles found. Create one in GBP Profiles first.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1.5 block">Month *</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Season *</Label>
                                <Select value={season} onValueChange={setSeason}>
                                    <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                                    <SelectContent>
                                        {['Spring', 'Summer', 'Fall', 'Winter'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-1.5 block">Posts Per Week *</Label>
                            <Input type="number" value={postsPerWeek} onChange={e => setPostsPerWeek(e.target.value)} placeholder="e.g., 3" min="1" max="14" />
                        </div>

                        <div>
                            <Label className="mb-1.5 block">Priority Service <span className="text-slate-400 font-normal">(optional)</span></Label>
                            <Input value={priorityService} onChange={e => setPriorityService(e.target.value)} placeholder="e.g., Window Installation, Blinds Repair" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={generateMutation.isPending || !canGenerate}>
                            {generateMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="mr-2 h-4 w-4" /> Generate GBP Calendar</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {generatedCalendar && (
                    <div className="space-y-4">
                        <GBPCalendarDisplay calendar={generatedCalendar.calendar_data} />
                        <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Save GBP Calendar</>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}