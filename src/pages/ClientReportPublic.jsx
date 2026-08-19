import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, TrendingDown, Minus, Target, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Star, Users, MapPin, BarChart3 } from "lucide-react";
import { parseNumeric, computeDelta, getPath, GLANCE_METRICS } from "@/utils/reportComparison";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function TrendBadge({ delta }) {
  const { direction, diff, deltaPct } = delta;
  const isUp = direction === "up";
  const isDown = direction === "down";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : isDown ? "text-red-700 bg-red-50 border-red-200"
    : "text-slate-500 bg-slate-50 border-slate-200";
  const display = deltaPct != null ? `${isUp ? "+" : ""}${deltaPct}%` : `${isUp ? "+" : ""}${diff}`;
  return (
    <span className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />
      {display}
      <span className="text-slate-400 font-normal hidden sm:inline">vs last month</span>
    </span>
  );
}

function MetricCard({ label, value, priorValue }) {
  const delta = priorValue != null ? computeDelta(value, priorValue) : null;
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
      <p className="text-xl font-bold text-slate-800">{value || "—"}</p>
      <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
      {delta && <TrendBadge delta={delta} />}
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

function BulletList({ items, color }) {
  if (!items?.length) return <p className="text-sm text-slate-400">No data available.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
          {typeof item === "string" ? item
            : item.action ? (
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

function ROISummary({ report, client }) {
  const retainer = client?.retainer_fee || 0;
  const adSpend = parseFloat(String(report?.ppc?.total_spend || '').replace(/[^0-9.]/g, '')) || 0;
  const totalInvestment = retainer + adSpend;
  const leadsVal = report?.leads?.total_leads || report?.ppc?.total_leads || null;
  const leads = leadsVal && leadsVal !== 'N/A' ? leadsVal : null;
  const leadsNum = leads ? parseFloat(String(leads).replace(/[^0-9.]/g, '')) : null;
  const costPerLead = leadsNum && totalInvestment ? (totalInvestment / leadsNum).toFixed(2) : null;

  if (!retainer && !adSpend) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
      <p className="text-emerald-200 text-xs uppercase tracking-widest mb-3 font-semibold">Your Monthly Marketing Investment</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {retainer > 0 && (
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">${retainer.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs mt-0.5">Monthly Retainer</p>
          </div>
        )}
        {adSpend > 0 && (
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">${adSpend.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs mt-0.5">Ad Spend</p>
          </div>
        )}
        {totalInvestment > 0 && (
          <div className="bg-white/15 rounded-xl p-3 text-center border border-white/20">
            <p className="text-lg font-bold">${totalInvestment.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs mt-0.5">Total Investment</p>
          </div>
        )}
        {leads && (
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{leads}</p>
            <p className="text-emerald-200 text-xs mt-0.5">Leads Generated</p>
          </div>
        )}
      </div>
      {costPerLead && (
        <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Cost Per Lead</p>
            <p className="text-emerald-200 text-xs mt-0.5">Total investment ÷ leads generated this period</p>
          </div>
          <p className="text-2xl font-black">${costPerLead}</p>
        </div>
      )}
    </div>
  );
}

function MonthAtAGlance({ report, priorReport }) {
  const cards = GLANCE_METRICS
    .map(m => ({ ...m, value: getPath(report, m.path), prior: getPath(priorReport, m.path) }))
    .filter(m => m.value != null && m.value !== "N/A" && m.value !== "—" && parseNumeric(m.value) != null)
    .slice(0, 4);

  if (cards.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Month at a Glance</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => {
          const delta = c.prior != null ? computeDelta(c.value, c.prior) : null;
          const isUp = delta?.direction === "up";
          const isDown = delta?.direction === "down";
          const Icon = !delta ? Minus : isUp ? TrendingUp : isDown ? TrendingDown : Minus;
          const trendColor = !delta ? "text-slate-300" : isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-slate-400";
          const display = delta ? (delta.deltaPct != null ? `${isUp ? "+" : ""}${delta.deltaPct}%` : `${isUp ? "+" : ""}${delta.diff}`) : null;
          return (
            <div key={c.path} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center text-center">
              <p className="text-2xl font-black text-slate-800">{c.value}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{c.label}</p>
              {delta ? (
                <span className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${trendColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {display}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-slate-300">
                  <Icon className="w-3.5 h-3.5" />
                  baseline
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportBody({ report, priorReport, clientName, dateRange, client }) {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 rounded-2xl p-7 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative">
          <p className="text-blue-300 text-xs uppercase tracking-[0.2em] mb-2 font-semibold">Your {dateRange?.split(' ')[0] || ''} Marketing Results</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{clientName}</h1>
          <p className="text-slate-300 text-sm mt-1.5">{dateRange}</p>
          {report.executive_summary && (
            <p className="text-slate-200 text-sm mt-5 leading-relaxed border-t border-white/10 pt-4 max-w-2xl">{report.executive_summary}</p>
          )}
        </div>
      </div>

      <MonthAtAGlance report={report} priorReport={priorReport} />

      <ROISummary report={report} client={client} />

      <ScorecardBanner scorecard={report.client_scorecard} />

      {/* Leads & ROI */}
      {report.leads && report.leads.total_leads && report.leads.total_leads !== 'N/A' && (
        <Section title="Leads & ROI (Lead Boomerang)" icon={Users} color={{ border: "border-teal-100", bg: "bg-teal-50", icon: "text-teal-600", text: "text-teal-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {report.leads.total_leads && <MetricCard label="Total Leads" value={report.leads.total_leads} priorValue={getPath(priorReport, "leads.total_leads")} />}
            {report.leads.appointments_booked && report.leads.appointments_booked !== 'N/A' && <MetricCard label="Appts Booked" value={report.leads.appointments_booked} priorValue={getPath(priorReport, "leads.appointments_booked")} />}
            {report.leads.closed_deals && report.leads.closed_deals !== 'N/A' && <MetricCard label="Closed Deals" value={report.leads.closed_deals} priorValue={getPath(priorReport, "leads.closed_deals")} />}
            {report.leads.revenue_generated && report.leads.revenue_generated !== 'N/A' && <MetricCard label="Revenue Generated" value={report.leads.revenue_generated} priorValue={getPath(priorReport, "leads.revenue_generated")} />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {report.leads.cost_per_lead && report.leads.cost_per_lead !== 'N/A' && <MetricCard label="Cost Per Lead" value={`$${report.leads.cost_per_lead}`} priorValue={getPath(priorReport, "leads.cost_per_lead") ? `$${getPath(priorReport, "leads.cost_per_lead")}` : null} />}
            {report.leads.close_rate && report.leads.close_rate !== 'N/A' && <MetricCard label="Close Rate" value={report.leads.close_rate} priorValue={getPath(priorReport, "leads.close_rate")} />}
            {report.leads.roi_estimate && report.leads.roi_estimate !== 'N/A' && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-teal-700">{report.leads.roi_estimate}</p>
                <p className="text-xs font-medium text-teal-600 mt-1">Estimated ROI</p>
              </div>
            )}
          </div>
          {report.leads.roi_narrative && (
            <div className="p-3 bg-teal-50 rounded-lg mb-3 border border-teal-100">
              <p className="text-xs font-semibold text-teal-700 mb-1">ROI Summary</p>
              <p className="text-sm text-slate-700">{report.leads.roi_narrative}</p>
            </div>
          )}
          {report.leads.highlights?.length > 0 && <BulletList items={report.leads.highlights} color="bg-teal-500" />}
        </Section>
      )}

      {/* Wins */}
      {report.wins?.length > 0 && (
        <Section title="Key Wins This Period" icon={CheckCircle2} color={{ border: "border-emerald-100", bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" }}>
          <BulletList items={report.wins} color="bg-emerald-500" />
        </Section>
      )}

      {/* SEO */}
      {report.seo && (
        <Section title="Local SEO / GBP Performance" icon={MapPin} color={{ border: "border-violet-100", bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard label="Organic Sessions" value={report.seo.organic_sessions} priorValue={getPath(priorReport, "seo.organic_sessions")} />
            <MetricCard label="Organic Clicks" value={report.seo.organic_clicks} priorValue={getPath(priorReport, "seo.organic_clicks")} />
            <MetricCard label="Avg. Position" value={report.seo.avg_position} priorValue={getPath(priorReport, "seo.avg_position")} />
            {report.seo.gbp_metrics?.impressions && <MetricCard label="GBP Impressions" value={report.seo.gbp_metrics.impressions} priorValue={getPath(priorReport, "seo.gbp_metrics.impressions")} />}
          </div>
          {report.seo.gbp_metrics && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {report.seo.gbp_metrics.website_clicks && <MetricCard label="GBP Website Clicks" value={report.seo.gbp_metrics.website_clicks} priorValue={getPath(priorReport, "seo.gbp_metrics.website_clicks")} />}
              {report.seo.gbp_metrics.call_clicks && <MetricCard label="GBP Call Clicks" value={report.seo.gbp_metrics.call_clicks} priorValue={getPath(priorReport, "seo.gbp_metrics.call_clicks")} />}
              {report.seo.gbp_metrics.direction_requests && <MetricCard label="GBP Directions" value={report.seo.gbp_metrics.direction_requests} priorValue={getPath(priorReport, "seo.gbp_metrics.direction_requests")} />}
            </div>
          )}
          {report.seo.highlights?.length > 0 && <div className="mb-3"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p><BulletList items={report.seo.highlights} color="bg-violet-500" /></div>}
          {report.seo.local_seo_notes && <div className="p-3 bg-violet-50 rounded-lg mt-3"><p className="text-xs font-semibold text-violet-700 mb-1">Local SEO Notes</p><p className="text-sm text-slate-600">{report.seo.local_seo_notes}</p></div>}
          {report.seo.challenges?.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p><BulletList items={report.seo.challenges} color="bg-amber-400" /></div>}
        </Section>
      )}

      {/* PPC */}
      {report.ppc && (
        <Section title="PPC Performance" icon={Target} color={{ border: "border-blue-100", bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard label="Total Spend" value={report.ppc.total_spend} priorValue={getPath(priorReport, "ppc.total_spend")} />
            <MetricCard label="Total Leads" value={report.ppc.total_leads} priorValue={getPath(priorReport, "ppc.total_leads")} />
            <MetricCard label="Cost Per Lead" value={report.ppc.cost_per_lead} priorValue={getPath(priorReport, "ppc.cost_per_lead")} />
            <MetricCard label="Avg. CPC" value={report.ppc.avg_cpc} priorValue={getPath(priorReport, "ppc.avg_cpc")} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="Clicks" value={report.ppc.total_clicks} priorValue={getPath(priorReport, "ppc.total_clicks")} />
            <MetricCard label="Impressions" value={report.ppc.impressions} priorValue={getPath(priorReport, "ppc.impressions")} />
            <MetricCard label="CTR" value={report.ppc.ctr} priorValue={getPath(priorReport, "ppc.ctr")} />
          </div>
          {report.ppc.conversions_breakdown && <div className="p-3 bg-blue-50 rounded-lg mb-3"><p className="text-xs font-semibold text-blue-700 mb-1">Conversions</p><p className="text-sm text-slate-600">{report.ppc.conversions_breakdown}</p></div>}
          {report.ppc.top_performing_city && <div className="p-3 bg-slate-50 rounded-lg mb-3"><p className="text-xs font-semibold text-slate-500 mb-1">Top Performing City</p><p className="text-sm font-medium text-slate-700">{report.ppc.top_performing_city}</p></div>}
          {report.ppc.highlights?.length > 0 && <div className="mb-3"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Highlights</p><BulletList items={report.ppc.highlights} color="bg-blue-500" /></div>}
          {report.ppc.top_performing_keywords?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Keywords</p>
              <div className="flex flex-wrap gap-2">{report.ppc.top_performing_keywords.map((kw, i) => <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{kw}</span>)}</div>
            </div>
          )}
          {report.ppc.challenges?.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Challenges</p><BulletList items={report.ppc.challenges} color="bg-amber-400" /></div>}
        </Section>
      )}

      {/* Cross-Channel */}
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
  );
}

export default function ClientReportPublic() {
  const { clientId } = useParams();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [client, setClient] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await base44.functions.invoke("getClientReports", { client_id: clientId });
      if (res.data?.reports?.length > 0) {
        setReports(res.data.reports);
        setClient(res.data.client);
        setSelectedReport(res.data.reports[0]); // most recent first
      } else {
        setError("No reports found for this client.");
      }
      setLoading(false);
    };
    if (clientId) load();
  }, [clientId]);

  // Find the next-older report relative to the selected one (reports are newest-first)
  const selectedIndex = selectedReport ? reports.findIndex(r => r.id === selectedReport.id) : -1;
  const priorReport = selectedIndex >= 0 && selectedIndex < reports.length - 1
    ? reports[selectedIndex + 1]?.report_data
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* WTMP Branded Top Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 sticky top-0 z-20 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">W</span>
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-bold tracking-tight">Window Treatment Marketing Pros</p>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">Client Performance Report</p>
            </div>
          </div>
          {reports.length > 1 && (
            <div className="hidden sm:block text-slate-400 text-xs">
              {reports.length} reports available
            </div>
          )}
        </div>
      </div>

      {/* Month Selector Tab Strip */}
      {reports.length > 1 && (
        <div className="bg-white border-b border-slate-200 sticky top-[57px] z-10 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {reports.map(r => {
              const isActive = selectedReport?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r.month} {r.year}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {selectedReport?.report_data ? (
          <ReportBody
            report={selectedReport.report_data}
            priorReport={priorReport}
            clientName={client?.name}
            dateRange={selectedReport.date_range || `${selectedReport.month} ${selectedReport.year}`}
            client={client}
          />
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm">Report data not available.</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 mt-4">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-slate-400">Prepared by Window Treatment Marketing Pros</p>
          <p className="text-[10px] text-slate-300 mt-1">Your dedicated window treatment marketing partner.</p>
        </div>
      </div>
    </div>
  );
}