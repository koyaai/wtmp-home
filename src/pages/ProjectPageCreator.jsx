import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, Check, ChevronDown, ChevronUp, FileText, Building2, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const INITIAL_Q = {
  city: "", state: "", residential_or_commercial: "", property_type: "", client_goal: "",
  product_type: "", material: "", color: "", special_features: "", dimensions: "", brand: "",
  problem_solved: "", before_after: "", benefits: "", project_cost: "",
  company_name: "", service_areas: "", contact_url: "",
};

function Field({ label, name, value, onChange, placeholder, textarea = false, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      )}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 py-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function GeneratedSection({ title, content, className = "" }) {
  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
        <CopyButton text={content} />
      </div>
      <div className="px-4 py-3 text-sm text-slate-700 prose prose-sm max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function ProjectPageCreator() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [q, setQ] = useState(INITIAL_Q);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.entities.Client.list().then(setClients).catch(() => {});
  }, []);

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setSelectedClient(client);

    // Pre-fill company info from client record
    const locationParts = (client.location || "").split(",").map(s => s.trim());
    setQ(prev => ({
      ...prev,
      company_name: client.name || prev.company_name,
      service_areas: client.location || prev.service_areas,
      contact_url: client.website || prev.contact_url,
      city: locationParts[0] || prev.city,
      state: locationParts[1] || prev.state,
    }));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setQ(INITIAL_Q);
    setResult(null);
  };

  const handleChange = (name, value) => setQ(prev => ({ ...prev, [name]: value }));

  const handleGenerate = async () => {
    if (!q.city || !q.product_type) {
      toast.error("City and product type are required.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("generateProjectPage", {
        questionnaire: q,
        client_context: selectedClient ? {
          name: selectedClient.name,
          location: selectedClient.location,
          website: selectedClient.website,
          services: selectedClient.services,
          program: selectedClient.program,
          notes: selectedClient.notes,
        } : null,
      });
      setResult(res.data.page);
      toast.success("Project page generated!");
    } catch (err) {
      toast.error(err.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setQ(INITIAL_Q); setResult(null); };

  const fullContent = result ? [
    `# ${result.page_title}`,
    result.intro_paragraph,
    result.solution_section,
    result.features_list,
    result.results_section,
    result.before_after_section,
    result.cta_section,
  ].filter(Boolean).join("\n\n") : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Project Page Creator</h1>
            <p className="text-slate-500 text-sm">Generate SEO-optimized project case study pages for clients.</p>
          </div>
        </div>

        {/* Client Picker */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Select Client</span>
            <span className="text-xs text-slate-400">(required)</span>
          </div>
          {!selectedClient ? (
            <select
              value=""
              onChange={e => handleClientSelect(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-slate-500"
            >
              <option value="" disabled>Choose a client…</option>
              {clients.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.location ? ` — ${c.location}` : ""}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800">{selectedClient.name}</p>
                <p className="text-xs text-indigo-500">
                  {[selectedClient.location, selectedClient.website].filter(Boolean).join(" · ")}
                </p>
                {selectedClient.services?.length > 0 && (
                  <p className="text-xs text-indigo-400 mt-0.5">Services: {selectedClient.services.join(", ")}</p>
                )}
              </div>
              <button onClick={handleClearClient} className="text-indigo-400 hover:text-indigo-600 ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {selectedClient && !result && (
          <div className="space-y-4">
            <Section title="About the Project">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="City *" name="city" value={q.city} onChange={handleChange} placeholder="e.g. Placentia" />
                <Field label="State" name="state" value={q.state} onChange={handleChange} placeholder="e.g. CA" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Residential or Commercial?</label>
                  <select value={q.residential_or_commercial} onChange={e => handleChange("residential_or_commercial", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                    <option value="">Select…</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <Field label="Type of Business or Property" name="property_type" value={q.property_type} onChange={handleChange} placeholder="e.g. office, restaurant, home" />
              </div>
              <Field label="Client's Main Goal or Problem" name="client_goal" value={q.client_goal} onChange={handleChange}
                placeholder="e.g. shade for employees, curb appeal, weather protection" textarea />
            </Section>

            <Section title="The Product Installed">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Type of Awning / Product *" name="product_type" value={q.product_type} onChange={handleChange} placeholder="e.g. retractable awning, fixed awning, patio cover" />
                <Field label="Material" name="material" value={q.material} onChange={handleChange} placeholder="e.g. Sunbrella fabric, aluminum" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Color or Finish" name="color" value={q.color} onChange={handleChange} placeholder="e.g. crisp white, charcoal gray" />
                <Field label="Brand / Product Line" name="brand" value={q.brand} onChange={handleChange} placeholder="e.g. SunSetter, Somfy" />
              </div>
              <Field label="Special Features" name="special_features" value={q.special_features} onChange={handleChange}
                placeholder="e.g. LED lighting, motorized operation, adjustable pitch, cassette housing"
                hint="List all that apply" textarea />
              <Field label="Size / Dimension Options" name="dimensions" value={q.dimensions} onChange={handleChange}
                placeholder="e.g. 18ft wide x 10ft projection" />
            </Section>

            <Section title="The Installation & Results">
              <Field label="What specific problem did the installation solve?" name="problem_solved" value={q.problem_solved} onChange={handleChange}
                placeholder="e.g. cooling a break area, blocking harsh afternoon sun on west-facing patio" textarea />
              <Field label="Before & After Story" name="before_after" value={q.before_after} onChange={handleChange}
                placeholder="e.g. The space was an exposed concrete patio — after installation it became a shaded lounge area" textarea />
              <Field label="Benefits the client noticed after installation" name="benefits" value={q.benefits} onChange={handleChange}
                placeholder="e.g. employees use the space daily, easier remote operation, improved curb appeal" textarea />
              <Field label="Total Project Cost" name="project_cost" value={q.project_cost} onChange={handleChange} placeholder="e.g. 7,450" hint="Optional — include if client approves sharing" />
            </Section>

            <Section title="Company Info (for CTA)" defaultOpen={false}>
              <p className="text-xs text-slate-400 -mt-1">Pre-filled from client record — edit if needed.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Company Name" name="company_name" value={q.company_name} onChange={handleChange} placeholder="e.g. AAA Awnings Inc." />
                <Field label="Contact / Scheduling URL" name="contact_url" value={q.contact_url} onChange={handleChange} placeholder="e.g. https://example.com/contact" />
              </div>
              <Field label="Areas or Regions Served" name="service_areas" value={q.service_areas} onChange={handleChange}
                placeholder="e.g. Orange County, Los Angeles County, Riverside County" />
            </Section>

            <Button
              onClick={handleGenerate}
              disabled={loading || !q.city || !q.product_type}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 h-11 text-sm font-semibold"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Project Page…</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Generate Project Page</>}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <Check className="w-4 h-4" />
                Project page generated for {selectedClient?.name}
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={fullContent} label="Copy All Content" />
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Start New
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Page Title</span>
                  <CopyButton text={result.page_title} />
                </div>
                <p className="px-4 py-3 text-sm font-medium text-slate-800">{result.page_title}</p>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Meta Description</span>
                  <CopyButton text={result.meta_description} />
                </div>
                <p className="px-4 py-3 text-sm text-slate-600">{result.meta_description}</p>
              </div>
            </div>

            {result.slug_suggestion && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Suggested URL Slug</span>
                  <CopyButton text={result.slug_suggestion} />
                </div>
                <p className="px-4 py-3 text-sm font-mono text-indigo-700">{result.slug_suggestion}</p>
              </div>
            )}

            <GeneratedSection title="Intro Paragraph" content={result.intro_paragraph} />
            <GeneratedSection title="Solution Section" content={result.solution_section} />
            <GeneratedSection title="Features List" content={result.features_list} />
            <GeneratedSection title="Project Highlights & Results" content={result.results_section} />
            {result.before_after_section && (
              <GeneratedSection title="Before & After" content={result.before_after_section} />
            )}
            <GeneratedSection title="CTA Section" content={result.cta_section} />
          </div>
        )}
      </div>
    </div>
  );
}