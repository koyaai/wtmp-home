import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, AlertCircle, Upload, FileText, X } from "lucide-react";
import { useSlackAnnounce } from "@/hooks/useSlackAnnounce.jsx";

export default function InsightInput({ clientId, clientName, onSaved }) {
  const [mode, setMode] = useState("paste"); // "paste" | "file"
  const [sourceText, setSourceText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null); // { name, url }
  const [sourceType, setSourceType] = useState("Meeting Transcript");
  const [meetingDate, setMeetingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { prompt: promptSlack, toastElement: slackToast } = useSlackAnnounce(clientId);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url });
    } catch (err) {
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    const isFile = mode === "file";
    if (isFile && !uploadedFile) return;
    if (!isFile && !sourceText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = isFile
        ? { file_url: uploadedFile.url }
        : { source_text: sourceText };
      const res = await base44.functions.invoke("extractClientInsight", payload);
      const { summary, todos, requests, red_flags } = res.data;

      // Fold client requests into to-dos so they're tracked and never omitted.
      const allTodos = [
        ...(todos || []),
        ...(requests || []).map(r => `Client request: ${r}`),
      ];

      const storedText = isFile
        ? `[Transcript uploaded from file: ${uploadedFile.name}]`
        : sourceText.length > 20000
          ? sourceText.slice(0, 20000) + `\n\n[Truncated — original was ${sourceText.length.toLocaleString()} characters]`
          : sourceText;

      await base44.entities.ClientInsight.create({
        client_id: clientId,
        client_name: clientName,
        source_text: storedText,
        source_type: sourceType,
        meeting_date: meetingDate || undefined,
        summary,
        todos: allTodos.map(t => ({ text: t, resolved: false, date: null, team: "", point_person: "" })),
        requests,
        red_flags: (red_flags || []).map(f => ({ text: f, resolved: false, date: null, team: "", point_person: "", solution: "" })),
        status: "new"
      });

      promptSlack({
        type: "insight_added",
        text: { source_type: sourceType, meeting_date: meetingDate || null, summary, red_flags, todos: allTodos }
      });

      setSourceText("");
      setUploadedFile(null);
      setMeetingDate("");
      onSaved();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === "file" ? !!uploadedFile : !!sourceText.trim();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Paste Meeting Transcript or Email</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setMode("paste")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${mode === "paste" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Paste Text
          </button>
          <button onClick={() => setMode("file")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${mode === "file" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Upload .txt
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700"><span className="font-semibold">For transcripts 10 pages or longer,</span> use the <span className="font-semibold">Upload .txt</span> tab to avoid errors and ensure the full transcript is processed.</p>
      </div>

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

      {mode === "paste" ? (
        <>
          <Textarea
            placeholder="Paste transcript, email, or call notes here..."
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            className="min-h-[180px] text-sm"
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{sourceText.length.toLocaleString()} characters</span>
            {sourceText.length > 8000 && (
              <span className="text-amber-600 font-medium">
                Long transcript — will be auto-split into {Math.ceil(sourceText.length / 8000)} parts and merged automatically ✓
              </span>
            )}
          </div>
        </>
      ) : (
        <div>
          {uploadedFile ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{uploadedFile.name}</span>
              </div>
              <button onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <input type="file" accept=".txt" className="hidden" onChange={handleFileSelect} disabled={uploading} />
              {uploading ? (
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              ) : (
                <Upload className="w-7 h-7 text-slate-400" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">{uploading ? "Uploading..." : "Click to upload .txt file"}</p>
                <p className="text-xs text-slate-400 mt-0.5">Plain text files only (.txt)</p>
              </div>
            </label>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <Button onClick={handleProcess} disabled={loading || !canSubmit} className="w-full">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Extract Insights</>}
      </Button>
      {slackToast}
    </div>
  );
}