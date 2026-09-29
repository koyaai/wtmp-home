import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckSquare, Search, Plus, ChevronDown, ChevronUp } from "lucide-react";
import TrackerItemRow from "./TrackerItemRow";
import AddTrackerItemForm from "./AddTrackerItemForm";
import { useSlackAnnounce } from "@/hooks/useSlackAnnounce.jsx";

const ALLOWED_ROLES = ["admin", "leadership", "team_lead", "csm"];

function TableSection({ items, type, emptyMsg, canEdit, onSave, onDelete, onToggle }) {
  if (items.length === 0 && emptyMsg) {
    return <p className="text-sm text-slate-400 text-center py-4">{emptyMsg}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
            <th className="pl-4 pr-2 py-2 w-8"></th>
            <th className="px-3 py-2 text-left font-medium">Task</th>
            <th className="px-3 py-2 text-left font-medium w-36">Team</th>
            <th className="px-3 py-2 text-left font-medium w-32">Point Person</th>
            <th className="px-3 py-2 text-left font-medium w-36">Deadline</th>
            <th className="px-3 py-2 text-left font-medium w-10">Slack</th>
            <th className="pr-4 pl-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <TrackerItemRow
              key={`${type}-${item.insightId}-${item.index}`}
              item={item}
              type={type}
              canEdit={canEdit}
              onSave={(newItem) => onSave(item, newItem)}
              onDelete={() => onDelete(item)}
              onToggleResolved={() => onToggle(item)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

export default function ClientTracker({ clientId, onDataChange }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("active"); // "active" | "history"
  const [searchQuery, setSearchQuery] = useState("");
  const [flagsOpen, setFlagsOpen] = useState(true);
  const [todosOpen, setTodosOpen] = useState(true);
  const [adding, setAdding] = useState(null); // "red_flags" | "todos" | null
  const { prompt: promptSlack, toastElement: slackToast } = useSlackAnnounce(clientId);

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
    onDataChange?.();
    promptSlack({ type: field === "red_flags" ? "red_flag_updated" : "todo_updated", text: newItem.text });
  };

  const deleteItem = async (insight, field, index) => {
    const itemText = normalizeItem(insight[field][index]).text;
    const items = (insight[field] || []).map(normalizeItem);
    items[index] = { ...items[index], deleted: true, deleted_at: new Date().toISOString() };
    await base44.entities.ClientInsight.update(insight.id, { [field]: items });
    loadInsights();
    onDataChange?.();
    promptSlack({ type: field === "red_flags" ? "red_flag_deleted" : "todo_deleted", text: itemText });
  };

  const toggleResolved = async (insight, field, index) => {
    const items = (insight[field] || []).map(normalizeItem);
    const wasResolved = items[index].resolved;
    items[index] = { ...items[index], resolved: !wasResolved };
    await base44.entities.ClientInsight.update(insight.id, { [field]: items });
    loadInsights();
    onDataChange?.();
    const isFlag = field === "red_flags";
    const text = items[index].text;
    if (!wasResolved) {
      promptSlack({ type: isFlag ? "red_flag_resolved" : "todo_completed", text });
    } else {
      promptSlack({ type: isFlag ? "red_flag_reopened" : "todo_reopened", text });
    }
  };

  const addItem = async (field, newItem) => {
    // Add to the most recent insight, or first one found
    const target = insights[0];
    if (!target) return;
    const items = (target[field] || []).map(normalizeItem);
    items.push(newItem);
    await base44.entities.ClientInsight.update(target.id, { [field]: items });
    loadInsights();
    onDataChange?.();
    setAdding(null);
    promptSlack({ type: field === "red_flags" ? "red_flag_added" : "todo_added", text: newItem.text });
  };

  // Flatten all items across insights
  const allItems = useMemo(() => {
    const todos = [];
    const redFlags = [];
    insights.forEach(insight => {
      (insight.todos || []).forEach((item, i) => {
        const norm = normalizeItem(item);
        if (norm.deleted) return;
        todos.push({ ...norm, insightId: insight.id, insightRef: insight, index: i, meeting_date: insight.meeting_date, source_type: insight.source_type });
      });
      (insight.red_flags || []).forEach((item, i) => {
        const norm = normalizeItem(item);
        if (norm.deleted) return;
        redFlags.push({ ...norm, insightId: insight.id, insightRef: insight, index: i, meeting_date: insight.meeting_date, source_type: insight.source_type });
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
          <div>
            <TableSection
              items={filtered.redFlags}
              type="red_flags"
              emptyMsg={tab === "active" ? "No open red flags — great!" : searchQuery ? "No results." : "No resolved red flags yet."}
              canEdit={canEdit}
              onSave={(item, newItem) => updateItem(item.insightRef, "red_flags", item.index, newItem)}
              onDelete={(item) => deleteItem(item.insightRef, "red_flags", item.index)}
              onToggle={(item) => toggleResolved(item.insightRef, "red_flags", item.index)}
            />
            {tab === "active" && allItems.redFlags.filter(f => f.resolved).length > 0 && (
              <details className="border-t border-slate-100">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 px-4 py-2">
                  {allItems.redFlags.filter(f => f.resolved).length} resolved
                </summary>
                <TableSection
                  items={allItems.redFlags.filter(f => f.resolved)}
                  type="red_flags"
                  canEdit={canEdit}
                  onSave={(item, newItem) => updateItem(item.insightRef, "red_flags", item.index, newItem)}
                  onDelete={(item) => deleteItem(item.insightRef, "red_flags", item.index)}
                  onToggle={(item) => toggleResolved(item.insightRef, "red_flags", item.index)}
                />
              </details>
            )}
            {canEdit && tab === "active" && !adding && (
              <button onClick={() => setAdding("red_flags")} className="w-full text-xs text-red-400 hover:text-red-600 border-t border-dashed border-red-200 py-2.5 flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Add Red Flag
              </button>
            )}
            {adding === "red_flags" && (
              <table className="w-full text-sm">
                <tbody>
                  <AddTrackerItemForm
                    type="red_flags"
                    onSave={(newItem) => addItem("red_flags", newItem)}
                    onCancel={() => setAdding(null)}
                  />
                </tbody>
              </table>
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
          <div>
            <TableSection
              items={filtered.todos}
              type="todos"
              emptyMsg={tab === "active" ? "No open to-dos." : searchQuery ? "No results." : "No completed to-dos yet."}
              canEdit={canEdit}
              onSave={(item, newItem) => updateItem(item.insightRef, "todos", item.index, newItem)}
              onDelete={(item) => deleteItem(item.insightRef, "todos", item.index)}
              onToggle={(item) => toggleResolved(item.insightRef, "todos", item.index)}
            />
            {tab === "active" && allItems.todos.filter(t => t.resolved).length > 0 && (
              <details className="border-t border-slate-100">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 px-4 py-2">
                  {allItems.todos.filter(t => t.resolved).length} completed
                </summary>
                <TableSection
                  items={allItems.todos.filter(t => t.resolved)}
                  type="todos"
                  canEdit={canEdit}
                  onSave={(item, newItem) => updateItem(item.insightRef, "todos", item.index, newItem)}
                  onDelete={(item) => deleteItem(item.insightRef, "todos", item.index)}
                  onToggle={(item) => toggleResolved(item.insightRef, "todos", item.index)}
                />
              </details>
            )}
            {canEdit && tab === "active" && !adding && (
              <button onClick={() => setAdding("todos")} className="w-full text-xs text-blue-400 hover:text-blue-600 border-t border-dashed border-blue-200 py-2.5 flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Add To-Do
              </button>
            )}
            {adding === "todos" && (
              <table className="w-full text-sm">
                <tbody>
                  <AddTrackerItemForm
                    type="todos"
                    onSave={(newItem) => addItem("todos", newItem)}
                    onCancel={() => setAdding(null)}
                  />
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      {slackToast}
    </div>
  );
}