import { ShieldAlert, ShieldCheck } from "lucide-react";

const CLAIM_TYPE_STYLES = {
    "Absolute Claim":   { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200" },
    "Statistical Claim":{ bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
    "Authority Claim":  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
    "Process Claim":    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
};

export default function ClaimVerifiability({ data }) {
    if (!data || !data.detected_claims?.length) return null;

    const count = data.total_detected || data.detected_claims.length;
    const severity = count >= 6 ? "high" : count >= 3 ? "medium" : "low";

    const containerStyles = {
        high:   { bg: "bg-red-50",    border: "border-red-300",    icon: "text-red-500",    badge: "bg-red-100 text-red-700" },
        medium: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-500",  badge: "bg-amber-100 text-amber-700" },
        low:    { bg: "bg-slate-50",  border: "border-slate-200",  icon: "text-slate-400",  badge: "bg-slate-100 text-slate-600" },
    };
    const s = containerStyles[severity];

    return (
        <div className={`rounded-xl border p-4 space-y-3 ${s.bg} ${s.border}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${s.icon}`} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Claim Verifiability Review
                    </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                    {count} unverifiable claim{count !== 1 ? "s" : ""}
                </span>
            </div>

            <div className="space-y-3">
                {data.detected_claims.map((item, i) => {
                    const typeStyle = CLAIM_TYPE_STYLES[item.claim_type] || CLAIM_TYPE_STYLES["Absolute Claim"];
                    return (
                        <div key={i} className="bg-white/80 rounded-lg p-3 border border-white shadow-sm space-y-2">
                            {/* Claim type badge + original claim */}
                            <div className="flex items-start gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                                    {item.claim_type}
                                </span>
                                <p className="text-xs text-slate-700 font-medium italic leading-snug">
                                    "{item.claim}"
                                </p>
                            </div>

                            {/* Issue */}
                            <div className="flex gap-1.5">
                                <span className="text-xs text-red-500 font-semibold flex-shrink-0">Issue:</span>
                                <p className="text-xs text-slate-600">{item.issue}</p>
                            </div>

                            {/* Suggested improvement */}
                            <div className="bg-green-50 border border-green-200 rounded-md p-2 flex gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-green-700 mb-0.5">Suggested Improvement</p>
                                    <p className="text-xs text-green-800">{item.suggested_improvement}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {data.scoring_impact && (
                <div className="text-xs rounded p-2 bg-slate-100 text-slate-600 border border-slate-200">
                    <span className="font-medium">Scoring impact:</span> {data.scoring_impact}
                </div>
            )}
        </div>
    );
}