import { AlertTriangle } from "lucide-react";

export default function GenericPhraseDetection({ data }) {
    if (!data || !data.detected_phrases?.length) return null;

    const count = data.total_detected || data.detected_phrases.length;
    const severity = count >= 6 ? "high" : count >= 3 ? "medium" : "low";

    const styles = {
        high:   { bg: "bg-red-50",    border: "border-red-300",    title: "text-red-700",    badge: "bg-red-100 text-red-700",    icon: "text-red-500" },
        medium: { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-700", badge: "bg-orange-100 text-orange-700", icon: "text-orange-500" },
        low:    { bg: "bg-yellow-50", border: "border-yellow-200", title: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", icon: "text-yellow-500" },
    };
    const s = styles[severity];

    return (
        <div className={`rounded-xl border p-4 space-y-3 ${s.bg} ${s.border}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${s.icon}`} />
                    <p className={`text-xs font-semibold uppercase tracking-wide ${s.title}`}>Generic Phrase Detection</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                    {count} phrase{count !== 1 ? "s" : ""} detected
                </span>
            </div>

            <div className="space-y-2">
                {data.detected_phrases.map((item, i) => (
                    <div key={i} className="bg-white/70 rounded-lg p-2.5 border border-white">
                        <p className="text-xs font-semibold text-slate-700 mb-0.5">
                            "<span className="text-red-600">{item.phrase}</span>"
                        </p>
                        <p className="text-xs text-slate-500 italic mb-1">"{item.sentence}"</p>
                        <p className="text-xs text-slate-600"><span className="font-medium">Why it's weak:</span> {item.reason}</p>
                    </div>
                ))}
            </div>

            {data.scoring_impact && (
                <div className={`text-xs rounded p-2 ${s.badge} bg-opacity-50`}>
                    <span className="font-medium">Scoring impact:</span> {data.scoring_impact}
                </div>
            )}
        </div>
    );
}