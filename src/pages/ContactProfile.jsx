import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, RefreshCw, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ContactHeader from "@/components/intelligence/ContactHeader";
import QuickClientPrep from "@/components/intelligence/QuickClientPrep";
import QuestionnaireTab from "@/components/intelligence/QuestionnaireTab";
import TimelineNotes from "@/components/intelligence/TimelineNotes";
import ContactForm from "@/components/intelligence/ContactForm";
import { buildSheetPrompt, AI_SHEET_SCHEMA, countFilledFields, TOTAL_FIELDS } from "@/utils/contactQuestionnaire";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People & Personal" },
  { key: "communication", label: "Communication" },
  { key: "relationship", label: "Relationship & Personality" },
  { key: "timeline", label: "Timeline & Notes" },
];

export default function ContactProfile() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contact, setContact] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [regenerating, setRegenerating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    try {
      const c = await base44.entities.ClientContact.get(contactId);
      setContact(c);
    } catch (e) {
      setContact(null);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    base44.auth.me().then(setUser).catch(() => {});
  }, [contactId]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!contact) return <div className="p-10 text-center text-slate-500">Contact not found.</div>;

  const filled = countFilledFields(contact.questionnaire);

  const handleSaveSheet = async (sheet) => {
    const updated = await base44.entities.ClientContact.update(contact.id, { ai_sheet: sheet });
    setContact(updated);
    toast({ title: "Sheet saved" });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildSheetPrompt(contact, contact.questionnaire),
        response_json_schema: AI_SHEET_SCHEMA,
      });
      const sheet = res && (res.three_words || res.personality_summary) ? res : (res?.output || res);
      const updated = await base44.entities.ClientContact.update(contact.id, { ai_sheet: sheet });
      setContact(updated);
      toast({ title: "Sheet regenerated" });
    } catch (e) {
      toast({ title: "Regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveNotes = async (notes) => {
    const updated = await base44.entities.ClientContact.update(contact.id, { timeline_notes: notes });
    setContact(updated);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <button onClick={() => navigate("/ClientIntelligence")} className="flex items-center gap-1 text-sm text-blue-600 font-medium">
          <ArrowLeft className="w-4 h-4" /> All contacts
        </button>
        <ContactHeader contact={contact} filled={filled} total={TOTAL_FIELDS} />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit Questionnaire</Button>
            {activeTab === "overview" && (
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Regenerate
              </Button>
            )}
          </div>
        </div>

        {activeTab === "overview" && <QuickClientPrep contact={contact} onSave={handleSaveSheet} regenerating={regenerating} />}
        {activeTab === "people" && <QuestionnaireTab contact={contact} sectionKeys={["client_snapshot"]} onEdit={() => setShowEdit(true)} />}
        {activeTab === "communication" && <QuestionnaireTab contact={contact} sectionKeys={["communication_profile"]} onEdit={() => setShowEdit(true)} />}
        {activeTab === "relationship" && <QuestionnaireTab contact={contact} sectionKeys={["working_relationship", "personality_insights"]} onEdit={() => setShowEdit(true)} />}
        {activeTab === "timeline" && <TimelineNotes contact={contact} user={user} onSave={handleSaveNotes} />}
      </div>

      <ContactForm open={showEdit} onClose={() => setShowEdit(false)} contact={contact} onSaved={() => { setShowEdit(false); load(); }} />
    </div>
  );
}