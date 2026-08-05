import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Calendar, ChevronDown, ChevronUp, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSlackAnnounce } from "@/hooks/useSlackAnnounce.jsx";

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
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const { prompt: promptSlack, toastElement: slackToast } = useSlackAnnounce(clientId);

  useEffect(() => {
    base44.entities.MeetingNote.filter({ client_id: clientId }, "-meeting_date").then(setNotes);
  }, [clientId]);

  const handleSave = async (data) => {
    const isNew = !data.id;
    if (data.id) {
      await base44.entities.MeetingNote.update(data.id, data);
    } else {
      await base44.entities.MeetingNote.create(data);
    }
    setShowForm(false);
    base44.entities.MeetingNote.filter({ client_id: clientId }, "-meeting_date").then(setNotes);
    if (isNew) {
      promptSlack({ type: "meeting_note", text: data });
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.MeetingNote.delete(id);
    setNotes(notes.filter(n => n.id !== id));
  };

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const kw = search.toLowerCase();
    return notes.filter(n => n.title?.toLowerCase().includes(kw) || n.summary?.toLowerCase().includes(kw));
  }, [notes, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {canEdit && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Meeting Note
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          />
        </div>
      </div>

      {showForm && <NoteForm clientId={clientId} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      {filteredNotes.map(note => (
        <div key={note.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {editingId === note.id ? (
            <div className="p-4">
              <NoteForm
                clientId={clientId}
                initial={note}
                onSave={async (data) => { await handleSave(data); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <>
              <button
                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{note.title}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.meeting_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {note.next_meeting_date && ` · Next: ${new Date(note.next_meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {canEdit && (
                    <button onClick={e => { e.stopPropagation(); setEditingId(note.id); setExpandedId(null); }} className="text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(note.id); }} className="text-slate-300 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {expandedId === note.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedId === note.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
                  {note.attendees && <p className="text-xs text-slate-500"><span className="font-medium">Attendees:</span> {note.attendees}</p>}
                  {note.summary && <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.summary}</p>}
                  {note.action_items && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Action Items</p>
                      <p className="text-xs text-amber-800 whitespace-pre-wrap">{note.action_items}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {filteredNotes.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-400 text-sm">
          {search ? "No meetings match your search." : "No meeting notes yet."}
        </div>
      )}
      {slackToast}
    </div>
  );
}