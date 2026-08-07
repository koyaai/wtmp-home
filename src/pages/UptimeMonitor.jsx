import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Pencil, ExternalLink } from "lucide-react";
import UptimeWebsiteForm from "@/components/uptime/UptimeWebsiteForm";
import StatusDot from "@/components/uptime/StatusDot";
import {
  formatManilaDateTime,
  uptimePercent,
  uptimePillClass,
  formatPct,
} from "@/utils/uptime";

export default function UptimeMonitor() {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState([]);
  const [clients, setClients] = useState([]);
  const [checksBySite, setChecksBySite] = useState({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sites, clis] = await Promise.all([
        base44.entities.Website.list("-created_date", 500),
        base44.entities.Client.list("-created_date", 500),
      ]);
      setWebsites(sites);
      setClients(clis);
      const checksMap = {};
      await Promise.all(
        sites.map(async (s) => {
          checksMap[s.id] = await base44.entities.UptimeCheck.filter(
            { website_id: s.id },
            "-checked_at",
            200
          );
        })
      );
      setChecksBySite(checksMap);
    } catch (e) {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const toggleActive = async (site) => {
    await base44.entities.Website.update(site.id, {
      is_active: !site.is_active,
    });
    load();
  };

  const rows = websites.map((s) => {
    const checks = checksBySite[s.id] || [];
    const latest = checks[0];
    const status = latest?.status || "pending";
    return { site: s, checks, latest, status };
  });
  rows.sort((a, b) => {
    if (a.status === "down" && b.status !== "down") return -1;
    if (b.status === "down" && a.status !== "down") return 1;
    return (a.site.name || "").localeCompare(b.site.name || "");
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Uptime Monitor
          </h1>
          <p className="text-sm text-slate-500">
            Real-time health of all client websites · checked hourly
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Website
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-dashed border-slate-200">
          No websites monitored yet. Click "Add Website" to link a client site.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Site</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Last Checked</th>
                  <th className="px-4 py-3 text-left font-medium">Uptime 24h</th>
                  <th className="px-4 py-3 text-left font-medium">Uptime 7d</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ site, checks, latest, status }) => {
                  const up24 = uptimePercent(checks, 24);
                  const up7d = uptimePercent(checks, 168);
                  return (
                    <tr
                      key={site.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/WebsiteDetail/${site.id}`)}
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {site.client_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {site.name}
                        </div>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {site.url} <ExternalLink className="w-3 h-3" />
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
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditing(site);
                              setFormOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(site)}
                            className={`text-xs px-2 py-1 rounded-md font-medium ${
                              site.is_active
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {site.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UptimeWebsiteForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSave}
        website={editing}
        clients={clients}
      />
    </div>
  );
}