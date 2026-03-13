import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Edit, Trash2, Globe, Phone, Mail, MapPin, DollarSign, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import MeetingNotes from "@/components/clients/MeetingNotes";
import CSMUpdates from "@/components/clients/CSMUpdates";
import ClientTracker from "@/components/clients/ClientTracker";
import ClientSnapshot from "@/components/clients/ClientSnapshot";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700",
  onboarding: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  churned: "bg-red-100 text-red-700",
};

const serviceColors = {
  "SEO": "bg-violet-100 text-violet-700",
  "PPC": "bg-blue-100 text-blue-700",
  "Social Media": "bg-pink-100 text-pink-700",
  "Web Design": "bg-orange-100 text-orange-700",
  "GHL Automations": "bg-cyan-100 text-cyan-700",
  "Customer Success": "bg-emerald-100 text-emerald-700",
};

export default function ClientDetail({ client, onEdit, onDelete, onBack, canEdit, userRole }) {
  const [activeTab, setActiveTab] = useState("snapshot");

  const showFinancials = ["leadership"].includes(userRole);

  const tabs = ["snapshot", "overview", "tracker", "meetings", "updates"];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      {/* Mobile Back */}
      <button onClick={onBack} className="md:hidden flex items-center gap-1 text-sm text-blue-600 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">{client.name?.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusColors[client.status]}`}>{client.status}</span>
                {client.location && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{client.location}</span>}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(client)} className="h-8 text-xs">
                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(client)} className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Services */}
        {client.services?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {client.services.map(s => (
              <span key={s} className={`text-xs px-2.5 py-1 rounded-full font-medium ${serviceColors[s] || "bg-slate-100 text-slate-600"}`}>{s}</span>
            ))}
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {client.contact_email && (
            <a href={`mailto:${client.contact_email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {client.contact_email}
            </a>
          )}
          {client.contact_phone && (
            <a href={`tel:${client.contact_phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {client.contact_phone}
            </a>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Website
            </a>
          )}
          {showFinancials && client.retainer_fee && (
            <span className="flex items-center gap-2 text-xs text-slate-600">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> ${client.retainer_fee?.toLocaleString()}/mo
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium capitalize transition-colors ${activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {tab === "updates" ? "CSM Updates" : tab === "tracker" ? "Tracker" : tab === "snapshot" ? "Dashboard" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          {client.csm_assigned && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Assigned CSM</p>
              <p className="text-sm text-slate-800">{client.csm_assigned}</p>
            </div>
          )}
          {client.start_date && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Client Since</p>
              <p className="text-sm text-slate-800">{new Date(client.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          )}
          {client.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          {/* Tech IDs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
            {client.ghl_location_id && <div><p className="text-xs text-slate-400">GHL Location ID</p><p className="text-xs font-mono text-slate-700">{client.ghl_location_id}</p></div>}
            {client.google_ads_account_id && <div><p className="text-xs text-slate-400">Google Ads ID</p><p className="text-xs font-mono text-slate-700">{client.google_ads_account_id}</p></div>}
            {client.google_search_console_url && <div><p className="text-xs text-slate-400">GSC URL</p><a href={client.google_search_console_url} target="_blank" className="text-xs text-blue-600 hover:underline">View GSC</a></div>}
            {client.gbp_url && <div><p className="text-xs text-slate-400">GBP URL</p><a href={client.gbp_url} target="_blank" className="text-xs text-blue-600 hover:underline">View GBP</a></div>}
          </div>
        </div>
      )}

      {activeTab === "tracker" && <ClientTracker clientId={client.id} />}
      {activeTab === "meetings" && <MeetingNotes clientId={client.id} canEdit={canEdit} />}
      {activeTab === "updates" && <CSMUpdates clientId={client.id} canEdit={canEdit} />}
    </div>
  );
}