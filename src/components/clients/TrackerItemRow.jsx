import { useState } from "react";
import { CheckCircle2, Pencil, Trash2, Check, X, Clock, Calendar, Link2 } from "lucide-react";
import { format, isPast, differenceInDays, parseISO } from "date-fns";

export const TEAMS = [
  "SEO", "PPC", "Lead Boomerang", "Marketing",
  "Project Management", "Leadership", "Content", "Web Development", "Customer Success"
];

export const teamColors = {
  "SEO": "bg-emerald-100 text-emerald-700",
  "PPC": "bg-blue-100 text-blue-700",
  "Lead Boomerang": "bg-purple-100 text-purple-700",
  "Marketing": "bg-pink-100 text-pink-700",
  "Project Management": "bg-indigo-100 text-indigo-700",
  "Leadership": "bg-amber-100 text-amber-700",
  "Content": "bg-orange-100 text-orange-700",
  "Web Development": "bg-cyan-100 text-cyan-700",
  "Customer Success": "bg-teal-100 text-teal-700",
};

export function DeadlineBadge({ date }) {
  if (!date) return <span className="text-slate-300 text-xs">—</span>;
  let d;
  try { d = parseISO(date); } catch { return null; }
  const diff = differenceInDays(d, new Date());
  if (isPast(d) && diff < 0) return <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Clock className="w-3 h-3" />Overdue</span>;
  if (diff <= 3) return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Clock className="w-3 h-3" />Due in {diff}d</span>;
  return <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{format(d, "MMM d, yyyy")}</span>;
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
    slack_link: item.slack_link || "",
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

  const rowBg = resolved ? "bg-slate-50" : isFlag ? "bg-red-50/40" : "bg-white";

  if (editing && canEdit) {
    return (
      <tr className="bg-blue-50/60">
        <td colSpan={6} className="px-4 py-3">
          <div className="space-y-2.5">
            <textarea
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              rows={2}
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={form.team}
                onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                className="border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none col-span-1"
              >
                <option value="">No team assigned</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                placeholder="Point person"
                value={form.point_person}
                onChange={e => setForm(f => ({ ...f, point_person: e.target.value }))}
                className="border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
              />
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
              />
              {isFlag && (
                <input
                  placeholder="Solution / resolution notes"
                  value={form.solution}
                  onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
                  className="border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
                />
              )}
              <input
                placeholder="Slack thread link (optional)"
                value={form.slack_link}
                onChange={e => setForm(f => ({ ...f, slack_link: e.target.value }))}
                className="border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none col-span-2"
              />
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={handleSave} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50">
                Cancel
              </button>
              {onDelete && (
                <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 ml-auto flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors group ${rowBg}`}>
        {/* Resolve checkbox */}
        <td className="pl-4 pr-2 py-3 w-8">
          <button
            onClick={handleResolveClick}
            title={!resolved && isFlag && !item.solution ? "Add a solution to resolve" : ""}
            className="flex-shrink-0"
          >
            {resolved
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <div className={`w-4 h-4 rounded-full border-2 ${isFlag ? "border-red-400" : "border-blue-400"}`} />
            }
          </button>
        </td>

        {/* Task text */}
        <td className="px-3 py-3">
          <p className={`text-sm leading-snug ${resolved ? "line-through text-slate-400" : isFlag ? "text-red-700 font-medium" : "text-slate-700"}`}>
            {item.text}
          </p>
          {item.solution && (
            <p className="text-xs text-emerald-700 mt-1">✓ {item.solution}</p>
          )}
        </td>

        {/* Team */}
        <td className="px-3 py-3 w-36">
          {item.team
            ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${teamColors[item.team] || "bg-slate-100 text-slate-600"}`}>{item.team}</span>
            : <span className="text-slate-300 text-xs">—</span>
          }
        </td>

        {/* Point Person */}
        <td className="px-3 py-3 w-32">
          {item.point_person
            ? <span className="text-xs text-slate-600 font-medium">{item.point_person}</span>
            : <span className="text-slate-300 text-xs">—</span>
          }
        </td>

        {/* Deadline */}
        <td className="px-3 py-3 w-32">
          <DeadlineBadge date={item.date} />
        </td>

        {/* Slack */}
        <td className="px-3 py-3 w-10 text-center">
          {item.slack_link ? (
            <a href={item.slack_link} target="_blank" rel="noopener noreferrer" title="Open Slack thread" className="inline-flex items-center justify-center text-purple-400 hover:text-purple-600 transition-colors">
              <Link2 className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-slate-200 text-xs">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="pr-4 pl-2 py-3 w-8 text-right">
          {canEdit && (
            <button
              onClick={() => { setForm({ text: item.text || "", date: item.date || "", team: item.team || "", point_person: item.point_person || "", solution: item.solution || "", slack_link: item.slack_link || "" }); setEditing(true); }}
              className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>

      {/* Inline solution prompt for red flags */}
      {resolvingFlag && (
        <tr className="bg-red-50">
          <td colSpan={6} className="px-4 py-3 border-b border-red-100">
            <p className="text-xs text-red-700 font-medium mb-2">A solution is required before marking this resolved:</p>
            <textarea
              autoFocus
              value={solutionInput}
              onChange={e => setSolutionInput(e.target.value)}
              placeholder="Describe what was done to resolve this red flag..."
              className="w-full border border-red-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none bg-white"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleConfirmSolution} disabled={!solutionInput.trim()} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 disabled:opacity-40">
                Mark Resolved
              </button>
              <button onClick={() => { setResolvingFlag(false); setSolutionInput(""); }} className="text-xs text-slate-500 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}