export default function EntropyHeatmap({ heatmap }) {
    if (!heatmap?.length) return null;

    const levelConfig = {
        high:     { emoji: "🟢", label: "High Value",        bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700" },
        moderate: { emoji: "🟡", label: "Moderate Value",    bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
        low:      { emoji: "🔴", label: "Generic / Low",     bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700" },
    };

    return (
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Entropy Heatmap</p>
            <div className="space-y-2">
                {heatmap.map((item, i) => {
                    const cfg = levelConfig[item.level] || levelConfig.moderate;
                    return (
                        <div key={i} className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
                            <div className="flex items-start gap-2">
                                <span className="text-sm flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate italic">"{item.paragraph}..."</p>
                                    {item.issue && (
                                        <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Issue:</span> {item.issue}</p>
                                    )}
                                    {item.improvement && (
                                        <p className={`text-xs mt-0.5 ${cfg.text}`}><span className="font-medium">Fix:</span> {item.improvement}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}