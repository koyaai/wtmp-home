import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import EntropyScoreGauge from "./EntropyScoreGauge";
import DimensionScores from "./DimensionScores";
import { format } from "date-fns";

const MODE_COLORS = {
    generated: "bg-purple-100 text-purple-700",
    analyzed: "bg-blue-100 text-blue-700",
    rewritten: "bg-green-100 text-green-700",
};

const STATUS_COLORS = {
    draft: "bg-slate-100 text-slate-600",
    approved: "bg-green-100 text-green-700",
    published: "bg-blue-100 text-blue-700",
};

function ContentCard({ item, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();

    const handleDelete = async () => {
        if (!confirm("Delete this content item?")) return;
        await base44.entities.ContentItem.delete(item.id);
        queryClient.invalidateQueries({ queryKey: ['contentItems'] });
        toast.success("Deleted");
    };

    const handleStatusChange = async (status) => {
        await base44.entities.ContentItem.update(item.id, { status });
        queryClient.invalidateQueries({ queryKey: ['contentItems'] });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(item.final_content || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-start justify-between p-4 gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={MODE_COLORS[item.mode] || "bg-slate-100 text-slate-600"}>{item.mode}</Badge>
                        {item.content_type && <Badge variant="outline" className="text-xs">{item.content_type}</Badge>}
                        <Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.created_date ? format(new Date(item.created_date), "MMM d, yyyy") : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {item.entropy_score != null && (
                        <div className="text-right">
                            <span className={`text-lg font-bold ${item.entropy_score >= 71 ? "text-green-600" : item.entropy_score >= 41 ? "text-yellow-600" : "text-red-500"}`}>{item.entropy_score}</span>
                            <p className="text-xs text-slate-400">entropy</p>
                        </div>
                    )}
                    <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 p-1">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
                    {/* Status changer */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Status:</span>
                        {["draft", "approved", "published"].map(s => (
                            <button key={s} onClick={() => handleStatusChange(s)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${item.status === s ? "border-slate-400 bg-slate-100 font-medium" : "border-slate-200 hover:border-slate-400"}`}>
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Context */}
                    {item.context_notes && (
                        <div className="bg-slate-50 rounded p-2">
                            <p className="text-xs font-medium text-slate-500 mb-0.5">Context</p>
                            <p className="text-xs text-slate-600">{item.context_notes}</p>
                        </div>
                    )}

                    {/* Problems */}
                    {item.analysis?.top_problems?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Top Problems</p>
                            <ul className="space-y-0.5">
                                {item.analysis.top_problems.map((p, i) => (
                                    <li key={i} className="text-xs text-slate-600 flex gap-1"><span className="text-red-400">•</span>{p}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Scores */}
                    {item.dimension_scores && (
                        <DimensionScores scores={item.dimension_scores} title="Dimension Scores" />
                    )}

                    {/* Final content */}
                    {item.final_content && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-slate-500">Content</p>
                                <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                                    {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                                </button>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {item.final_content}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ContentLibrary({ clientId }) {
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['contentItems', clientId],
        queryFn: () => base44.entities.ContentItem.filter({ client_id: clientId }, "-created_date", 50),
        enabled: !!clientId,
    });

    if (isLoading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;

    if (!items.length) return (
        <div className="text-center py-10 text-slate-400">
            <p className="text-sm">No content saved yet.</p>
            <p className="text-xs mt-1">Use the workspace above to generate, analyze, or rewrite content.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {items.map(item => <ContentCard key={item.id} item={item} />)}
        </div>
    );
}