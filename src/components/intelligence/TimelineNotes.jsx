import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export default function TimelineNotes({ contact, user, onSave }) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const notes = contact.timeline_notes || [];
  const sorted = [...notes].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const add = async () => {
    if (!note.trim()) return;
    const entry = { date, note: note.trim(), author: user?.full_name || user?.email || "" };
    await onSave([...notes, entry]);
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
  };
  const remove = async (idx) => {
    await onSave(notes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add an interaction note…" className="w-full text-sm border border-slate-200 rounded-lg p-2 resize-y" />
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5" />
          <Button size="sm" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add Note</Button>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No notes yet.</p>}
        {sorted.map((n) => {
          const originalIdx = notes.indexOf(n);
          return (
            <div key={originalIdx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-blue-600">{n.date}</span>
                  {n.author && <span className="text-xs text-slate-400">· {n.author}</span>}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.note}</p>
              </div>
              <button onClick={() => remove(originalIdx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}