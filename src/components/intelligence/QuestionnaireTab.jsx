import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { QUESTIONNAIRE_SECTIONS } from "@/utils/contactQuestionnaire";

export default function QuestionnaireTab({ contact, sectionKeys, onEdit }) {
  const sections = QUESTIONNAIRE_SECTIONS.filter((s) => sectionKeys.includes(s.key));
  const q = contact.questionnaire || {};
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit Questionnaire</Button>
      </div>
      {sections.map((s) => (
        <div key={s.key} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-3">{s.label}</h3>
          <div className="space-y-3">
            {s.fields.map((f) => {
              const v = q[s.key]?.[f.key];
              return (
                <div key={f.key}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">
                    {v && String(v).trim() ? String(v) : <span className="text-slate-400 italic">Not provided</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}