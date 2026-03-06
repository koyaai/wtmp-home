export default function CompetitorAnalysis({ analysis }) {
    if (!analysis) return null;

    return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Competitor Information Gain Analysis</p>

            {analysis.competitor_coverage?.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">What Competitors Cover</p>
                    <ul className="space-y-0.5">
                        {analysis.competitor_coverage.map((t, i) => (
                            <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-slate-400 mt-0.5">•</span>{t}</li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.competitor_weakness_patterns?.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Competitor Weaknesses</p>
                    <ul className="space-y-0.5">
                        {analysis.competitor_weakness_patterns.map((w, i) => (
                            <li key={i} className="text-xs text-red-700 flex gap-1.5"><span className="text-red-400 mt-0.5">⚠</span>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.information_gain_opportunities?.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Information Gain Opportunities</p>
                    <ul className="space-y-0.5">
                        {analysis.information_gain_opportunities.map((o, i) => (
                            <li key={i} className="text-xs text-green-700 flex gap-1.5"><span className="text-green-500 mt-0.5">✦</span>{o}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}