import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Send, CheckCircle2, Clock, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function ScheduleForm({ clients, onSave, onCancel, initial }) {
  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    recipient_emails: [],
    day_of_month: 1,
    include_seo: true,
    include_ga: true,
    notes: "",
    active: true,
    ...initial,
  });
  const [emailInput, setEmailInput] = useState(initial?.recipient_emails?.join(", ") || "");

  const handleSave = () => {
    if (!form.client_id) return toast.error("Select a client.");
    const emails = emailInput.split(",").map(e => e.trim()).filter(Boolean);
    if (!emails.length) return toast.error("Enter at least one recipient email.");
    onSave({ ...form, recipient_emails: emails });
  };

  return (
    <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Client</label>
          <select
            value={form.client_id}
            onChange={e => {
              const c = clients.find(cl => cl.id === e.target.value);
              setForm(f => ({ ...f, client_id: e.target.value, client_name: c?.name || "" }));
            }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Select a client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Send on day of month</label>
          <select
            value={form.day_of_month}
            onChange={e => setForm(f => ({ ...f, day_of_month: Number(e.target.value) }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {DAYS.map(d => <option key={d} value={d}>{d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"} of each month</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Recipient Emails (comma-separated)</label>
        <input
          type="text"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="client@example.com, manager@agency.com"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Custom Note (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Any context to include in the report email…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
        />
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSave} className="bg-slate-800 hover:bg-slate-700 text-white">Save Schedule</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function ScheduledReports({ clients }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState({});

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    const data = await base44.entities.ReportSchedule.list("-created_date");
    setSchedules(data);
    setLoading(false);
  };

  const handleSave = async (form) => {
    await base44.entities.ReportSchedule.create(form);
    toast.success("Schedule saved!");
    setShowForm(false);
    loadSchedules();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove schedule for ${name}?`)) return;
    await base44.entities.ReportSchedule.delete(id);
    toast.success("Schedule removed.");
    loadSchedules();
  };

  const handleToggle = async (s) => {
    await base44.entities.ReportSchedule.update(s.id, { active: !s.active });
    loadSchedules();
  };

  const handleSendNow = async (s) => {
    setSending(prev => ({ ...prev, [s.id]: true }));
    try {
      const res = await base44.functions.invoke("sendSEOReport", {
        client_id: s.client_id,
        recipient_emails: s.recipient_emails,
        notes: s.notes || "",
      });
      toast.success(`Report sent to ${s.recipient_emails.join(", ")}`);
    } catch (err) {
      toast.error("Send failed: " + (err?.response?.data?.error || err.message));
    }
    setSending(prev => ({ ...prev, [s.id]: false }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Scheduled Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automatically email SEO & Analytics summaries to clients each month.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-slate-800 hover:bg-slate-700 text-white">
          <Plus className="w-4 h-4" /> Add Schedule
        </Button>
      </div>

      {showForm && (
        <ScheduleForm clients={clients} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-14 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No scheduled reports yet. Add one to start automating.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl border ${s.active ? "border-slate-200" : "border-slate-100 opacity-60"} shadow-sm p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{s.client_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Sends on the <strong>{s.day_of_month}{s.day_of_month === 1 ? "st" : s.day_of_month === 2 ? "nd" : s.day_of_month === 3 ? "rd" : "th"}</strong> of each month
                    → {s.recipient_emails?.join(", ")}
                  </p>
                  {s.last_sent_date && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500" />
                      Last sent: {new Date(s.last_sent_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  {s.notes && <p className="text-xs text-slate-400 mt-0.5 italic truncate">Note: {s.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleSendNow(s)} disabled={sending[s.id]}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors disabled:opacity-50">
                    {sending[s.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {sending[s.id] ? "Sending…" : "Send Now"}
                  </button>
                  <button onClick={() => handleToggle(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    {s.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(s.id, s.client_name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}