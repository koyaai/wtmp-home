import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, Send, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "What is the prevailing reason why clients churn?",
  "Are there specific red flags to look out for in clients that churn?",
  "Which services or programs appear most in churned clients?",
  "What patterns do churned clients share in common?",
];

export default function PostMortemAIQuery({ postMortems }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (q) => {
    const prompt = (q || query).trim();
    if (!prompt || postMortems.length === 0) return;
    setQuery(prompt);
    setLoading(true);
    setAnswer(null);

    const context = postMortems.map(pm =>
      `[${pm.client_name} — ${pm.reason} — offboarded ${pm.offboarding_date || "unknown"}]\n${pm.summary_notes || "(no notes)"}`
    ).join("\n\n---\n\n");

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an analyst reviewing a marketing agency's post-mortem archive — records documenting why clients were offboarded and the lessons learned. Below are all ${postMortems.length} post-mortem records.\n\n${context}\n\n---\n\nQuestion: ${prompt}\n\nAnswer based only on the provided post-mortem records. Be specific — cite client names, reasons, and dates when relevant. Group findings into clear themes. If the records don't contain enough info to answer, say so.`,
      });
      setAnswer(result);
    } catch (err) {
      setAnswer("Sorry, I couldn't process that query right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
          <Brain className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Ask the Archive</h3>
          <p className="text-xs text-slate-500">AI analysis across all {postMortems.length} post-mortem record{postMortems.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAsk()}
          placeholder="Ask about churn reasons, red flags, patterns…"
          className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Ask
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleAsk(s)}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing the archive…
        </div>
      )}

      {answer && !loading && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}