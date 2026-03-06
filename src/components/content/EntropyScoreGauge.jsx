export default function EntropyScoreGauge({ score }) {
    const color = score >= 71 ? "text-green-600" : score >= 41 ? "text-yellow-600" : "text-red-500";
    const bg = score >= 71 ? "bg-green-100" : score >= 41 ? "bg-yellow-100" : "bg-red-100";
    const label = score >= 71 ? "High Entropy" : score >= 41 ? "Medium Entropy" : "Low Entropy";
    const barColor = score >= 71 ? "bg-green-500" : score >= 41 ? "bg-yellow-500" : "bg-red-500";

    return (
        <div className={`rounded-xl p-4 ${bg} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Entropy Score</span>
                <span className={`text-2xl font-bold ${color}`}>{score}<span className="text-sm font-normal text-slate-500">/100</span></span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
                <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
            </div>
            <span className={`text-xs font-medium ${color}`}>{label}</span>
        </div>
    );
}