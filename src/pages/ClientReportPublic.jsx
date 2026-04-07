import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Target, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, Star, Users, MapPin } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function MetricCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
      <p className="text-xl font-bold text-slate-800">{value || "—"}</p>
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

function ReportBody({ report, clientName, dateRange, client }) {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Marketing Performance Report</p>
        <h2 className="text-2xl font-bold">{clientName}</h2>
        <p className="text-slate-300 text-sm mt-1">{dateRange}</p>
        {report.executive_summary && (
          <p className="text-slate-200 text-sm mt-4 leading-relaxed border-t border-white/10 pt-4">{report.executive_summary}</p>
        )}
      </div>

      <ROISummary report={report} client={client} />

      <ScorecardBanner scorecard={report.client_scorecard} />

      {/* Leads & ROI */}
      {report.leads && report.leads.total_leads && report.leads.total_leads !== 'N/A' && (
        <Section title="Leads & ROI (Lead Boomerang)" icon={Users} color={{ border: "border-teal-100", bg: "bg-teal-50", icon: "text-teal-600", text: "text-teal-700" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {report.leads.total_leads && <MetricCard label="Total Leads" value={report.leads.total_leads} />}
            {report.leads.appointments_booked && report.leads.appointments_booked !== 'N/A' && <MetricCard label="Appts Booked" value={report.leads.appointments_booked} />}
            {report.leads.closed_deals && report.leads.closed_deals !== 'N/A' && <MetricCard label="Closed Deals" value={report.leads.closed_deals} />}
            {report.leads.revenue_generated && report.leads.revenue_generated !== 'N/A' && <MetricCard label="Revenue Generated" value={report.leads.revenue_generated} />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {report.leads.cost_per_lead && report.leads.cost_per_lead !== 'N/A' && <MetricCard label="Cost Per Lead" value={`$${report.leads.cost_per_lead}`} />}
            {report.leads.close_rate && report.leads.close_rate !== 'N/A' && <MetricCard label="Close Rate" value={report.leads.close_rate} />}
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
            <MetricCard label="Organic Sessions" value={report.seo.organic_sessions} />
            <MetricCard label="Organic Clicks" value={report.seo.organic_clicks} />
            <MetricCard label="Avg. Position" value={report.seo.avg_position} />
            {report.seo.gbp_metrics?.impressions && <MetricCard label="GBP Impressions" value={report.seo.gbp_metrics.impressions} />}
          </div>
          {report.seo.gbp_metrics && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {report.seo.gbp_metrics.website_clicks && <MetricCard label="GBP Website Clicks" value={report.seo.gbp_metrics.website_clicks} />}
              {report.seo.gbp_metrics.call_clicks && <MetricCard label="GBP Call Clicks" value={report.seo.gbp_metrics.call_clicks} />}
              {report.seo.gbp_metrics.direction_requests && <MetricCard label="GBP Directions" value={report.seo.gbp_metrics.direction_requests} />}
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
            <MetricCard label="Total Spend" value={report.ppc.total_spend} />
            <MetricCard label="Total Leads" value={report.ppc.total_leads} />
            <MetricCard label="Cost Per Lead" value={report.ppc.cost_per_lead} />
            <MetricCard label="Avg. CPC" value={report.ppc.avg_cpc} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="Clicks" value={report.ppc.total_clicks} />
            <MetricCard label="Impressions" value={report.ppc.impressions} />
            <MetricCard label="CTR" value={report.ppc.ctr} />
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
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">{client?.name?.charAt(0) || "?"}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{client?.name}</p>
            <p className="text-xs text-slate-400">Marketing Reports</p>
          </div>
        </div>

        {/* Report Picker */}
        {reports.length > 1 && (
          <div className="relative">
            <select
              value={selectedReport?.id || ""}
              onChange={e => {
                const r = reports.find(r => r.id === e.target.value);
                if (r) setSelectedReport(r);
              }}
              className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
            >
              {reports.map(r => (
                <option key={r.id} value={r.id}>{r.month} {r.year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {selectedReport?.report_data ? (
          <ReportBody
            report={selectedReport.report_data}
            clientName={client?.name}
            dateRange={selectedReport.date_range || `${selectedReport.month} ${selectedReport.year}`}
            client={client}
          />
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm">Report data not available.</div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-slate-400 border-t border-slate-100 mt-4">
        Prepared by Window Treatment Marketing Pros
      </div>
    </div>
  );
}