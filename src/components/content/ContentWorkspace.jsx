import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BarChart2, RefreshCw, Save, Copy, Check, MapPin, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";
import EntropyScoreGauge from "./EntropyScoreGauge";
import DimensionScores from "./DimensionScores";
import EntropyHeatmap from "./EntropyHeatmap";
import CompetitorAnalysis from "./CompetitorAnalysis";
import GenericPhraseDetection from "./GenericPhraseDetection";
import ClaimVerifiability from "./ClaimVerifiability";

const CONTENT_TYPES = ["Blog Post", "GBP Post", "Service Page", "Landing Page", "Social Caption", "Email", "Other"];

export default function ContentWorkspace({ client, onSaved }) {
    const [mode, setMode] = useState(null);
    const [title, setTitle] = useState("");
    const [contentType, setContentType] = useState("");
    const [topic, setTopic] = useState("");
    const [contextNotes, setContextNotes] = useState("");
    const [location, setLocation] = useState("");
    const [competitorContent, setCompetitorContent] = useState("");
    const [inputContent, setInputContent] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [copied, setCopied] = useState(false);

    const reset = (newMode) => {
        setMode(newMode);
        setResult(null);
        setTitle(""); setTopic(""); setContextNotes("");
        setLocation(""); setCompetitorContent(""); setInputContent(""); setContentType("");
    };

    const handleRun = async () => {
        if (!title.trim()) { toast.error("Please enter a title"); return; }
        if (mode === "generate" && !topic.trim()) { toast.error("Please enter a topic"); return; }
        if ((mode === "analyze" || mode === "rewrite") && !inputContent.trim()) { toast.error("Please enter content to " + mode); return; }

        setLoading(true);
        setResult(null);
        try {
            const res = await base44.functions.invoke('contentEngine', {
                mode,
                content: inputContent,
                topic,
                context_notes: contextNotes,
                location: location || undefined,
                competitor_content: competitorContent || undefined,
                client_name: client.name,
                content_type: contentType,
            });
            setResult(res.data);
        } catch (err) {
            toast.error(err.message);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!result) return;
        const payload = {
            client_id: client.id,
            client_name: client.name,
            title,
            mode: mode === "analyze" ? "analyzed" : mode === "generate" ? "generated" : "rewritten",
            content_type: contentType || "Other",
            context_notes: contextNotes,
            original_content: inputContent || null,
            final_content: result.final_content || null,
            entropy_score: result.entropy_score ?? result.new_entropy_score ?? result.original_entropy_score ?? null,
            dimension_scores: result.dimension_scores || result.new_dimension_scores || null,
            analysis: {
                top_problems: result.top_problems,
                rewrite_strategy: result.rewrite_strategy,
                original_entropy_score: result.original_entropy_score,
                original_dimension_scores: result.original_dimension_scores,
                entropy_heatmap: result.entropy_heatmap,
                competitor_analysis: result.competitor_analysis,
                experience_signals_used: result.experience_signals_used,
                local_authority_elements: result.local_authority_elements,
            },
            status: "draft",
        };
        await base44.entities.ContentItem.create(payload);
        toast.success("Saved to content library!");
        onSaved?.();
    };

    const handleApplyRecommendations = async () => {
        setApplying(true);
        try {
            const res = await base44.functions.invoke('contentEngine', {
                mode: 'apply_recommendations',
                content: inputContent || result?.final_content || "",
                context_notes: contextNotes,
                location: location || undefined,
                competitor_content: competitorContent || undefined,
                client_name: client.name,
                content_type: contentType,
                generic_phrases: result?.generic_phrase_detection?.detected_phrases || [],
                claims: result?.claim_verifiability?.detected_claims || [],
                top_problems: result?.top_problems || [],
                rewrite_strategy: result?.rewrite_strategy || "",
            });
            setResult(prev => ({
                ...prev,
                ...res.data,
                // keep original scores for comparison
                original_entropy_score: prev.original_entropy_score ?? prev.entropy_score,
                original_dimension_scores: prev.original_dimension_scores ?? prev.dimension_scores,
            }));
            toast.success("Recommendations applied!");
        } catch (err) {
            toast.error(err.message);
        }
        setApplying(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result?.final_content || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const modeColor = mode === "analyze" ? "bg-blue-100 text-blue-700" : mode === "generate" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700";

    return (
        <div className="flex flex-col gap-5">
            {/* Mode selector */}
            {!mode && (
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => reset("analyze")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <BarChart2 className="w-7 h-7 text-blue-500" />
                        <span className="font-semibold text-slate-700 text-sm">Analyze Content</span>
                        <span className="text-xs text-slate-400 text-center">Score against the 12-dimension framework</span>
                    </button>
                    <button onClick={() => reset("generate")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                        <span className="font-semibold text-slate-700 text-sm">Generate Content</span>
                        <span className="text-xs text-slate-400 text-center">Create high-entropy content from a topic brief</span>
                    </button>
                    <button onClick={() => reset("rewrite")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all">
                        <RefreshCw className="w-7 h-7 text-green-500" />
                        <span className="font-semibold text-slate-700 text-sm">Rewrite Content</span>
                        <span className="text-xs text-slate-400 text-center">Improve weak content using the framework</span>
                    </button>
                </div>
            )}

            {mode && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <Badge className={modeColor}>{mode === "analyze" ? "Analyze" : mode === "generate" ? "Generate" : "Rewrite"}</Badge>
                        <button onClick={() => setMode(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">← Change mode</button>
                    </div>

                    {/* Title + Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
                            <Input placeholder="E.g. Carpet Installation Austin, TX" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Content Type</label>
                            <Select value={contentType} onValueChange={setContentType}>
                                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                <SelectContent>
                                    {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {mode === "generate" && (
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Topic / Brief *</label>
                            <Input placeholder="E.g. Vinyl plank flooring installation for Dallas homeowners" value={topic} onChange={e => setTopic(e.target.value)} />
                        </div>
                    )}

                    {(mode === "analyze" || mode === "rewrite") && (
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Content to {mode} *</label>
                            <Textarea placeholder="Paste the content here..." value={inputContent} onChange={e => setInputContent(e.target.value)} className="min-h-[160px] font-mono text-sm" />
                        </div>
                    )}

                    {/* Context */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Additional Context <span className="text-slate-400">(optional)</span></label>
                        <Textarea placeholder="E.g. Dallas-based flooring company, premium brands, service radius 30 miles, target: homeowners..." value={contextNotes} onChange={e => setContextNotes(e.target.value)} className="min-h-[60px] text-sm" />
                    </div>

                    {/* Location — Feature 4: Local Authority */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1 block">
                            <MapPin className="w-3 h-3 text-slate-400" /> Location / Service Area <span className="text-slate-400">(optional — enables local authority signals)</span>
                        </label>
                        <Input placeholder="E.g. Phoenix, AZ — hot/dry climate, suburban neighborhoods" value={location} onChange={e => setLocation(e.target.value)} />
                    </div>

                    {/* Competitor Content — Feature 1: Competitor Analyzer */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1 block">
                            <Users className="w-3 h-3 text-slate-400" /> Competitor Content / SERP Data <span className="text-slate-400">(optional — enables information gain analysis)</span>
                        </label>
                        <Textarea placeholder="Paste competitor content, meta descriptions, headings, or SERP snippets here..." value={competitorContent} onChange={e => setCompetitorContent(e.target.value)} className="min-h-[80px] text-sm" />
                    </div>

                    <Button onClick={handleRun} disabled={loading} className="bg-slate-800 hover:bg-slate-700 text-white w-full">
                        {loading
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            : mode === "analyze" ? "Analyze Content" : mode === "generate" ? "Generate Content" : "Rewrite Content"}
                    </Button>

                    {/* Results */}
                    {result && (
                        <div className="flex flex-col gap-5 pt-2 border-t border-slate-100">

                            {/* Entropy scores */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {result.original_entropy_score !== undefined && (
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Original</p>
                                        <EntropyScoreGauge score={result.original_entropy_score} />
                                    </div>
                                )}
                                {(result.entropy_score !== undefined || result.new_entropy_score !== undefined) && (
                                    <div>
                                        {result.original_entropy_score !== undefined && <p className="text-xs text-slate-400 mb-1">Improved</p>}
                                        <EntropyScoreGauge score={result.entropy_score ?? result.new_entropy_score} />
                                    </div>
                                )}
                            </div>

                            {/* Generic Phrase Detection — shown first */}
                            <GenericPhraseDetection data={result.generic_phrase_detection} />

                            {/* Claim Verifiability Review — shown second */}
                            <ClaimVerifiability data={result.claim_verifiability} />

                            {/* Competitor Analysis */}
                            <CompetitorAnalysis analysis={result.competitor_analysis} />

                            {/* Top Problems */}
                            {result.top_problems?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Problems</p>
                                    <ul className="space-y-1">
                                        {result.top_problems.map((p, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <span className="text-red-400 mt-0.5">•</span>{p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Entropy Heatmap */}
                            <EntropyHeatmap heatmap={result.entropy_heatmap} />

                            {/* Rewrite strategy */}
                            {result.rewrite_strategy && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-blue-700 mb-1">Rewrite Strategy</p>
                                    <p className="text-sm text-blue-800">{result.rewrite_strategy}</p>
                                </div>
                            )}

                            {/* Experience signals used */}
                            {result.experience_signals_used?.length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-indigo-700 mb-1">Experience Signals Embedded</p>
                                    <ul className="space-y-0.5">
                                        {result.experience_signals_used.map((s, i) => (
                                            <li key={i} className="text-xs text-indigo-800 flex gap-1.5"><span>✦</span>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Local authority elements */}
                            {result.local_authority_elements?.length > 0 && (
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-teal-700 mb-1">Local Authority Elements</p>
                                    <ul className="space-y-0.5">
                                        {result.local_authority_elements.map((e, i) => (
                                            <li key={i} className="text-xs text-teal-800 flex gap-1.5"><MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />{e}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Dimension scores */}
                            {(result.original_dimension_scores || result.dimension_scores) && (
                                <DimensionScores
                                    scores={result.original_dimension_scores || result.dimension_scores}
                                    title={result.original_dimension_scores ? "Original Scores" : "Dimension Scores"}
                                />
                            )}

                            {/* Final content */}
                            {result.final_content && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            {mode === "rewrite" ? "Rewritten Content" : "Generated Content"}
                                        </p>
                                        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                            {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap border border-slate-200 max-h-80 overflow-y-auto">
                                        {result.final_content}
                                    </div>
                                </div>
                            )}

                            {/* Improved dimension scores after rewrite */}
                            {result.new_dimension_scores && (
                                <DimensionScores scores={result.new_dimension_scores} title="Improved Scores" />
                            )}

                            {/* Apply Recommendations */}
                            {(result?.generic_phrase_detection?.detected_phrases?.length > 0 || result?.claim_verifiability?.detected_claims?.length > 0 || result?.top_problems?.length > 0) && (
                                <Button onClick={handleApplyRecommendations} disabled={applying} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                                    {applying
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying recommendations...</>
                                        : <><Wand2 className="w-4 h-4 mr-2" /> Apply Recommendations</>}
                                </Button>
                            )}

                            {/* Improvements applied */}
                            {result?.improvements_applied?.length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-indigo-700 mb-1">Improvements Applied</p>
                                    <ul className="space-y-0.5">
                                        {result.improvements_applied.map((s, i) => (
                                            <li key={i} className="text-xs text-indigo-800 flex gap-1.5"><Wand2 className="w-3 h-3 flex-shrink-0 mt-0.5" />{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Save */}
                            <Button onClick={handleSave} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                                <Save className="w-4 h-4 mr-2" /> Save to {client.name}'s Library
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}