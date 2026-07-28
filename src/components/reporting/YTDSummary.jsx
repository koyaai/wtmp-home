import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, MousePointerClick, Users, Loader2 } from "lucide-react";
import ClientSelect from "@/components/clients/ClientSelect";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ChannelCard({ title, icon: Icon, color, metrics }) {
  const hasData = metrics.some(m => m.value !== null && m.value !== undefined);
  return (
    <div className={`rounded-2xl border ${color.border} ${color.bg} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg ${color.iconBg} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className={`font-semibold text-sm ${color.text}`}>{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-white/80 p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-800">{m.value ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function YTDSummary({ clients }) {
  const now = new Date();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [ppcData, setPpcData] = useState([]);
  const [seoData, setSeoData] = useState([]);

  const currentMonthIndex = now.getFullYear() === year ? now.getMonth() : 11;
  const activeMonths = MONTHS.slice(0, currentMonthIndex + 1);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients]);

  useEffect(() => {
    if (!selectedClientId) return;
    loadData();
  }, [selectedClientId, year]);

  const loadData = async () => {
    setLoading(true);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [leads, ppc, seo] = await Promise.all([
      base44.entities.LeadData.filter({ client_id: selectedClientId }, "-report_date", 50),
      base44.entities.PPCData.filter({ client_id: selectedClientId }, "-report_date", 50),
      base44.entities.SEOData.filter({ client_id: selectedClientId }, "-report_date", 50),
    ]);

    const inYear = (d) => d.report_date && d.report_date >= startDate && d.report_date <= endDate;
    setLeadsData(leads.filter(inYear));
    setPpcData(ppc.filter(inYear));
    setSeoData(seo.filter(inYear));
    setLoading(false);
  };

  // ── Aggregations ──────────────────────────────────────────────────
  const totalLeads = leadsData.reduce((s, d) => s + (d.total_leads || 0), 0);
  const closedDeals = leadsData.reduce((s, d) => s + (d.closed_deals || 0), 0);
  const revenue = leadsData.reduce((s, d) => s + (d.revenue_generated || 0), 0);

  const totalSpend = ppcData.reduce((s, d) => s + (d.spend || 0), 0);
  const totalClicks = ppcData.reduce((s, d) => s + (d.clicks || 0), 0);
  const avgCPC = totalSpend && totalClicks ? (totalSpend / totalClicks).toFixed(2) : null;

  const seoWithPos = seoData.filter(d => d.avg_position);
  const avgPosition = seoWithPos.length ? (seoWithPos.reduce((s, d) => s + d.avg_position, 0) / seoWithPos.length).toFixed(1) : null;
  const totalOrganicClicks = seoData.reduce((s, d) => s + (d.organic_clicks || 0), 0);
  const totalImpressions = seoData.reduce((s, d) => s + (d.organic_impressions || 0), 0);

  // ── Month lookup helpers ──────────────────────────────────────────
  const getMonthRecord = (arr, monthName) =>
    arr.find(d => {
      if (!d.report_date) return false;
      const mn = new Date(d.report_date + "T12:00:00").toLocaleString("en-US", { month: "long" });
      return mn === monthName;
    });

  const fmt = (n, prefix = "", suffix = "") => n != null ? `${prefix}${Number(n).toLocaleString()}${suffix}` : "—";

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= 2023; y--) yearOptions.push(y);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClientSelect clients={clients} value={selectedClientId} onChange={setSelectedClientId} />
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ChannelCard
          title="Leads (GHL)"
          icon={Users}
          color={{ border: "border-teal-100", bg: "bg-teal-50", iconBg: "bg-teal-500", text: "text-teal-700" }}
          metrics={[
            { label: "Total Leads", value: leadsData.length ? fmt(totalLeads) : null },
            { label: "Closed Deals", value: leadsData.length ? fmt(closedDeals) : null },
            { label: "Revenue", value: leadsData.length && revenue ? `$${Number(revenue).toLocaleString()}` : null },
          ]}
        />
        <ChannelCard
          title="PPC (Google Ads)"
          icon={MousePointerClick}
          color={{ border: "border-blue-100", bg: "bg-blue-50", iconBg: "bg-blue-500", text: "text-blue-700" }}
          metrics={[
            { label: "Total Spend", value: ppcData.length ? `$${Number(totalSpend).toLocaleString()}` : null },
            { label: "Total Clicks", value: ppcData.length ? fmt(totalClicks) : null },
            { label: "Avg CPC", value: avgCPC ? `$${avgCPC}` : null },
          ]}
        />
        <ChannelCard
          title="SEO (Search Console)"
          icon={TrendingUp}
          color={{ border: "border-violet-100", bg: "bg-violet-50", iconBg: "bg-violet-500", text: "text-violet-700" }}
          metrics={[
            { label: "Organic Clicks", value: seoData.length ? fmt(totalOrganicClicks) : null },
            { label: "Impressions", value: seoData.length ? fmt(totalImpressions) : null },
            { label: "Avg Position", value: avgPosition },
          ]}
        />
      </div>

      {/* Month-by-Month Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Month-by-Month Breakdown</h2>
          <span className="text-xs text-slate-400">Jan – {activeMonths[activeMonths.length - 1]} {year}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-semibold">
                <th className="px-4 py-3 text-left w-28">Month</th>
                {/* Leads */}
                <th className={`px-3 py-3 text-right ${!leadsData.length ? "text-slate-300" : "text-teal-600"}`}>Leads</th>
                <th className={`px-3 py-3 text-right ${!leadsData.length ? "text-slate-300" : "text-teal-600"}`}>Closed</th>
                <th className={`px-3 py-3 text-right ${!leadsData.length ? "text-slate-300" : "text-teal-600"}`}>Revenue</th>
                {/* Divider */}
                <th className="px-1 py-3 text-slate-200">|</th>
                {/* PPC */}
                <th className={`px-3 py-3 text-right ${!ppcData.length ? "text-slate-300" : "text-blue-600"}`}>Spend</th>
                <th className={`px-3 py-3 text-right ${!ppcData.length ? "text-slate-300" : "text-blue-600"}`}>Clicks</th>
                <th className={`px-3 py-3 text-right ${!ppcData.length ? "text-slate-300" : "text-blue-600"}`}>CPC</th>
                {/* Divider */}
                <th className="px-1 py-3 text-slate-200">|</th>
                {/* SEO */}
                <th className={`px-3 py-3 text-right ${!seoData.length ? "text-slate-300" : "text-violet-600"}`}>Org. Clicks</th>
                <th className={`px-3 py-3 text-right ${!seoData.length ? "text-slate-300" : "text-violet-600"}`}>Impressions</th>
                <th className={`px-3 py-3 text-right ${!seoData.length ? "text-slate-300" : "text-violet-600"}`}>Avg Pos.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeMonths.map(monthName => {
                const ld = getMonthRecord(leadsData, monthName);
                const pd = getMonthRecord(ppcData, monthName);
                const sd = getMonthRecord(seoData, monthName);
                const hasAny = ld || pd || sd;
                return (
                  <tr key={monthName} className={`hover:bg-slate-50 transition-colors ${!hasAny ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-700">{monthName.slice(0, 3)}</td>
                    {/* Leads */}
                    <td className="px-3 py-3 text-right text-slate-600">{ld ? fmt(ld.total_leads) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{ld ? fmt(ld.closed_deals) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{ld?.revenue_generated ? `$${Number(ld.revenue_generated).toLocaleString()}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-1 py-3 text-slate-100">|</td>
                    {/* PPC */}
                    <td className="px-3 py-3 text-right text-slate-600">{pd?.spend ? `$${Number(pd.spend).toLocaleString()}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{pd?.clicks ? fmt(pd.clicks) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{pd?.cpc ? `$${pd.cpc}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-1 py-3 text-slate-100">|</td>
                    {/* SEO */}
                    <td className="px-3 py-3 text-right text-slate-600">{sd?.organic_clicks ? fmt(sd.organic_clicks) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{sd?.organic_impressions ? fmt(sd.organic_impressions) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{sd?.avg_position ? sd.avg_position : <span className="text-slate-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-xs border-t border-slate-200">
                <td className="px-4 py-3 text-slate-600 uppercase tracking-wide">YTD Total</td>
                <td className="px-3 py-3 text-right text-teal-700">{leadsData.length ? fmt(totalLeads) : "—"}</td>
                <td className="px-3 py-3 text-right text-teal-700">{leadsData.length ? fmt(closedDeals) : "—"}</td>
                <td className="px-3 py-3 text-right text-teal-700">{leadsData.length && revenue ? `$${Number(revenue).toLocaleString()}` : "—"}</td>
                <td className="px-1 py-3 text-slate-200">|</td>
                <td className="px-3 py-3 text-right text-blue-700">{ppcData.length ? `$${Number(totalSpend).toLocaleString()}` : "—"}</td>
                <td className="px-3 py-3 text-right text-blue-700">{ppcData.length ? fmt(totalClicks) : "—"}</td>
                <td className="px-3 py-3 text-right text-blue-700">{avgCPC ? `$${avgCPC}` : "—"}</td>
                <td className="px-1 py-3 text-slate-200">|</td>
                <td className="px-3 py-3 text-right text-violet-700">{seoData.length ? fmt(totalOrganicClicks) : "—"}</td>
                <td className="px-3 py-3 text-right text-violet-700">{seoData.length ? fmt(totalImpressions) : "—"}</td>
                <td className="px-3 py-3 text-right text-violet-700">{avgPosition ?? "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}