import { useState } from "react";
import { CheckCircle2, Pencil, Trash2, Check, X, Clock, Calendar } from "lucide-react";
import { format, isPast, differenceInDays, parseISO } from "date-fns";

export const TEAMS = [
  "SEO", "PPC", "Lead Boomerang", "Marketing",
  "Project Management", "Leadership", "Content", "Web Development"
];

const teamColors = {
  "SEO": "bg-emerald-100 text-emerald-700",
  "PPC": "bg-blue-100 text-blue-700",
  "Lead Boomerang": "bg-purple-100 text-purple-700",
  "Marketing": "bg-pink-100 text-pink-700",
  "Project Management": "bg-indigo-100 text-indigo-700",
  "Leadership": "bg-amber-100 text-amber-700",
  "Content": "bg-orange-100 text-orange-700",
  "Web Development": "bg-cyan-100 text-cyan-700",
};

function DeadlineBadge({ date }) {
  if (!date) return null;
  let d;
  try { d = parseISO(date); } catch { return null; }
  const diff = differenceInDays(d, new Date());
  if (isPast(d) && diff < 0) return <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Overdue</span>;
  if (diff <= 3) return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Due in {diff}d</span>;
  return <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(d, "MMM d")}</span>;
}

export default function TrackerItemRow({ item, type, onSave, onDelete, onToggleResolved, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [resolvingFlag, setResolvingFlag] = useState(false);
  const [solutionInput, setSolutionInput] = useState("");
  const [form, setForm] = useState({
    text: item.text || "",
    date: item.date || "",
    team: item.team || "",
    point_person: item.point_person || "",
    solution: item.solution || "",
  });

  const isFlag = type === "red_flags";
  const resolved = item.resolved;

  const handleSave = () => {
    onSave({ ...item, ...form, date: form.date || null });
    setEditing(false);
  };

  const handleResolveClick = () => {
    if (!resolved && isFlag && !item.solution) {
      setResolvingFlag(true);
      return;
    }
    onToggleResolved();
  };

  const handleConfirmSolution = () => {
    if (!solutionInput.trim()) return;
    onSave({ ...item, solution: solutionInput.trim(), resolved: true });
    setResolvingFlag(false);
    setSolutionInput("");
  };

  const containerClass = resolved
    ? "border-slate-200 bg-slate-50"
    : isFlag ? "border-red-100 bg-red-50" : "border-blue-100 bg-blue-50";

  if (editing && canEdit) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm">
        <textarea
          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
          rows={2}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.team}
            onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none"
          >
            <option value="">No team assigned</option>
            {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            placeholder="Point person (optional)"
            value={form.point_person}
            onChange={e => setForm(f => ({ ...f, point_person: e.target.value }))}
            className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
          />
        </div>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none"
        />
        {isFlag && (
          <textarea
            placeholder="Solution / resolution notes (required to resolve)..."
            value={form.solution}
            onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none"
            rows={2}
          />
        )}
        <div className="flex gap-2 items-center">
          <button onClick={handleSave} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-md border hover:bg-slate-50">
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 ml-auto flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border px-3 py-2.5 transition-all ${containerClass}`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={handleResolveClick}
          className="mt-0.5 flex-shrink-0"
          title={!resolved && isFlag && !item.solution ? "A solution is required to resolve this flag" : ""}
        >
          {resolved
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <div className={`w-4 h-4 rounded-full border-2 ${isFlag ? "border-red-400" : "border-blue-400"}`} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${resolved ? "line-through text-slate-400" : isFlag ? "text-red-700" : "text-slate-700"}`}>
            {item.text}
          </p>
          {item.solution && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-md px-2 py-1 mt-1.5 border border-emerald-100">
              ✓ {item.solution}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {item.team && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${teamColors[item.team] || "bg-slate-100 text-slate-600"}`}>
                {item.team}
              </span>
            )}
            {item.point_person && (
              <span className="text-xs text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                @ {item.point_person}
              </span>
            )}
            <DeadlineBadge date={item.date} />
          </div>
        </div>

        {canEdit && (
          <button onClick={() => { setForm({ text: item.text || "", date: item.date || "", team: item.team || "", point_person: item.point_person || "", solution: item.solution || "" }); setEditing(true); }} className="text-slate-300 hover:text-slate-600 flex-shrink-0 mt-0.5 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Inline solution prompt for red flags */}
      {resolvingFlag && (
        <div className="mt-2.5 border-t border-red-200 pt-2.5 space-y-2">
          <p className="text-xs text-red-700 font-medium">A solution is required before marking this resolved:</p>
          <textarea
            autoFocus
            value={solutionInput}
            onChange={e => setSolutionInput(e.target.value)}
            placeholder="Describe what was done to resolve this red flag..."
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={handleConfirmSolution} disabled={!solutionInput.trim()} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 disabled:opacity-40">
              Mark Resolved
            </button>
            <button onClick={() => { setResolvingFlag(false); setSolutionInput(""); }} className="text-xs text-slate-500 px-3 py-1.5 rounded-md border hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}