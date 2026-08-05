import { useState } from "react";
import { Check, X } from "lucide-react";
import { TeamMultiSelect, TEAMS } from "./TrackerItemRow";

function getTeamsArray(item) {
  if (Array.isArray(item.teams) && item.teams.length > 0) return item.teams;
  if (item.team) return [item.team];
  return [];
}

/**
 * Inline form for adding a new red flag or to-do to the tracker.
 * Mirrors the edit layout of TrackerItemRow.
 */
export default function AddTrackerItemForm({ type, onSave, onCancel }) {
  const isFlag = type === "red_flags";
  const [form, setForm] = useState({
    text: "",
    date: "",
    teams: [],
    point_person: "",
    solution: "",
    slack_link: "",
  });

  const handleSave = () => {
    if (!form.text.trim()) return;
    onSave({
      text: form.text.trim(),
      date: form.date || null,
      teams: form.teams,
      team: form.teams[0] || "",
      point_person: form.point_person.trim() || null,
      solution: form.solution.trim() || null,
      slack_link: form.slack_link.trim() || null,
      resolved: false,
    });
  };

  return (
    <tr className="bg-blue-50/60">
      <td colSpan={7} className="px-4 py-3 border-b border-slate-100">
        <div className="space-y-2.5">
          <textarea
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
            rows={2}
            placeholder={isFlag ? "Describe the red flag..." : "Describe the to-do..."}
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            autoFocus
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <TeamMultiSelect
              value={form.teams}
              onChange={teams => setForm(f => ({ ...f, teams }))}
            />
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
            <button
              onClick={handleSave}
              disabled={!form.text.trim()}
              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-md hover:bg-emerald-600 disabled:opacity-40 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}