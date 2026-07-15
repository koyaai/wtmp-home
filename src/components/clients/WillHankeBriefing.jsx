import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, AlertTriangle, Trophy, MessageSquareQuote, Calendar } from "lucide-react";

/**
 * Will Hanke Button — one-press "catch up on this client" briefing.
 * Summarizes the most recent Client Memory data (mentions, issues, wins, requests)
 * so a team member walks into a meeting fully briefed.
 */
export default function WillHankeBriefing({ clientName, insights }) {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);

  const handleCatchUp = async () => {
    if (!insights.length) {
      setError("No memory records for this client yet.");
      setBriefing(null);
      return;
    }
    setLoading(true);
    setError(null);
    setBriefing(null);

    // Use the most recent ~15 records for a focused, up-to-date briefing
    const recent = insights.slice(0, 15);
    const context = recent.map(ins => `[${ins.meeting_date || "undated"} — ${ins.source_type || "Other"}${ins.status ? ` / ${ins.status}` : ""}]\nSummary: ${ins.summary || "(no summary)"}\nClient Requests: ${(ins.requests || []).join("; ") || "—"}\nOpen Todos: ${(ins.todos || []).map(t => `${t.text}${t.resolved ? " (done)" : ""}`).join("; ") || "—"}\nRed Flags: ${(ins.red_flags || []).map(f => `${f.text}${f.solution ? ` — solution: ${f.solution}` : ""}`).join("; ") || "—"}`).join("\n\n---\n\n");

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior account manager preparing a colleague for a client meeting. The colleague needs to be "caught up" on ${clientName} in under a minute.

Below is the recent client memory (meeting notes, transcripts, emails) ordered most-recent first. Synthesize it into a concise verbal briefing a person could read in 60 seconds before walking into a meeting with this client.

CLIENT MEMORY:
${context}

Produce the briefing with these short sections (use markdown):
1. **Where Things Stand** — 2-3 sentences on overall relationship status and momentum.
2. **Recent Wins** — bullet list of positive developments, completed work, or compliments. If none, say "No recent wins logged."
3. **Open Issues & Red Flags** — bullet list of unresolved problems or concerns the client raised. If none, say "No open issues."
4. **What They've Asked For** — bullet list of outstanding client requests still pending. If none, say "No pending requests."
5. **Talk About This** — 2-3 suggested talking points or topics to bring up based on recent history.

Rules:
- Be specific: reference dates, names, and exact details from the memory.
- Only use information from the provided memory. Do not invent or assume.
- Keep each bullet to one line.
- If memory is thin or old, say so plainly in "Where Things Stand".`,
      });
      setBriefing(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    } catch (e) {
      setError(e.message || "Failed to generate briefing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">I need to catch up with this client</p>
            <p className="text-xs text-amber-700">One-press briefing from recent client memory — walk into the meeting ready.</p>
          </div>
        </div>
        <Button
          onClick={handleCatchUp}
          disabled={loading}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" fill="white" />}
          {loading ? "Briefing…" : "Press the Will Button!"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {briefing && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <Calendar className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">Catch-Up Briefing — {clientName}</p>
          </div>
          <div className="px-5 py-4 prose prose-sm max-w-none text-slate-700">
            {briefing.split(/\n(?=#{1,3}\s|\*\*)/).map((section, i) => (
              <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-slate-100" : ""}>
                <RenderSection text={section} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight markdown-ish renderer: bold headers, bullets, **bold** spans
function RenderSection({ text }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Section header (## or ### or **Header**)
        if (/^#{1,3}\s/.test(trimmed) || /^\*\*[^*]+\*\*:?$/) {
          const clean = trimmed.replace(/^#{1,3}\s/, "").replace(/^\*\*|\*\*:?$/g, "");
          const icon = pickIcon(clean);
          return (
            <p key={i} className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1.5">
              {icon}
              {clean.replace(/:$/, "")}
            </p>
          );
        }

        // Bullet
        if (/^[-*]\s/.test(trimmed)) {
          const content = trimmed.replace(/^[-*]\s/, "");
          return (
            <p key={i} className="flex items-start gap-2 text-sm text-slate-600 ml-1 mb-1">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
            </p>
          );
        }

        // Paragraph
        return (
          <p key={i} className="text-sm text-slate-600 leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />
        );
      })}
    </div>
  );
}

function pickIcon(header) {
  const h = header.toLowerCase();
  if (h.includes("win")) return <Trophy className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (h.includes("issue") || h.includes("red flag")) return <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (h.includes("ask") || h.includes("request")) return <MessageSquareQuote className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  if (h.includes("talk") || h.includes("stand")) return <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return null;
}

function boldify(text) {
  // Escape HTML then re-apply **bold**
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>');
}