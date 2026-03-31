import { useState } from "react";
import { Search } from "lucide-react";
import HealthBadge from "@/components/clients/HealthBadge";

const statusColors = {
  active: "bg-emerald-400",
  onboarding: "bg-blue-400",
  paused: "bg-amber-400",
  churned: "bg-red-400",
};

const programColors = {
  Growth: "bg-emerald-100 text-emerald-700",
  Outshine: "bg-violet-100 text-violet-700",
  Rocketfuel: "bg-orange-100 text-orange-700",
};

export default function ClientList({ clients, selectedId, onSelect, healthMap = {} }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  const filtered = clients.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    const matchProgram = programFilter === "all" || c.program === programFilter;
    return matchSearch && matchFilter && matchProgram;
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-1">
          {["all", "active", "onboarding", "paused"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-1 text-xs py-1 rounded-lg font-medium capitalize transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "Growth", "Outshine", "Rocketfuel"].map(p => (
            <button key={p} onClick={() => setProgramFilter(p)}
              className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${programFilter === p ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {filtered.map(client => (
          <button key={client.id} onClick={() => onSelect(client)}
            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedId === client.id ? "bg-blue-50 border-r-2 border-blue-600" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{client.name?.charAt(0)}</span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[client.status] || "bg-slate-400"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{client.name}</p>
                  {healthMap[client.id] && <HealthBadge score={healthMap[client.id].score} showDot />}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-400 truncate">{client.location || "No location"}</p>
                  {client.program && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${programColors[client.program]}`}>{client.program}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">No clients found</div>
        )}
      </div>
    </div>
  );
}