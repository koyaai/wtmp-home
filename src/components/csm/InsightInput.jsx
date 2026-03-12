import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export default function InsightInput({ clientId, clientName, onSaved }) {
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState("Meeting Transcript");
  const [meetingDate, setMeetingDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProcess = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    const res = await base44.functions.invoke("extractClientInsight", { source_text: sourceText });
    const { summary, todos, requests, red_flags } = res.data;

    await base44.entities.ClientInsight.create({
      client_id: clientId,
      client_name: clientName,
      source_text: sourceText,
      source_type: sourceType,
      meeting_date: meetingDate || undefined,
      summary,
      todos: (todos || []).map(t => ({ text: t, resolved: false, date: null, team: "", point_person: "" })),
      requests,
      red_flags: (red_flags || []).map(f => ({ text: f, resolved: false, date: null, team: "", point_person: "", solution: "" })),
      status: "new"
    });

    setSourceText("");
    setMeetingDate("");
    setLoading(false);
    onSaved();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-slate-800">Paste Meeting Transcript or Email</h3>
      <div className="flex gap-3">
        <Select value={sourceType} onValueChange={setSourceType}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Meeting Transcript", "Email", "Call Notes", "Other"].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={meetingDate}
          onChange={e => setMeetingDate(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700"
        />
      </div>
      <Textarea
        placeholder="Paste transcript, email, or call notes here..."
        value={sourceText}
        onChange={e => setSourceText(e.target.value)}
        className="min-h-[180px] text-sm"
      />
      <Button onClick={handleProcess} disabled={loading || !sourceText.trim()} className="w-full">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Extract Insights</>}
      </Button>
    </div>
  );
}