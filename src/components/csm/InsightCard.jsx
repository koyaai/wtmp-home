import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckSquare, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, Trash2, Archive, Pencil, Check, X, Plus, RotateCcw } from "lucide-react";
import { TEAMS } from "@/components/clients/TrackerItemRow";
import DeletedItemsModal from "./DeletedItemsModal";
import { format, isPast, differenceInDays, parseISO } from "date-fns";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-500"
};

const sourceColors = {
  "Meeting Transcript": "bg-purple-100 text-purple-700",
  "Email": "bg-yellow-100 text-yellow-700",
  "Call Notes": "bg-indigo-100 text-indigo-700",
  "Other": "bg-slate-100 text-slate-600"
};

function normalizeItem(item) {
  if (typeof item === "string") return { text: item, date: null, resolved: false };
  return item;
}

function DeadlineBadge({ date }) {
  if (!date) return null;
  const d = parseISO(date);
  const diff = differenceInDays(d, new Date());
  if (isPast(d) && diff < 0) return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>;
  if (diff <= 3) return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Due in {diff}d</span>;
  return <span className="text-xs text-slate-400">{format(d, "MMM d")}</span>;
}

function EditableItem({ item, onSave, onDelete, colorScheme, isFlag }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ text: item.text, date: item.date || "", team: item.team || "", point_person: item.point_person || "" });

  const save = () => {
    onSave({ ...item, ...form, date: form.date || null });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className={`text-sm rounded-lg border px-3 py-2 space-y-2 ${colorScheme.bg}`}>
        <input className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-1.5">
          <select value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} className="border border-slate-200 rounded px-2 py-1 text-xs bg-white">
            <option value="">No team</option>
            {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Point person" value={form.point_person} onChange={e => setForm(f => ({ ...f, point_person: e.target.value }))} className="border border-slate-200 rounded px-2 py-1 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border border-slate-200 rounded px-2 py-1 text-xs bg-white" />
          <button onClick={save} className="text-emerald-600 hover:text-emerald-800"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-2 text-sm rounded-lg border px-3 py-2 group ${colorScheme.bg}`}>
      <div className="flex-1 min-w-0">
        <span className={colorScheme.text}>{item.text}</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {item.team && <span className="text-xs bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{item.team}</span>}
          {item.point_person && <span className="text-xs text-slate-400">@ {item.point_person}</span>}
          <DeadlineBadge date={item.date} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-600"><Pencil className="w-3 h-3" /></button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
      </div>
    </li>
  );
}

export default function InsightCard({ insight, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const updateItems = async (field, newItems) => {
    await base44.entities.ClientInsight.update(insight.id, {
      [field]: newItems,
      last_tracker_activity: new Date().toISOString(),
    });
    onUpdate();
  };

  const handleItemSave = (field, index, newItem) => {
    const items = (insight[field] || []).map(normalizeItem);
    items[index] = newItem;
    updateItems(field, items);
  };

  const handleItemDelete = (field, index) => {
    const items = (insight[field] || []).map(normalizeItem);
    items[index] = { ...items[index], deleted: true, deleted_at: new Date().toISOString() };
    updateItems(field, items);
  };

  const handleItemRestore = (field, index) => {
    const items = (insight[field] || []).map(normalizeItem);
    const { deleted, deleted_at, ...rest } = items[index];
    items[index] = rest;
    updateItems(field, items);
  };

  const handleItemPermanentDelete = (field, index) => {
    const items = (insight[field] || []).map(normalizeItem).filter((_, i) => i !== index);
    updateItems(field, items);
  };

  const handleAddItem = (field) => {
    const items = (insight[field] || []).map(normalizeItem);
    items.push({ text: "New item", date: null, resolved: false });
    updateItems(field, items);
  };

  const handleStatus = async (status) => {
    await base44.entities.ClientInsight.update(insight.id, { status });
    onUpdate();
  };

  const handleDelete = async () => {
    await base44.entities.ClientInsight.delete(insight.id);
    onUpdate();
  };

  const allTodos = (insight.todos || []).map(normalizeItem).map((item, index) => ({ ...item, _index: index }));
  const allRedFlags = (insight.red_flags || []).map(normalizeItem).map((item, index) => ({ ...item, _index: index }));
  const todos = allTodos.filter(t => !t.deleted);
  const redFlags = allRedFlags.filter(f => !f.deleted);
  const deletedTodos = allTodos.filter(t => t.deleted);
  const deletedRedFlags = allRedFlags.filter(f => f.deleted);
  const deletedCount = deletedTodos.length + deletedRedFlags.length;
  const deleteCount = redFlags.length + todos.length + (insight.requests?.length || 0);

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${insight.status === "archived" ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceColors[insight.source_type] || "bg-slate-100 text-slate-600"}`}>
              {insight.source_type}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[insight.status]}`}>{insight.status}</span>
            {insight.meeting_date && (
              <span className="text-xs text-slate-400">{format(new Date(insight.meeting_date), "MMM d, yyyy")}</span>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{insight.summary || "No summary available."}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {redFlags.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {redFlags.length}
            </span>
          )}
          {todos.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
              <CheckSquare className="w-3 h-3" /> {todos.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">

          {/* Red Flags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" /> Red Flags
              </div>
              <button onClick={() => handleAddItem("red_flags")} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {redFlags.length === 0 ? <p className="text-xs text-slate-400">None</p> : (
              <ul className="space-y-1">
                {redFlags.map((flag) => (
                  <EditableItem
                    key={flag._index} item={flag}
                    colorScheme={{ bg: "bg-red-50 border-red-100", text: "text-red-700" }}
                    onSave={(newItem) => handleItemSave("red_flags", flag._index, newItem)}
                    onDelete={() => handleItemDelete("red_flags", flag._index)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* To-Dos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                <CheckSquare className="w-4 h-4" /> To-Dos
              </div>
              <button onClick={() => handleAddItem("todos")} className="text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {todos.length === 0 ? <p className="text-xs text-slate-400">None</p> : (
              <ul className="space-y-1">
                {todos.map((todo) => (
                  <EditableItem
                    key={todo._index} item={todo}
                    colorScheme={{ bg: "bg-blue-50 border-blue-100", text: "text-slate-700" }}
                    onSave={(newItem) => handleItemSave("todos", todo._index, newItem)}
                    onDelete={() => handleItemDelete("todos", todo._index)}
                  />
                ))}
              </ul>
            )}
          </div>

          {deletedCount > 0 && (
            <button
              onClick={() => setShowDeleted(true)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> View deleted items ({deletedCount})
            </button>
          )}

          {/* Requests */}
          {insight.requests?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-2">
                <MessageSquare className="w-4 h-4" /> Client Requests
              </div>
              <ul className="space-y-1">
                {insight.requests.map((req, i) => (
                  <li key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{req}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.source_text && (
            <details className="text-xs text-slate-400 cursor-pointer">
              <summary className="hover:text-slate-600">View original text</summary>
              <p className="mt-2 text-slate-500 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{insight.source_text}</p>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            {insight.status !== "reviewed" && (
              <Button size="sm" variant="outline" onClick={() => handleStatus("reviewed")}>Mark Reviewed</Button>
            )}
            {insight.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={() => handleStatus("archived")}>
                <Archive className="w-3 h-3" /> Archive
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 ml-auto">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this insight?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the transcript and all items it created
                    {deleteCount > 0 ? ` — ${redFlags.length} red flag${redFlags.length !== 1 ? "s" : ""}, ${todos.length} to-do${todos.length !== 1 ? "s" : ""}${insight.requests?.length ? `, ${insight.requests.length} request${insight.requests.length !== 1 ? "s" : ""}` : ""}.` : "."} They will also be removed from the client tracker.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <DeletedItemsModal
            open={showDeleted}
            onClose={() => setShowDeleted(false)}
            redFlags={deletedRedFlags}
            todos={deletedTodos}
            onRestore={handleItemRestore}
            onPermanentDelete={handleItemPermanentDelete}
          />
        </div>
      )}
    </div>
  );
}