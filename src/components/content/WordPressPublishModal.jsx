import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Globe, ExternalLink, CheckCircle2, AlertCircle, X, Calendar, Send, FileText } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
    { value: "draft", label: "Save as Draft", icon: FileText, description: "Saved to WordPress but not visible to visitors" },
    { value: "publish", label: "Publish Now", icon: Send, description: "Goes live immediately on the client's site" },
    { value: "schedule", label: "Schedule", icon: Calendar, description: "Set a future date and time to publish" },
];

export default function WordPressPublishModal({ item, client, onClose, defaultPostType = "post" }) {
    const [postType, setPostType] = useState(defaultPostType);
    const [publishStatus, setPublishStatus] = useState("draft");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("09:00");
    const [titleOverride, setTitleOverride] = useState(item.title || "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const hasWpConfig = client?.wordpress_url && client?.wordpress_username && client?.wordpress_app_password;

    const handlePublish = async () => {
        if (!titleOverride.trim()) { toast.error("Title is required"); return; }
        if (publishStatus === "schedule" && !scheduledDate) { toast.error("Please select a scheduled date"); return; }

        setLoading(true);
        setError(null);

        let scheduled_date = null;
        if (publishStatus === "schedule") {
            scheduled_date = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
        }

        try {
            const res = await base44.functions.invoke('wpPublish', {
                client_id: client.id,
                title: titleOverride,
                content: item.final_content,
                status: publishStatus,
                scheduled_date,
                post_type: postType,
            });

            if (res.data?.error) {
                setError(res.data.error);
            } else {
                setResult(res.data);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-sm">Publish to WordPress</h2>
                            <p className="text-xs text-slate-400">{client.name} — {client.wordpress_url}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!hasWpConfig ? (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">WordPress not configured</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Go to <strong>Clients → {client.name} → Edit</strong> and add the WordPress URL, username, and application password to enable publishing.
                                </p>
                            </div>
                        </div>
                    ) : result ? (
                        /* Success state */
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-800">
                                    {result.post_status === "draft" ? "Saved as Draft!" :
                                     result.post_status === "future" ? "Scheduled!" : "Published!"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Post ID: {result.post_id}</p>
                            </div>
                            <div className="flex gap-2 w-full">
                                {result.post_status === "publish" && (
                                    <a href={result.post_url} target="_blank" rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 text-sm bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 font-medium">
                                        <ExternalLink className="w-4 h-4" /> View Post
                                    </a>
                                )}
                                <a href={result.edit_url} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 text-sm border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium">
                                    <ExternalLink className="w-4 h-4" /> Edit in WP
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Post Type toggle */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Content Type</label>
                                <div className="flex gap-2">
                                    {[{value: "post", label: "Blog Post / Article"}, {value: "page", label: "Page"}].map(opt => (
                                        <button key={opt.value} onClick={() => setPostType(opt.value)}
                                            className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 font-medium transition-all ${
                                                postType === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title override */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">{postType === "page" ? "Page" : "Post"} Title</label>
                                <Input value={titleOverride} onChange={e => setTitleOverride(e.target.value)} placeholder="Title..." />
                            </div>

                            {/* Publish status selection */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-2 block">Publish Action</label>
                                <div className="space-y-2">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setPublishStatus(opt.value)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${publishStatus === opt.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                                            <opt.icon className={`w-4 h-4 flex-shrink-0 ${publishStatus === opt.value ? "text-blue-600" : "text-slate-400"}`} />
                                            <div>
                                                <p className={`text-sm font-semibold ${publishStatus === opt.value ? "text-blue-700" : "text-slate-700"}`}>{opt.label}</p>
                                                <p className="text-xs text-slate-400">{opt.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Schedule date/time */}
                            {publishStatus === "schedule" && (
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
                                        <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split("T")[0]}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Time</label>
                                        <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>
                            )}

                            {/* Content preview */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-28 overflow-y-auto">
                                <p className="text-xs font-semibold text-slate-400 mb-1">Content Preview</p>
                                <p className="text-xs text-slate-600 line-clamp-4 whitespace-pre-wrap">{item.final_content?.slice(0, 300)}...</p>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                                <Button onClick={handlePublish} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send to WordPress"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}