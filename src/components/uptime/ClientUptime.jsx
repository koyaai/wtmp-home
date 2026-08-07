import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Activity, ExternalLink } from "lucide-react";
import StatusDot from "@/components/uptime/StatusDot";
import UptimeHistoryList from "@/components/uptime/UptimeHistoryList";
import {
  formatManilaDateTime,
  uptimePercent,
  uptimePillClass,
  formatPct,
} from "@/utils/uptime";

export default function ClientUptime({ clientId }) {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState([]);
  const [checksBySite, setChecksBySite] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const sites = await base44.entities.Website.filter(
          { client_id: clientId },
          "-created_date",
          200
        );
        setWebsites(sites);
        const map = {};
        await Promise.all(
          sites.map(async (s) => {
            map[s.id] = await base44.entities.UptimeCheck.filter(
              { website_id: s.id },
              "-checked_at",
              200
            );
          })
        );
        setChecksBySite(map);
      } catch (e) {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200">
        No websites monitored for this client yet. Add sites from the Uptime
        Monitor page.
      </div>
    );
  }

  const allChecks = websites
    .flatMap((s) =>
      (checksBySite[s.id] || []).map((c) => ({ ...c, website_name: s.name }))
    )
    .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))
    .slice(0, 100);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium">Site</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Last Checked</th>
                <th className="px-4 py-3 text-left font-medium">Uptime 24h</th>
                <th className="px-4 py-3 text-left font-medium">Uptime 7d</th>
              </tr>
            </thead>
            <tbody>
              {websites.map((s) => {
                const checks = checksBySite[s.id] || [];
                const latest = checks[0];
                const status = latest?.status || "pending";
                const up24 = uptimePercent(checks, 24);
                const up7d = uptimePercent(checks, 168);
                return (
                  <tr
                    key={s.id}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/WebsiteDetail/${s.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{s.name}</div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {s.url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot status={status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {latest ? formatManilaDateTime(latest.checked_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${uptimePillClass(
                          up24
                        )}`}
                      >
                        {formatPct(up24)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${uptimePillClass(
                          up7d
                        )}`}
                      >
                        {formatPct(up7d)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> Recent Checks
        </h2>
        <UptimeHistoryList
          checks={allChecks}
          showSiteName
          emptyMsg="No checks recorded yet."
        />
      </div>
    </div>
  );
}