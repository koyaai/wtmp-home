import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const GRADES = ["A", "B", "C", "D", "F"];

const gradeColor = (g) => ({
  A: "bg-emerald-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-amber-400 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
}[g] || "bg-slate-100 text-slate-500");

const gradeTextColor = (g) => ({
  A: "text-emerald-600",
  B: "text-blue-600",
  C: "text-amber-500",
  D: "text-orange-500",
  F: "text-red-600",
}[g] || "text-slate-400");

const METRICS = [
  { key: "attended_meetings", label: "Attended Set Meetings" },
  { key: "responsiveness", label: "Responsiveness & Engagement in Client Portal" },
  { key: "project_posts_submission", label: "Submission of Project Posts" },
  { key: "lead_handling", label: "Lead Handling" },
];

function GradeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {GRADES.map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${value === g ? gradeColor(g) : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function computeOverall(scores) {
  const map = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const reverse = ["F", "D", "C", "B", "A"];
  const vals = METRICS.map(m => map[scores[m.key]]).filter(v => v !== undefined);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return reverse[Math.round(avg)];
}

export default function ClientScore({ clientId, clientName }) {
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [roadblocks, setRoadblocks] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  useEffect(() => { loadScore(); }, [clientId, month, year]);
  useEffect(() => { loadHistory(); }, [clientId]);

  const loadScore = async () => {
    const results = await base44.entities.ClientScore.filter({ client_id: clientId, month, year });
    if (results.length > 0) {
      const r = results[0];
      setScores({ attended_meetings: r.attended_meetings, responsiveness: r.responsiveness, project_posts_submission: r.project_posts_submission, lead_handling: r.lead_handling });
      setNotes(r.notes || "");
      setRoadblocks(r.roadblocks || "");
      setExistingId(r.id);
    } else {
      setScores({});
      setNotes("");
      setRoadblocks("");
      setExistingId(null);
    }
  };

  const loadHistory = async () => {
    const all = await base44.entities.ClientScore.filter({ client_id: clientId }, "-year");
    setHistory(all);
  };

  const overall = computeOverall(scores);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      client_id: clientId,
      client_name: clientName,
      month,
      year,
      ...scores,
      overall_grade: overall,
      notes,
      roadblocks,
      author: user?.email || user?.full_name || "Unknown",
    };
    if (existingId) {
      await base44.entities.ClientScore.update(existingId, payload);
    } else {
      await base44.entities.ClientScore.create(payload);
    }
    toast.success("Score saved!");
    setSaving(false);
    loadHistory();
    loadScore();
  };

  const navigate = (dir) => {
    const idx = MONTHS.indexOf(month);
    let newIdx = idx + dir;
    let newYear = year;
    if (newIdx < 0) { newIdx = 11; newYear -= 1; }
    if (newIdx > 11) { newIdx = 0; newYear += 1; }
    setMonth(MONTHS[newIdx]);
    setYear(newYear);
  };

  return (
    <div className="space-y-5">
      {/* Month Navigator */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-bold text-slate-800">{month} {year}</p>
            <p className="text-xs text-slate-400">Client Score Card</p>
          </div>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Grade */}
        {overall && (
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black ${gradeColor(overall)}`}>
              {overall}
            </div>
          </div>
        )}

        {/* Metric Grades */}
        <div className="space-y-4">
          {METRICS.map(m => (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm text-slate-700">{m.label}</p>
                {scores[m.key] && <span className={`text-sm font-bold ${gradeTextColor(scores[m.key])}`}>{scores[m.key]}</span>}
              </div>
              <GradeSelector value={scores[m.key]} onChange={v => setScores(s => ({ ...s, [m.key]: v }))} />
            </div>
          ))}
        </div>

        {/* Notes + Roadblocks */}
        <div className="mt-5 space-y-3 border-t border-slate-50 pt-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">CSM Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes for this month..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Existing Roadblocks</label>
            <textarea
              value={roadblocks}
              onChange={e => setRoadblocks(e.target.value)}
              rows={3}
              placeholder="Any blockers affecting client performance..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full mt-4 bg-slate-800 hover:bg-slate-700">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : existingId ? "Update Score" : "Save Score"}
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-slate-700">Score History</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{h.month} {h.year}</p>
                  {h.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{h.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {METRICS.map(m => h[m.key] && (
                    <span key={m.key} className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${gradeColor(h[m.key])}`} title={m.label}>
                      {h[m.key]}
                    </span>
                  ))}
                  {h.overall_grade && (
                    <span className={`text-sm font-black w-8 h-8 rounded-lg flex items-center justify-center ml-1 ${gradeColor(h.overall_grade)}`}>
                      {h.overall_grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}