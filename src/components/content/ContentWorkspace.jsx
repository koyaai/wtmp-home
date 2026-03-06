import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BarChart2, RefreshCw, Save, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import EntropyScoreGauge from "./EntropyScoreGauge";
import DimensionScores from "./DimensionScores";

const CONTENT_TYPES = ["Blog Post", "GBP Post", "Service Page", "Landing Page", "Social Caption", "Email", "Other"];

export default function ContentWorkspace({ client, onSaved }) {
    const [mode, setMode] = useState(null); // 'analyze' | 'generate' | 'rewrite'
    const [title, setTitle] = useState("");
    const [contentType, setContentType] = useState("");
    const [topic, setTopic] = useState("");
    const [contextNotes, setContextNotes] = useState("");
    const [inputContent, setInputContent] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const reset = (newMode) => {
        setMode(newMode);
        setResult(null);
        setTitle("");
        setTopic("");
        setContextNotes("");
        setInputContent("");
        setContentType("");
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
            entropy_score: result.entropy_score || result.new_entropy_score || result.original_entropy_score || null,
            dimension_scores: result.dimension_scores || result.new_dimension_scores || null,
            analysis: {
                top_problems: result.top_problems,
                rewrite_strategy: result.rewrite_strategy,
                original_entropy_score: result.original_entropy_score,
                original_dimension_scores: result.original_dimension_scores,
            },
            status: "draft",
        };
        await base44.entities.ContentItem.create(payload);
        toast.success("Saved to content library!");
        onSaved?.();
    };

    const handleCopy = () => {
        const text = result?.final_content;
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col gap-5">
            {/* Mode selector */}
            {!mode && (
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => reset("analyze")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                        <BarChart2 className="w-7 h-7 text-blue-500" />
                        <span className="font-semibold text-slate-700 text-sm">Analyze Content</span>
                        <span className="text-xs text-slate-400 text-center">Score existing content against the 12-dimension framework</span>
                    </button>
                    <button onClick={() => reset("generate")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all group">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                        <span className="font-semibold text-slate-700 text-sm">Generate Content</span>
                        <span className="text-xs text-slate-400 text-center">Create high-entropy content from a topic brief</span>
                    </button>
                    <button onClick={() => reset("rewrite")} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all group">
                        <RefreshCw className="w-7 h-7 text-green-500" />
                        <span className="font-semibold text-slate-700 text-sm">Rewrite Content</span>
                        <span className="text-xs text-slate-400 text-center">Improve weak content using the framework</span>
                    </button>
                </div>
            )}

            {mode && (
                <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Badge className={mode === "analyze" ? "bg-blue-100 text-blue-700" : mode === "generate" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}>
                            {mode === "analyze" ? "Analyze" : mode === "generate" ? "Generate" : "Rewrite"}
                        </Badge>
                        <button onClick={() => setMode(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">← Change mode</button>
                    </div>

                    {/* Common fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
                            <Input placeholder="E.g. Carpet Installation Perth" value={title} onChange={e => setTitle(e.target.value)} />
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
                            <Input placeholder="E.g. Vinyl plank flooring installation for Perth homeowners" value={topic} onChange={e => setTopic(e.target.value)} />
                        </div>
                    )}

                    {(mode === "analyze" || mode === "rewrite") && (
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Content to {mode} *</label>
                            <Textarea placeholder="Paste the content here..." value={inputContent} onChange={e => setInputContent(e.target.value)} className="min-h-[160px] font-mono text-sm" />
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Additional Context <span className="text-slate-400">(optional)</span></label>
                        <Textarea placeholder="E.g. Perth-based flooring company, premium brands, service radius 50km, target: homeowners..." value={contextNotes} onChange={e => setContextNotes(e.target.value)} className="min-h-[60px] text-sm" />
                    </div>

                    <Button onClick={handleRun} disabled={loading} className="bg-slate-800 hover:bg-slate-700 text-white w-full">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : mode === "analyze" ? "Analyze Content" : mode === "generate" ? "Generate Content" : "Rewrite Content"}
                    </Button>

                    {/* Results */}
                    {result && (
                        <div className="flex flex-col gap-5 pt-2 border-t border-slate-100">
                            {/* Entropy */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(result.original_entropy_score !== undefined) && (
                                    <EntropyScoreGauge score={result.original_entropy_score} />
                                )}
                                {(result.entropy_score !== undefined || result.new_entropy_score !== undefined) && (
                                    <EntropyScoreGauge score={result.entropy_score ?? result.new_entropy_score} />
                                )}
                            </div>

                            {/* Problems */}
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

                            {/* Rewrite strategy */}
                            {result.rewrite_strategy && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-blue-700 mb-1">Rewrite Strategy</p>
                                    <p className="text-sm text-blue-800">{result.rewrite_strategy}</p>
                                </div>
                            )}

                            {/* Dimension scores - original */}
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

                            {/* New dimension scores after rewrite */}
                            {result.new_dimension_scores && (
                                <DimensionScores scores={result.new_dimension_scores} title="Improved Scores" />
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