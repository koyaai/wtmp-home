import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Sparkles, CheckCircle2, AlertTriangle, TrendingUp, Target, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";

function UploadBox({ label, icon: Icon, color, file, onFile, loading }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <label
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${file ? `${color.border} ${color.bg}` : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`}
    >
      <input type="file" accept=".pdf" className="hidden" onChange={e => onFile(e.target.files[0])} disabled={loading} />
      {file ? (
        <>
          <CheckCircle2 className={`w-8 h-8 ${color.icon}`} />
          <div className="text-center">
            <p className={`text-sm font-semibold ${color.text}`}>{label}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{file.name}</p>
          </div>
        </>
      ) : (
        <>
          <div className={`w-12 h-12 rounded-xl ${color.iconBg} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">Drop PDF here or click to upload</p>
          </div>
        </>
      )}
    </label>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
      <p className="text-2xl font-bold text-slate-800">{value || "—"}</p>
      <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
            <span><span className={`font-medium ${item.priority === "High" ? "text-red-600" : item.priority === "Medium" ? "text-amber-600" : "text-slate-600"}`}>[{item.priority}]</span> <span className="text-xs text-slate-400">{item.channel}</span> — {item.action}</span>
          ) : item}
        </li>
      ))}
    </ul>
  );
}

export default function Reporting() {
  const [seoFile, setSeoFile] = useState(null);
  const [ppcFile, setPpcFile] = useState(null);
  const [clientName, setClientName] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);

  const canGenerate = seoFile && ppcFile && clientName && dateRange;

  const handleGenerate = async () => {
    setUploading(true);
    setReport(null);
    try {
      const [seoUpload, ppcUpload] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: seoFile }),
        base44.integrations.Core.UploadFile({ file: ppcFile }),
      ]);

      const res = await base44.functions.invoke("generateCombinedReport", {
        seo_file_url: seoUpload.file_url,
        ppc_file_url: ppcUpload.file_url,
        client_name: clientName,
        date_range: dateRange,
      });

      setReport(res.data);
      toast.success("Report generated!");
    } catch (err) {
      toast.error("Failed to generate report: " + err.message);
    }
    setUploading(false);
  };

  const handleCopy = () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Report copied to clipboard");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reporting</h1>
        <p className="text-slate-500 text-sm mt-1">Upload your SEO and PPC reports to generate a unified client report.</p>
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Client Name</label>
            <input
              type="text"
              placeholder="e.g. MITS Little Rock"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date Range</label>
            <input
              type="text"
              placeholder="e.g. October – December 2025"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <UploadBox
            label="SEO Report"
            icon={TrendingUp}
            file={seoFile}
            onFile={setSeoFile}
            loading={uploading}
            color={{ border: "border-violet-300", bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700", iconBg: "bg-violet-500" }}
          />
          <UploadBox
            label="PPC Report"
            icon={Target}
            file={ppcFile}
            onFile={setPpcFile}
            loading={uploading}
            color={{ border: "border-blue-300", bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700", iconBg: "bg-blue-500" }}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || uploading}
          className="w-full bg-slate-800 hover:bg-slate-700"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing & Generating Report...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Combined Report</>
          )}
        </Button>
      </div>

      {/* Generated Report */}
      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Combined Marketing Report</p>
                <h2 className="text-2xl font-bold">{clientName}</h2>
                <p className="text-slate-300 text-sm mt-1">{dateRange}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopy} className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                <Download className="w-3.5 h-3.5 mr-1" /> Copy JSON
              </Button>
            </div>
            {report.executive_summary && (
              <p className="text-slate-200 text-sm mt-4 leading-relaxed border-t border-white/10 pt-4">{report.executive_summary}</p>
            )}
          </div>

          {/* Wins */}
          {report.wins?.length > 0 && (
            <Section title="Key Wins This Period" icon={CheckCircle2} color={{ border: "border-emerald-100", bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" }}>
              <BulletList items={report.wins} color="bg-emerald-500" />
            </Section>
          )}

          {/* SEO Metrics */}
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
              {report.seo.highlights?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p>
                  <BulletList items={report.seo.highlights} color="bg-violet-500" />
                </div>
              )}
              {report.seo.local_seo_notes && (
                <div className="mt-3 p-3 bg-violet-50 rounded-lg">
                  <p className="text-xs font-semibold text-violet-700 mb-1">Local SEO Notes</p>
                  <p className="text-sm text-slate-600">{report.seo.local_seo_notes}</p>
                </div>
              )}
              {report.seo.challenges?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p>
                  <BulletList items={report.seo.challenges} color="bg-amber-400" />
                </div>
              )}
            </Section>
          )}

          {/* PPC Metrics */}
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
              {report.ppc.conversions_breakdown && (
                <div className="p-3 bg-blue-50 rounded-lg mb-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Conversions</p>
                  <p className="text-sm text-slate-600">{report.ppc.conversions_breakdown}</p>
                </div>
              )}
              {report.ppc.top_performing_city && (
                <div className="p-3 bg-slate-50 rounded-lg mb-4">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Top Performing City</p>
                  <p className="text-sm text-slate-700 font-medium">{report.ppc.top_performing_city}</p>
                </div>
              )}
              {report.ppc.highlights?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p>
                  <BulletList items={report.ppc.highlights} color="bg-blue-500" />
                </div>
              )}
              {report.ppc.top_performing_keywords?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {report.ppc.top_performing_keywords.map((kw, i) => (
                      <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {report.ppc.challenges?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p>
                  <BulletList items={report.ppc.challenges} color="bg-amber-400" />
                </div>
              )}
            </Section>
          )}

          {/* Combined Insights */}
          {report.combined_insights?.length > 0 && (
            <Section title="Cross-Channel Insights" icon={Sparkles} color={{ border: "border-indigo-100", bg: "bg-indigo-50", icon: "text-indigo-600", text: "text-indigo-700" }}>
              <BulletList items={report.combined_insights} color="bg-indigo-500" />
            </Section>
          )}

          {/* Action Items */}
          {report.action_items?.length > 0 && (
            <Section title="Action Items for Next Period" icon={ArrowRight} color={{ border: "border-orange-100", bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-700" }}>
              <BulletList items={report.action_items} color="bg-orange-400" />
            </Section>
          )}

          {/* Next Period Focus */}
          {report.next_period_focus?.length > 0 && (
            <Section title="Next Period Focus" icon={AlertTriangle} color={{ border: "border-amber-100", bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-700" }}>
              <BulletList items={report.next_period_focus} color="bg-amber-400" />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}