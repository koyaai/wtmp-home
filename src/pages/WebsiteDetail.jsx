import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Activity, ExternalLink } from "lucide-react";
import UptimeSummaryBar from "@/components/uptime/UptimeSummaryBar";
import UptimeHistoryList from "@/components/uptime/UptimeHistoryList";

export default function WebsiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const s = await base44.entities.Website.get(id);
        setSite(s);
        const c = await base44.entities.UptimeCheck.filter(
          { website_id: id },
          "-checked_at",
          500
        );
        setChecks(c);
      } catch (e) {
        setSite(null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-slate-500">Website not found.</p>
        <Link to="/UptimeMonitor" className="text-blue-600 hover:underline">
          ← Back to Uptime Monitor
        </Link>
      </div>
    );
  }

  const currentStatus = checks[0]?.status || "pending";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <button
        onClick={() => navigate("/UptimeMonitor")}
        className="flex items-center gap-1 text-sm text-blue-600 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Uptime Monitor
      </button>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> {site.name}
            </h1>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              {site.url} <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-xs text-slate-500 mt-1">Client: {site.client_name}</p>
          </div>
          <StatusBadge status={currentStatus} />
        </div>
        {site.notes && (
          <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
            {site.notes}
          </p>
        )}
      </div>

      <UptimeSummaryBar checks={checks} />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Check History</h2>
        <UptimeHistoryList checks={checks} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "up") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Up
      </span>
    );
  }
  if (status === "down") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 px-3 py-1 rounded-full">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Pending
    </span>
  );
}