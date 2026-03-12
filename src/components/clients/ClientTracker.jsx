import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckSquare, Search, Plus, ChevronDown, ChevronUp } from "lucide-react";
import TrackerItemRow from "./TrackerItemRow";

const ALLOWED_ROLES = ["admin", "leadership", "team_lead", "csm"];

function normalizeItem(item) {
  if (typeof item === "string") return { text: item, date: null, resolved: false, team: null, point_person: null, solution: null };
  return item;
}

function SectionHeader({ icon: Icon, label, count, color, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-5 py-3.5 border-b ${color.border} ${color.bg} text-left`}
    >
      <Icon className={`w-4 h-4 ${color.icon}`} />
      <h3 className={`font-semibold text-sm ${color.title}`}>{label}</h3>
      {count > 0 && (
        <span className={`ml-2 text-xs ${color.badge} px-2 py-0.5 rounded-full font-medium`}>{count} open</span>
      )}
      <span className="ml-auto text-slate-400">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
    </button>
  );
}

export default function ClientTracker({ clientId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("active"); // "active" | "history"
  const [searchQuery, setSearchQuery] = useState("");
  const [flagsOpen, setFlagsOpen] = useState(true);
  const [todosOpen, setTodosOpen] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadInsights();
  }, [clientId]);

  const loadInsights = async () => {
    setLoading(true);
    const data = await base44.entities.ClientInsight.filter({ client_id: clientId }, "-created_date");
    setInsights(data);
    setLoading(false);
  };

  const canEdit = ALLOWED_ROLES.includes(user?.role);

  const updateItem = async (insight, field, index, newItem) => {
    const items = (insight[field] || []).map(normalizeItem);
    items[index] = newItem;
    await base44.entities.ClientInsight.update(insight.id, { [field]: items });
    loadInsights();
  };

  const deleteItem = async (insight, field, index) => {
    const items = (insight[field] || []).map(normalizeItem).filter((_, i) => i !== index);
    await base44.entities.ClientInsight.update(insight.id, { [field]: items });
    loadInsights();
  };

  const toggleResolved = async (insight, field, index) => {
    const items = (insight[field] || []).map(normalizeItem);
    items[index] = { ...items[index], resolved: !items[index].resolved };
    await base44.entities.ClientInsight.update(insight.id, { [field]: items });
    loadInsights();
  };

  const addItem = async (field) => {
    // Add to the most recent insight, or first one found
    const target = insights[0];
    if (!target) return;
    const items = (target[field] || []).map(normalizeItem);
    items.push({ text: "New item", date: null, resolved: false, team: null, point_person: null, solution: null });
    await base44.entities.ClientInsight.update(target.id, { [field]: items });
    loadInsights();
  };

  // Flatten all items across insights
  const allItems = useMemo(() => {
    const todos = [];
    const redFlags = [];
    insights.forEach(insight => {
      (insight.todos || []).forEach((item, i) => {
        todos.push({ ...normalizeItem(item), insightId: insight.id, insightRef: insight, index: i, meeting_date: insight.meeting_date, source_type: insight.source_type });
      });
      (insight.red_flags || []).forEach((item, i) => {
        redFlags.push({ ...normalizeItem(item), insightId: insight.id, insightRef: insight, index: i, meeting_date: insight.meeting_date, source_type: insight.source_type });
      });
    });
    return { todos, redFlags };
  }, [insights]);

  // Filter by tab + search
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const match = (item) => !q || item.text?.toLowerCase().includes(q) || item.team?.toLowerCase().includes(q) || item.point_person?.toLowerCase().includes(q) || item.solution?.toLowerCase().includes(q);

    if (tab === "active") {
      return {
        todos: allItems.todos.filter(t => !t.resolved && match(t)),
        redFlags: allItems.redFlags.filter(f => !f.resolved && match(f)),
        doneTodos: allItems.todos.filter(t => t.resolved && match(t)),
        resolvedFlags: allItems.redFlags.filter(f => f.resolved && match(f)),
      };
    } else {
      return {
        todos: allItems.todos.filter(t => t.resolved && match(t)),
        redFlags: allItems.redFlags.filter(f => f.resolved && match(f)),
        doneTodos: [],
        resolvedFlags: [],
      };
    }
  }, [allItems, tab, searchQuery]);

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>;

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200">
        No insights logged yet. Use the Client Insights page to add meeting notes.
      </div>
    );
  }

  const showEmpty = (items) => items.length === 0 && !searchQuery;

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {["active", "history"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {t === "active" ? "Active" : "History"}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, teams, people..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Red Flags Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <SectionHeader
          icon={AlertTriangle}
          label={tab === "active" ? "Red Flags" : "Resolved Red Flags"}
          count={tab === "active" ? filtered.redFlags.length : 0}
          open={flagsOpen}
          onToggle={() => setFlagsOpen(v => !v)}
          color={{ bg: "bg-red-50", border: "border-red-100", icon: "text-red-500", title: "text-red-700", badge: "bg-red-100 text-red-700" }}
        />
        {flagsOpen && (
          <div className="p-4 space-y-2">
            {tab === "active" && filtered.redFlags.length === 0 && showEmpty(filtered.redFlags) && (
              <p className="text-sm text-slate-400 text-center py-2">No open red flags — great!</p>
            )}
            {filtered.redFlags.map((item, i) => (
              <TrackerItemRow
                key={`flag-${item.insightId}-${item.index}`}
                item={item}
                type="red_flags"
                canEdit={canEdit}
                onSave={(newItem) => updateItem(item.insightRef, "red_flags", item.index, newItem)}
                onDelete={canEdit ? () => deleteItem(item.insightRef, "red_flags", item.index) : null}
                onToggleResolved={() => toggleResolved(item.insightRef, "red_flags", item.index)}
              />
            ))}
            {/* Active tab: resolved flags collapsible */}
            {tab === "active" && allItems.redFlags.filter(f => f.resolved).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                  {allItems.redFlags.filter(f => f.resolved).length} resolved
                </summary>
                <div className="space-y-2 mt-2">
                  {allItems.redFlags.filter(f => f.resolved).map((item) => (
                    <TrackerItemRow
                      key={`rflag-${item.insightId}-${item.index}`}
                      item={item}
                      type="red_flags"
                      canEdit={canEdit}
                      onSave={(newItem) => updateItem(item.insightRef, "red_flags", item.index, newItem)}
                      onDelete={canEdit ? () => deleteItem(item.insightRef, "red_flags", item.index) : null}
                      onToggleResolved={() => toggleResolved(item.insightRef, "red_flags", item.index)}
                    />
                  ))}
                </div>
              </details>
            )}
            {canEdit && tab === "active" && (
              <button onClick={() => addItem("red_flags")} className="w-full text-xs text-red-400 hover:text-red-600 border border-dashed border-red-200 rounded-lg py-2 flex items-center justify-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> Add Red Flag
              </button>
            )}
            {tab === "history" && filtered.redFlags.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">{searchQuery ? "No results." : "No resolved red flags yet."}</p>
            )}
          </div>
        )}
      </div>

      {/* To-Dos Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <SectionHeader
          icon={CheckSquare}
          label={tab === "active" ? "To-Dos" : "Completed To-Dos"}
          count={tab === "active" ? filtered.todos.length : 0}
          open={todosOpen}
          onToggle={() => setTodosOpen(v => !v)}
          color={{ bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500", title: "text-blue-700", badge: "bg-blue-100 text-blue-700" }}
        />
        {todosOpen && (
          <div className="p-4 space-y-2">
            {tab === "active" && filtered.todos.length === 0 && showEmpty(filtered.todos) && (
              <p className="text-sm text-slate-400 text-center py-2">No open to-dos.</p>
            )}
            {filtered.todos.map((item) => (
              <TrackerItemRow
                key={`todo-${item.insightId}-${item.index}`}
                item={item}
                type="todos"
                canEdit={canEdit}
                onSave={(newItem) => updateItem(item.insightRef, "todos", item.index, newItem)}
                onDelete={canEdit ? () => deleteItem(item.insightRef, "todos", item.index) : null}
                onToggleResolved={() => toggleResolved(item.insightRef, "todos", item.index)}
              />
            ))}
            {/* Active tab: completed todos collapsible */}
            {tab === "active" && allItems.todos.filter(t => t.resolved).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                  {allItems.todos.filter(t => t.resolved).length} completed
                </summary>
                <div className="space-y-2 mt-2">
                  {allItems.todos.filter(t => t.resolved).map((item) => (
                    <TrackerItemRow
                      key={`dtodo-${item.insightId}-${item.index}`}
                      item={item}
                      type="todos"
                      canEdit={canEdit}
                      onSave={(newItem) => updateItem(item.insightRef, "todos", item.index, newItem)}
                      onDelete={canEdit ? () => deleteItem(item.insightRef, "todos", item.index) : null}
                      onToggleResolved={() => toggleResolved(item.insightRef, "todos", item.index)}
                    />
                  ))}
                </div>
              </details>
            )}
            {canEdit && tab === "active" && (
              <button onClick={() => addItem("todos")} className="w-full text-xs text-blue-400 hover:text-blue-600 border border-dashed border-blue-200 rounded-lg py-2 flex items-center justify-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> Add To-Do
              </button>
            )}
            {tab === "history" && filtered.todos.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">{searchQuery ? "No results." : "No completed to-dos yet."}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}