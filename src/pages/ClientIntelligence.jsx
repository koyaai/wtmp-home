import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, User, ChevronRight } from "lucide-react";
import ContactForm from "@/components/intelligence/ContactForm";
import { countFilledFields, TOTAL_FIELDS } from "@/utils/contactQuestionnaire";

export default function ClientIntelligence() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const list = await base44.entities.ClientContact.list("-updated_date", 500);
    setContacts(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = contacts.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (c.full_name || "").toLowerCase().includes(q) ||
      (c.client_name || "").toLowerCase().includes(q) ||
      (c.preferred_name || "").toLowerCase().includes(q);
  });
  const grouped = {};
  filtered.forEach((c) => { const k = c.client_name || "Unassigned"; (grouped[k] = grouped[k] || []).push(c); });
  const groups = Object.keys(grouped).sort();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Client Intelligence</h1>
          <p className="text-sm text-slate-500">One-pager for every client contact — who they are and how to work with them.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Contact</Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts or clients…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No contacts found.</p>
      ) : (
        groups.map((g) => (
          <div key={g}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{g}</p>
            <div className="space-y-2">
              {grouped[g].map((c) => {
                const filled = countFilledFields(c.questionnaire);
                return (
                  <button key={c.id} onClick={() => navigate(`/contact/${c.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {c.full_name}{c.preferred_name ? <span className="text-slate-400 font-normal"> · {c.preferred_name}</span> : ""}
                      </p>
                      <p className="text-xs text-slate-500">{filled}/{TOTAL_FIELDS} fields in workbook</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      <ContactForm open={showForm} onClose={() => setShowForm(false)} onSaved={(saved) => { setShowForm(false); navigate(`/contact/${saved.id}`); }} />
    </div>
  );
}