import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

function NoteForm({ clientId, initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    client_id: clientId, title: "", meeting_date: "", attendees: "",
    summary: "", action_items: "", next_meeting_date: "",
    ...initial
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600">Title *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Meeting Date *</label>
          <input type="date" value={form.meeting_date} onChange={e => set("meeting_date", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Next Meeting</label>
          <input type="date" value={form.next_meeting_date || ""} onChange={e => set("next_meeting_date", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600">Attendees</label>
          <input value={form.attendees || ""} onChange={e => set("attendees", e.target.value)} placeholder="John, Sarah, Client..."
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600">Summary</label>
          <textarea value={form.summary || ""} onChange={e => set("summary", e.target.value)} rows={3}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600">Action Items</label>
          <textarea value={form.action_items || ""} onChange={e => set("action_items", e.target.value)} rows={2}
            placeholder="- Item 1&#10;- Item 2"
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => { if (form.title && form.meeting_date) onSave(form); }}>
          Save Note
        </Button>
      </div>
    </div>
  );
}

export default function MeetingNotes({ clientId, canEdit }) {
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    base44.entities.MeetingNote.filter({ client_id: clientId }, "-meeting_date").then(setNotes);
  }, [clientId]);

  const handleSave = async (data) => {
    if (data.id) {
      await base44.entities.MeetingNote.update(data.id, data);
    } else {
      await base44.entities.MeetingNote.create(data);
    }
    setShowForm(false);
    base44.entities.MeetingNote.filter({ client_id: clientId }, "-meeting_date").then(setNotes);
  };

  const handleDelete = async (id) => {
    await base44.entities.MeetingNote.delete(id);
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-3">
      {canEdit && !showForm && (
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Meeting Note
        </Button>
      )}
      {showForm && <NoteForm clientId={clientId} onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {notes.map(note => (
        <div key={note.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-sm">{note.title}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(note.meeting_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {note.next_meeting_date && ` · Next: ${new Date(note.next_meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            </div>
            {canEdit && (
              <button onClick={() => handleDelete(note.id)} className="text-slate-300 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {note.attendees && <p className="text-xs text-slate-500 mt-2"><span className="font-medium">Attendees:</span> {note.attendees}</p>}
          {note.summary && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{note.summary}</p>}
          {note.action_items && (
            <div className="mt-2 bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Action Items</p>
              <p className="text-xs text-amber-800 whitespace-pre-wrap">{note.action_items}</p>
            </div>
          )}
        </div>
      ))}
      {notes.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-400 text-sm">No meeting notes yet.</div>
      )}
    </div>
  );
}