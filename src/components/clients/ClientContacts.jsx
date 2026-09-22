import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, User, ChevronRight } from "lucide-react";
import ContactForm from "@/components/intelligence/ContactForm";
import { countFilledFields, TOTAL_FIELDS } from "@/utils/contactQuestionnaire";

export default function ClientContacts({ client, canEdit }) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const list = await base44.entities.ClientContact.filter({ client_id: client.id });
    setContacts(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">Contacts ({contacts.length})</h3>
        {canEdit && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Contact</Button>}
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No contacts yet. Add one to build their intelligence one-pager.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => {
            const filled = countFilledFields(c.questionnaire);
            return (
              <button key={c.id} onClick={() => navigate(`/contact/${c.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.full_name}</p>
                  <p className="text-xs text-slate-500">{c.preferred_name ? `Preferred ${c.preferred_name}` : "No preferred name"} · {filled}/{TOTAL_FIELDS} fields</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
      <ContactForm open={showForm} onClose={() => setShowForm(false)} client={client} onSaved={(saved) => { setShowForm(false); load(); navigate(`/contact/${saved.id}`); }} />
    </div>
  );
}