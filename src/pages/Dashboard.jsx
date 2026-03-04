import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const statusColors = {
  active: "bg-emerald-100 text-emerald-700",
  onboarding: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  churned: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Client.list("-created_date", 100),
      base44.entities.CSMUpdate.list("-created_date", 10),
      base44.auth.me().catch(() => null),
    ]).then(([c, u, me]) => {
      setClients(c);
      setUpdates(u);
      setUser(me);
      setLoading(false);
    });
  }, []);

  const activeClients = clients.filter(c => c.status === "active");
  const onboardingClients = clients.filter(c => c.status === "onboarding");
  const totalMRR = clients.filter(c => c.status === "active").reduce((sum, c) => sum + (c.retainer_fee || 0), 0);
  const churnRisks = updates.filter(u => u.update_type === "churn_risk");

  const userRole = user?.role;
  const showFinancials = ["leadership"].includes(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Command Center</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={clients.length} subtitle={`${activeClients.length} active`} icon={Users} color="bg-blue-500" />
        <StatCard title="Onboarding" value={onboardingClients.length} subtitle="In progress" icon={Clock} color="bg-amber-500" />
        {showFinancials && (
          <StatCard title="Monthly MRR" value={`$${totalMRR.toLocaleString()}`} subtitle="Active clients only" icon={DollarSign} color="bg-emerald-500" />
        )}
        <StatCard title="Churn Risks" value={churnRisks.length} subtitle="Flagged by CSMs" icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Active Clients</h2>
            <Link to={createPageUrl("Clients")} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activeClients.slice(0, 8).map(client => (
              <Link key={client.id} to={createPageUrl(`Clients`) + `?id=${client.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{client.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{client.name}</p>
                    <p className="text-xs text-slate-400">{client.location || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[140px]">
                    {client.services?.slice(0, 2).map(s => (
                      <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[client.status]}`}>
                    {client.status}
                  </span>
                </div>
              </Link>
            ))}
            {activeClients.length === 0 && (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">No active clients yet. Add your first client!</div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent CSM Updates</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {updates.slice(0, 6).map(update => {
              const typeColors = {
                win: "text-emerald-600 bg-emerald-50",
                churn_risk: "text-red-600 bg-red-50",
                issue: "text-amber-600 bg-amber-50",
                upsell_opportunity: "text-blue-600 bg-blue-50",
                status_update: "text-slate-600 bg-slate-50",
                general: "text-slate-600 bg-slate-50",
              };
              return (
                <div key={update.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[update.update_type] || typeColors.general}`}>
                      {update.update_type?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(update.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{update.content}</p>
                </div>
              );
            })}
            {updates.length === 0 && (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">No updates yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Services Across All Clients</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {["SEO", "PPC", "Social Media", "Web Design", "GHL Automations", "Customer Success"].map(service => {
            const count = clients.filter(c => c.services?.includes(service)).length;
            return (
              <div key={service} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500 mt-1">{service}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}