import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Save } from 'lucide-react';
import CalendarDisplay from '@/components/calendar/CalendarDisplay';
import { toast } from 'sonner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FORMATS = ['Image Post','Video Reel','Story','Carousel Post','Blog Post Teaser','Infographic','Before/After','Testimonial','Poll/Quiz','Live Stream Promo'];

export default function GenerateCalendar() {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState('');
  const [month, setMonth] = useState('');
  const [season, setSeason] = useState('');
  const [priorityProduct, setPriorityProduct] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [postsPerWeek, setPostsPerWeek] = useState('');
  const [formatPreferences, setFormatPreferences] = useState([]);
  const [generatedCalendar, setGeneratedCalendar] = useState(null);

  const { data: brandProfiles = [] } = useQuery({
    queryKey: ['brandProfiles'],
    queryFn: () => base44.entities.BrandProfile.list('-created_date'),
  });

  const generateMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke('generateCalendar', params),
    onSuccess: (response) => {
      if (response.data?.calendar_data) {
        setGeneratedCalendar(response.data);
        toast.success('Calendar generated successfully!');
      } else {
        toast.error('Failed to generate calendar. Please try again.');
      }
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Calendar.create(data),
    onSuccess: () => {
      toast.success('Calendar saved!');
      setGeneratedCalendar(null);
      setSelectedBrand(''); setMonth(''); setSeason('');
      setPriorityProduct(''); setCampaignGoal(''); setPostsPerWeek('');
      setFormatPreferences([]);
      queryClient.invalidateQueries(['savedCalendars']);
    },
    onError: (error) => toast.error(`Error saving: ${error.message}`),
  });

  const handleGenerate = () => {
    const profile = brandProfiles.find(b => b.id === selectedBrand);
    if (!profile || !month || !season || !campaignGoal || !postsPerWeek) {
      toast.error('Please fill in all required fields.');
      return;
    }
    generateMutation.mutate({
      brand_profile_id: selectedBrand,
      brand_name: profile.name,
      month, season,
      priority_product: priorityProduct,
      campaign_goal: campaignGoal,
      posts_per_week: parseInt(postsPerWeek),
      format_preferences: formatPreferences,
      brand_analysis: profile.brand_analysis,
      location: profile.location,
      products_offered: profile.products_offered,
      price_tier: profile.price_tier,
      target_audience: profile.target_audience,
    });
  };

  const handleSave = () => {
    if (!generatedCalendar) return;
    saveMutation.mutate({
      brand_profile_id: generatedCalendar.brand_profile_id,
      brand_name: generatedCalendar.brand_name,
      month: generatedCalendar.month,
      season: generatedCalendar.season,
      priority_product: generatedCalendar.priority_product,
      campaign_goal: generatedCalendar.campaign_goal,
      posts_per_week: generatedCalendar.posts_per_week,
      format_preferences: generatedCalendar.format_preferences,
      calendar_data: generatedCalendar.calendar_data,
      brand_voice_score: generatedCalendar.brand_voice_score,
    });
  };

  const toggleFormat = (format) => {
    setFormatPreferences(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const canGenerate = selectedBrand && month && season && campaignGoal && postsPerWeek;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Generate Content Calendar</h1>
        <p className="text-slate-500 text-sm mt-0.5">AI-powered social media planning tailored to your client's brand.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Configuration</CardTitle>
            <CardDescription>Define the parameters for your content calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Brand Profile */}
            <div>
              <Label className="mb-1.5 block">Brand Profile *</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand profile" />
                </SelectTrigger>
                <SelectContent>
                  {brandProfiles.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brandProfiles.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No brand profiles found. Create one first in the Brand Profiles section.</p>
              )}
            </div>

            {/* Month & Season */}
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
                    {['Spring','Summer','Fall','Winter'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campaign Goal */}
            <div>
              <Label className="mb-1.5 block">Campaign Goal *</Label>
              <Select value={campaignGoal} onValueChange={setCampaignGoal}>
                <SelectTrigger><SelectValue placeholder="Select campaign goal" /></SelectTrigger>
                <SelectContent>
                  {['Lead Generation','Engagement Growth','Product Push','Brand Authority'].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Posts Per Week */}
            <div>
              <Label className="mb-1.5 block">Posts Per Week *</Label>
              <Input type="number" value={postsPerWeek} onChange={e => setPostsPerWeek(e.target.value)} placeholder="e.g., 3" min="1" max="14" />
            </div>

            {/* Priority Product */}
            <div>
              <Label className="mb-1.5 block">Priority Product <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={priorityProduct} onChange={e => setPriorityProduct(e.target.value)} placeholder="e.g., Smart Blinds, Custom Shutters" />
            </div>

            {/* Format Preferences */}
            <div>
              <Label className="mb-2 block">Preferred Content Formats</Label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map(format => (
                  <div key={format} className="flex items-center space-x-2">
                    <Checkbox
                      id={format}
                      checked={formatPreferences.includes(format)}
                      onCheckedChange={() => toggleFormat(format)}
                    />
                    <label htmlFor={format} className="text-sm leading-none cursor-pointer">{format}</label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={generateMutation.isPending || !canGenerate}
            >
              {generateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Calendar</>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Preview + Save */}
        {generatedCalendar && (
          <div className="space-y-4">
            <CalendarDisplay calendar={generatedCalendar.calendar_data} />
            <Button
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Calendar</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}