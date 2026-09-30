import { CheckCircle2 } from "lucide-react";

function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function fmtNum(n) {
  return n != null && !isNaN(n) ? Number(n).toLocaleString() : null;
}

function MetricRow({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-2.5 text-center">
      <p className="text-base font-bold text-slate-800">{value ?? "—"}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function Chip({ children, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`text-xs ${tones[tone]} px-2 py-1 rounded-full truncate max-w-[220px]`}>{children}</span>
  );
}

function dateLabel(d) {
  if (!d) return "";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function SyncedSEOData({ ga, seo }) {
  if (!ga && !seo) return null;

  // GA4 derived values
  const gaSources = ga ? parseJsonArray(ga.traffic_sources) : [];
  const gaTotalSessions = gaSources.reduce((s, t) => s + (t.sessions || 0), 0) || ga?.sessions || 0;
  const organicSource = gaSources.find(s => (s.source || "").toLowerCase().includes("organic"));
  const gaTopPages = ga ? parseJsonArray(ga.top_pages) : [];

  // GSC derived values
  const seoKeywords = seo ? parseJsonArray(seo.top_keywords) : [];
  const seoPages = seo ? parseJsonArray(seo.top_pages) : [];

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-1.5 mb-3">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Synced Data (verified from GA4 + GSC)</p>
      </div>

      {ga && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-violet-600 mb-2">GA4 · {dateLabel(ga.report_date)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <MetricRow label="Sessions" value={fmtNum(ga.sessions)} />
            <MetricRow label="Engaged Sessions" value={fmtNum(ga.engaged_sessions)} />
            <MetricRow label="Users" value={fmtNum(ga.users)} />
            <MetricRow label="New Users" value={fmtNum(ga.new_users)} />
            <MetricRow label="Pageviews" value={fmtNum(ga.pageviews)} />
            <MetricRow label="Organic Sessions" value={fmtNum(organicSource?.sessions)} />
            <MetricRow label="Bounce Rate" value={ga.bounce_rate != null ? `${Math.round(ga.bounce_rate * 100)}%` : null} />
            <MetricRow label="Avg Session" value={ga.avg_session_duration != null ? `${Math.round(ga.avg_session_duration)}s` : null} />
          </div>

          {gaSources.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Traffic Sources</p>
              <div className="space-y-1.5">
                {gaSources.filter(t => t.sessions > 0).map(t => (
                  <div key={t.source} className="flex items-center gap-2">
                    <p className="text-xs text-slate-600 w-36 truncate flex-shrink-0">{t.source}</p>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, (t.sessions / gaTotalSessions) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 w-20 text-right">{t.sessions} ({Math.round((t.sessions / gaTotalSessions) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gaTopPages.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Top Pages</p>
              <div className="flex flex-wrap gap-1.5">
                {gaTopPages.slice(0, 8).map((p, i) => (
                  <Chip key={i} tone="violet">{typeof p === "string" ? p : p.page || p.path || p.title || JSON.stringify(p)}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {seo && (
        <div>
          <p className="text-xs font-semibold text-violet-600 mb-2">GSC · {dateLabel(seo.report_date)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <MetricRow label="Organic Clicks" value={fmtNum(seo.organic_clicks)} />
            <MetricRow label="Impressions" value={fmtNum(seo.organic_impressions)} />
            <MetricRow label="Avg Position" value={seo.avg_position != null ? Number(seo.avg_position).toFixed(1) : null} />
            <MetricRow label="CTR" value={seo.ctr != null ? `${(seo.ctr * 100).toFixed(1)}%` : null} />
            <MetricRow label="GBP Views" value={fmtNum(seo.gbp_views)} />
            <MetricRow label="GBP Calls" value={fmtNum(seo.gbp_calls)} />
            <MetricRow label="GBP Directions" value={fmtNum(seo.gbp_direction_requests)} />
          </div>

          {seoKeywords.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Top Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {seoKeywords.slice(0, 10).map((k, i) => (
                  <Chip key={i} tone="emerald">{typeof k === "string" ? k : k.keyword || k.query || JSON.stringify(k)}</Chip>
                ))}
              </div>
            </div>
          )}

          {seoPages.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Top Pages</p>
              <div className="flex flex-wrap gap-1.5">
                {seoPages.slice(0, 8).map((p, i) => (
                  <Chip key={i} tone="slate">{typeof p === "string" ? p : p.page || p.url || p.path || JSON.stringify(p)}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}