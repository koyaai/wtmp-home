const DIMENSION_LABELS = {
    lexical_diversity: "Lexical Diversity",
    syntactic_burstiness: "Syntactic Burstiness",
    semantic_drift: "Semantic Drift",
    information_gain: "Information Gain",
    cliche_density: "Cliché Density",
    idiomatic_regionalism: "Idiomatic Regionalism",
    proper_noun_density: "Proper Noun Density",
    technical_precision: "Technical Precision",
    emotional_variance: "Emotional Variance",
    nuance_preservation: "Nuance Preservation",
    first_party_evidence: "First-Party Evidence",
    entity_coherence: "Entity Coherence",
};

function ScoreBar({ score }) {
    const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className={`${color} h-1.5 rounded-full`} style={{ width: `${(score / 10) * 100}%` }} />
            </div>
            <span className={`text-xs font-bold w-4 text-right ${score >= 7 ? "text-green-600" : score >= 5 ? "text-yellow-600" : "text-red-500"}`}>{score}</span>
        </div>
    );
}

export default function DimensionScores({ scores, title = "Scores" }) {
    if (!scores) return null;
    return (
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
            <div className="grid grid-cols-1 gap-3">
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                    const dim = scores[key];
                    if (!dim) return null;
                    return (
                        <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-600">{label}</span>
                            </div>
                            <ScoreBar score={dim.score} />
                            {dim.explanation && (
                                <p className="text-xs text-slate-400 mt-0.5">{dim.explanation}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}