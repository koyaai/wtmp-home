import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, TrendingUp, Target, ArrowRight, Download, ChevronLeft, BarChart2, Plus, Link2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Shared tiny components ────────────────────────────────────────
function MetricCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
      <p className="text-2xl font-bold text-slate-800">{value || "—"}</p>
      <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${color.border} ${color.bg}`}>
        <Icon className={`w-4 h-4 ${color.icon}`} />
        <h3 className={`font-semibold text-sm ${color.text}`}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BulletList({ items, color }) {
  if (!items?.length) return <p className="text-sm text-slate-400">No data.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
          {typeof item === "string" ? item : item.action ? (
            <span>
              <span className={`font-medium ${item.priority === "High" ? "text-red-600" : item.priority === "Medium" ? "text-amber-600" : "text-slate-600"}`}>[{item.priority}]</span>
              {" "}<span className="text-xs text-slate-400">{item.channel}</span> — {item.action}
            </span>
          ) : String(item)}
        </li>
      ))}
    </ul>
  );
}

function UploadBox({ label, icon: Icon, color, file, onFile, loading }) {
  return (
    <label
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${file ? `${color.border} ${color.bg}` : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
    >
      <input type="file" accept=".pdf" className="hidden" onChange={e => onFile(e.target.files[0])} disabled={loading} />
      {file ? (
        <>
          <CheckCircle2 className={`w-7 h-7 ${color.icon}`} />
          <div className="text-center">
            <p className={`text-sm font-semibold ${color.text}`}>{label}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{file.name}</p>
          </div>
        </>
      ) : (
        <>
          <div className={`w-10 h-10 rounded-xl ${color.iconBg} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="text-xs text-slate-400">Drop PDF or click to upload</p>
          </div>
        </>
      )}
    </label>
  );
}

const GRADE_COLORS = {
  A: { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50", border: "border-emerald-200" },
  B: { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", border: "border-blue-200" },
  C: { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200" },
  D: { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-50", border: "border-orange-200" },
  F: { bg: "bg-red-500", text: "text-red-700", light: "bg-red-50", border: "border-red-200" },
};

function ScorecardBanner({ scorecard }) {
  if (!scorecard?.overall_grade) return null;
  const colors = GRADE_COLORS[scorecard.overall_grade] || GRADE_COLORS["C"];
  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.light} p-5 space-y-3`}>
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <span className="text-white text-3xl font-black">{scorecard.overall_grade}</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">Client Engagement Score</p>
          <p className={`text-base font-bold ${colors.text}`}>
            {scorecard.overall_grade === "A" ? "Excellent Collaboration" :
             scorecard.overall_grade === "B" ? "Good Partnership" :
             scorecard.overall_grade === "C" ? "Needs Improvement" :
             scorecard.overall_grade === "D" ? "At Risk" : "Critical Action Needed"}
          </p>
        </div>
      </div>
      {scorecard.grade_summary && (
        <p className="text-sm text-slate-700 leading-relaxed">{scorecard.grade_summary}</p>
      )}
      {scorecard.improvement_tips?.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How to improve your results</p>
          <ul className="space-y-1.5">
            {scorecard.improvement_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <Star className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.text}`} />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Report View ───────────────────────────────────────────────────
function ReportView({ report, clientName, dateRange, onCopy }) {
  if (!report) return null;
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Combined Marketing Report</p>
            <h2 className="text-2xl font-bold">{clientName}</h2>
            <p className="text-slate-300 text-sm mt-1">{dateRange}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onCopy} className="border-white/20 text-white hover:bg-white/10 bg-transparent">
            <Download className="w-3.5 h-3.5 mr-1" /> Copy JSON
          </Button>
        </div>
        {report.executive_summary && (
          <p className="text-slate-200 text-sm mt-4 leading-relaxed border-t border-white/10 pt-4">{report.executive_summary}</p>
        )}
      </div>

      <ScorecardBanner scorecard={report.client_scorecard} />

      {report.wins?.length > 0 && (
        <Section title="Key Wins This Period" icon={CheckCircle2} color={{ border: "border-emerald-100", bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" }}>
          <BulletList items={report.wins} color="bg-emerald-500" />
        </Section>
      )}

      {report.seo && (
        <Section title="SEO Performance" icon={TrendingUp} color={{ border: "border-violet-100", bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Organic Sessions" value={report.seo.organic_sessions} />
            <MetricCard label="Organic Clicks" value={report.seo.organic_clicks} />
            <MetricCard label="Avg. Position" value={report.seo.avg_position} />
            {report.seo.gbp_metrics?.impressions && <MetricCard label="GBP Impressions" value={report.seo.gbp_metrics.impressions} />}
          </div>
          {report.seo.gbp_metrics && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {report.seo.gbp_metrics.website_clicks && <MetricCard label="GBP Website Clicks" value={report.seo.gbp_metrics.website_clicks} />}
              {report.seo.gbp_metrics.call_clicks && <MetricCard label="GBP Call Clicks" value={report.seo.gbp_metrics.call_clicks} />}
              {report.seo.gbp_metrics.direction_requests && <MetricCard label="GBP Directions" value={report.seo.gbp_metrics.direction_requests} />}
            </div>
          )}
          {report.seo.highlights?.length > 0 && <div className="mb-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p><BulletList items={report.seo.highlights} color="bg-violet-500" /></div>}
          {report.seo.local_seo_notes && <div className="mt-3 p-3 bg-violet-50 rounded-lg"><p className="text-xs font-semibold text-violet-700 mb-1">Local SEO Notes</p><p className="text-sm text-slate-600">{report.seo.local_seo_notes}</p></div>}
          {report.seo.challenges?.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p><BulletList items={report.seo.challenges} color="bg-amber-400" /></div>}
        </Section>
      )}

      {report.ppc && (
        <Section title="PPC Performance" icon={Target} color={{ border: "border-blue-100", bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Total Spend" value={report.ppc.total_spend} />
            <MetricCard label="Total Leads" value={report.ppc.total_leads} />
            <MetricCard label="Cost Per Lead" value={report.ppc.cost_per_lead} />
            <MetricCard label="Avg. CPC" value={report.ppc.avg_cpc} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <MetricCard label="Clicks" value={report.ppc.total_clicks} />
            <MetricCard label="Impressions" value={report.ppc.impressions} />
            <MetricCard label="CTR" value={report.ppc.ctr} />
          </div>
          {report.ppc.conversions_breakdown && <div className="p-3 bg-blue-50 rounded-lg mb-4"><p className="text-xs font-semibold text-blue-700 mb-1">Conversions</p><p className="text-sm text-slate-600">{report.ppc.conversions_breakdown}</p></div>}
          {report.ppc.top_performing_city && <div className="p-3 bg-slate-50 rounded-lg mb-4"><p className="text-xs font-semibold text-slate-500 mb-1">Top Performing City</p><p className="text-sm text-slate-700 font-medium">{report.ppc.top_performing_city}</p></div>}
          {report.ppc.highlights?.length > 0 && <div className="mb-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p><BulletList items={report.ppc.highlights} color="bg-blue-500" /></div>}
          {report.ppc.top_performing_keywords?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Keywords</p>
              <div className="flex flex-wrap gap-2">{report.ppc.top_performing_keywords.map((kw, i) => <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{kw}</span>)}</div>
            </div>
          )}
          {report.ppc.challenges?.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p><BulletList items={report.ppc.challenges} color="bg-amber-400" /></div>}
        </Section>
      )}

      {report.combined_insights?.length > 0 && (
        <Section title="Cross-Channel Insights" icon={Sparkles} color={{ border: "border-indigo-100", bg: "bg-indigo-50", icon: "text-indigo-600", text: "text-indigo-700" }}>
          <BulletList items={report.combined_insights} color="bg-indigo-500" />
        </Section>
      )}

      {report.action_items?.length > 0 && (
        <Section title="Action Items for Next Period" icon={ArrowRight} color={{ border: "border-orange-100", bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-700" }}>
          <BulletList items={report.action_items} color="bg-orange-400" />
        </Section>
      )}

      {report.next_period_focus?.length > 0 && (
        <Section title="Next Period Focus" icon={AlertTriangle} color={{ border: "border-amber-100", bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-700" }}>
          <BulletList items={report.next_period_focus} color="bg-amber-400" />
        </Section>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Reporting() {
  const now = new Date();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState("");
  const [seoFile, setSeoFile] = useState(null);
  const [ppcFile, setPpcFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [savedReportId, setSavedReportId] = useState(null);
  const [view, setView] = useState("list"); // "list" | "new" | "existing"
  const [savedReports, setSavedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    base44.entities.Client.list().then(setClients).catch(() => {});
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    setLoadingReports(true);
    const all = await base44.entities.MonthlyReport.list("-created_date");
    setSavedReports(all);
    setLoadingReports(false);
  };

  // Check if a report already exists for selected client+month+year
  const checkExisting = async (clientId, m, y) => {
    const results = await base44.entities.MonthlyReport.filter({ client_id: clientId, month: m, year: y });
    return results[0] || null;
  };

  const handleStartNew = () => {
    setReport(null);
    setSavedReportId(null);
    setSeoFile(null);
    setPpcFile(null);
    setDateRange("");
    setView("new");
  };

  const handleOpenReport = (r) => {
    setReport(r.report_data);
    setSelectedClient({ id: r.client_id, name: r.client_name });
    setMonth(r.month);
    setYear(r.year);
    setDateRange(r.date_range || `${r.month} ${r.year}`);
    setSavedReportId(r.id);
    setView("existing");
  };

  const handleGenerate = async () => {
    if (!selectedClient || !seoFile || !ppcFile) return;
    setUploading(true);
    setReport(null);
    try {
      const [seoUpload, ppcUpload] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: seoFile }),
        base44.integrations.Core.UploadFile({ file: ppcFile }),
      ]);

      const clientData = clients.find(c => c.id === selectedClient.id) || {};

      // Fetch the client score for this month/year if it exists
      const scoreResults = await base44.entities.ClientScore.filter({ client_id: selectedClient.id, month, year });
      const clientScore = scoreResults[0] || null;

      const res = await base44.functions.invoke("generateCombinedReport", {
        seo_file_url: seoUpload.file_url,
        ppc_file_url: ppcUpload.file_url,
        client_name: selectedClient.name,
        date_range: dateRange || `${month} ${year}`,
        client_context: {
          services: clientData.services,
          location: clientData.location,
          website: clientData.website,
          csm_assigned: clientData.csm_assigned,
        },
        client_score: clientScore,
      });

      const reportData = res.data;
      setReport(reportData);

      // Save / upsert
      const existing = await checkExisting(selectedClient.id, month, year);
      const payload = {
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        month,
        year,
        date_range: dateRange || `${month} ${year}`,
        report_data: reportData,
        seo_file_url: seoUpload.file_url,
        ppc_file_url: ppcUpload.file_url,
      };

      if (existing) {
        await base44.entities.MonthlyReport.update(existing.id, payload);
        setSavedReportId(existing.id);
      } else {
        const created = await base44.entities.MonthlyReport.create(payload);
        setSavedReportId(created.id);
      }

      toast.success("Report generated & saved!");
      loadSavedReports();
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
    setUploading(false);
  };

  const canGenerate = selectedClient && seoFile && ppcFile;

  // Group saved reports by client
  const groupedReports = savedReports.reduce((acc, r) => {
    if (!acc[r.client_name]) acc[r.client_name] = [];
    acc[r.client_name].push(r);
    return acc;
  }, {});

  // ── List View ────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reporting</h1>
            <p className="text-slate-500 text-sm mt-1">Monthly combined reports per client.</p>
          </div>
          <Button onClick={handleStartNew} className="bg-slate-800 hover:bg-slate-700">
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </div>

        {loadingReports ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : savedReports.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reports yet. Generate your first one.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReports).map(([clientName, reports]) => (
              <div key={clientName} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{clientName.charAt(0)}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800">{clientName}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {reports.map(r => (
                    <div key={r.id} className="flex items-center hover:bg-slate-50 transition-colors">
                      <button
                        onClick={() => handleOpenReport(r)}
                        className="flex-1 flex items-center justify-between px-5 py-3.5 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">{r.month} {r.year}</p>
                          {r.date_range && <p className="text-xs text-slate-400">{r.date_range}</p>}
                        </div>
                        <span className="text-xs text-blue-600 font-medium">View →</span>
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/report/${r.client_id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Client link copied!");
                        }}
                        title="Copy client report link"
                        className="px-4 py-3.5 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Existing Report View ──────────────────────────────────────────
  if (view === "existing") {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
          <ChevronLeft className="w-4 h-4" /> All Reports
        </button>
        <ReportView
          report={report}
          clientName={selectedClient?.name}
          dateRange={dateRange}
          onCopy={() => { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); toast.success("Copied!"); }}
        />
      </div>
    );
  }

  // ── New Report Form ───────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
        <ChevronLeft className="w-4 h-4" /> All Reports
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Report</h1>
        <p className="text-slate-500 text-sm mt-1">Link to a client, pick the month, upload reports.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        {/* Client Picker */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Client</label>
          <select
            value={selectedClient?.id || ""}
            onChange={e => {
              const c = clients.find(cl => cl.id === e.target.value);
              setSelectedClient(c ? { id: c.id, name: c.name } : null);
            }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Select a client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Month + Year */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date Range Label (optional)</label>
            <input type="text" value={dateRange} onChange={e => setDateRange(e.target.value)} placeholder="e.g. Oct – Dec 2025" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        {/* Upload */}
        <div className="grid sm:grid-cols-2 gap-4">
          <UploadBox label="SEO Report" icon={TrendingUp} file={seoFile} onFile={setSeoFile} loading={uploading}
            color={{ border: "border-violet-300", bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700", iconBg: "bg-violet-500" }} />
          <UploadBox label="PPC Report" icon={Target} file={ppcFile} onFile={setPpcFile} loading={uploading}
            color={{ border: "border-blue-300", bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700", iconBg: "bg-blue-500" }} />
        </div>

        <Button onClick={handleGenerate} disabled={!canGenerate || uploading} className="w-full bg-slate-800 hover:bg-slate-700">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing & Generating...</> : <><Sparkles className="w-4 h-4" /> Generate & Save Report</>}
        </Button>
      </div>

      {report && (
        <ReportView
          report={report}
          clientName={selectedClient?.name}
          dateRange={dateRange || `${month} ${year}`}
          onCopy={() => { navigator.clipboard.writeText(JSON.stringify(report, null, 2)); toast.success("Copied!"); }}
        />
      )}
    </div>
  );
}