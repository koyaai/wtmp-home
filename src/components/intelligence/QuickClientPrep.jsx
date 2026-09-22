import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

const BLOCKS = {
  how_to_approach: { title: "How to Approach", bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-indigo-100" },
  do_appreciate: { title: "Do / Appreciate", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-100" },
  frustrates_them: { title: "Frustrates Them", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-100" },
  avoid: { title: "Avoid", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-100" },
  pinned: { title: "Pinned Things to Know", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", border: "border-violet-100" },
};

function EditableListBlock({ block, items, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const startEdit = () => { setText((items || []).join("\n")); setEditing(true); };
  const save = () => {
    onSave(text.split("\n").map((s) => s.trim()).filter(Boolean));
    setEditing(false);
  };
  const list = items || [];
  const shown = expanded ? list : list.slice(0, 3);
  const hidden = list.length - shown.length;
  return (
    <div className={`${block.bg} ${block.border} border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs font-bold uppercase tracking-wide ${block.text}`}>{block.title}</h4>
        {!editing ? (
          <button onClick={startEdit} className="text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
        ) : (
          <div className="flex gap-1">
            <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full text-sm bg-white/70 rounded-lg p-2 border border-white resize-y" placeholder="One item per line" />
      ) : (
        <ul className="space-y-1.5">
          {shown.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className={`w-1.5 h-1.5 rounded-full ${block.dot} mt-1.5 flex-shrink-0`} />
              <span>{it}</span>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm text-slate-400 italic">No items yet</li>}
          {!expanded && hidden > 0 && (
            <li><button onClick={() => setExpanded(true)} className={`text-xs ${block.text} font-medium hover:underline`}>+{hidden} more</button></li>
          )}
          {expanded && list.length > 3 && (
            <li><button onClick={() => setExpanded(false)} className={`text-xs ${block.text} font-medium hover:underline`}>Show less</button></li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function QuickClientPrep({ contact, onSave, regenerating }) {
  const sheet = contact.ai_sheet || {};
  const update = (key, val) => onSave({ ...sheet, [key]: val });
  return (
    <div className="space-y-4">
      {regenerating && (
        <div className="text-sm text-slate-500 flex items-center gap-2 bg-white rounded-xl p-3 border border-slate-100">
          <Loader2 className="w-4 h-4 animate-spin" /> Regenerating sheet from questionnaire…
        </div>
      )}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick Client Prep</p>
        <p className="text-sm text-slate-600 mt-0.5">30-second read — shown exactly as recorded in the workbook</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {(sheet.three_words || []).map((w, i) => (
            <span key={i} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">{w}</span>
          ))}
          {(sheet.three_words || []).length === 0 && <span className="text-sm text-slate-400 italic">No words yet</span>}
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase">Energy Type</p>
          <p className="text-sm text-slate-700 mt-0.5">{(sheet.energy_type || []).join(", ") || <span className="text-slate-400 italic">Not set</span>}</p>
        </div>
      </div>

      <EditableListBlock block={BLOCKS.how_to_approach} items={sheet.how_to_approach} onSave={(v) => update("how_to_approach", v)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditableListBlock block={BLOCKS.do_appreciate} items={sheet.do_appreciate} onSave={(v) => update("do_appreciate", v)} />
        <EditableListBlock block={BLOCKS.frustrates_them} items={sheet.frustrates_them} onSave={(v) => update("frustrates_them", v)} />
        <EditableListBlock block={BLOCKS.avoid} items={sheet.avoid} onSave={(v) => update("avoid", v)} />
      </div>

      <EditableListBlock block={BLOCKS.pinned} items={sheet.pinned_things_to_know} onSave={(v) => update("pinned_things_to_know", v)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Recent Win</h4>
          <ul className="space-y-1.5">
            {(sheet.recent_wins || []).map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" /> {it}</li>
            ))}
            {(sheet.recent_wins || []).length === 0 && <li className="text-sm text-slate-400 italic">None recorded</li>}
          </ul>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Life Update</h4>
          <ul className="space-y-1.5">
            {(sheet.life_updates || []).map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" /> {it}</li>
            ))}
            {(sheet.life_updates || []).length === 0 && <li className="text-sm text-slate-400 italic">None recorded</li>}
          </ul>
        </div>
      </div>

      {sheet.personality_summary && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Personality Summary</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{sheet.personality_summary}</p>
        </div>
      )}
    </div>
  );
}