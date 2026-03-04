import { Trash2, Edit, ChevronDown } from "lucide-react";
import { useState } from "react";

const platformIcons = {
  "Instagram": "📸",
  "Facebook": "👍",
  "TikTok": "🎵",
  "LinkedIn": "💼",
  "YouTube": "▶️",
  "Google Business Profile": "📍",
  "Blog": "✍️",
  "Other": "📢",
};

const statusColors = {
  idea: "bg-slate-100 text-slate-600 border-slate-200",
  in_production: "bg-amber-100 text-amber-700 border-amber-200",
  ready_for_review: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  scheduled: "bg-cyan-100 text-cyan-700 border-cyan-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUSES = ["idea", "in_production", "ready_for_review", "approved", "scheduled", "published"];

export default function ContentCard({ post, clients, canEdit, onEdit, onDelete, onStatusChange }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const client = clients.find(c => c.id === post.client_id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{platformIcons[post.platform] || "📢"}</span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{post.platform}</p>
              <p className="text-xs text-slate-400">{post.content_type}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <button onClick={onEdit} className="text-slate-300 hover:text-blue-500 p-1">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="text-slate-300 hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="font-semibold text-slate-800 text-sm mt-2 leading-snug">{post.title}</p>

        {/* Client */}
        {client && (
          <p className="text-xs text-slate-400 mt-1">{client.name}</p>
        )}
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-2">
        {post.topic && (
          <div>
            <p className="text-xs font-semibold text-slate-500">Topic</p>
            <p className="text-xs text-slate-600 line-clamp-2">{post.topic}</p>
          </div>
        )}
        {post.caption_direction && (
          <div>
            <p className="text-xs font-semibold text-slate-500">Caption Direction</p>
            <p className="text-xs text-slate-600 line-clamp-2">{post.caption_direction}</p>
          </div>
        )}
        {post.visual_direction && (
          <div>
            <p className="text-xs font-semibold text-slate-500">Visual Direction</p>
            <p className="text-xs text-slate-600 line-clamp-2">{post.visual_direction}</p>
          </div>
        )}
        {post.cta && (
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-blue-600">CTA: <span className="font-normal">{post.cta}</span></p>
          </div>
        )}
        {post.scheduled_date && (
          <p className="text-xs text-slate-400">📅 {new Date(post.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        )}
        {post.assigned_to && (
          <p className="text-xs text-slate-400">👤 {post.assigned_to}</p>
        )}
      </div>

      {/* Status */}
      <div className="px-4 pb-4 relative">
        <button onClick={() => canEdit && setShowStatusMenu(!showStatusMenu)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border capitalize ${statusColors[post.status] || statusColors.idea} ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}>
          {post.status?.replace("_", " ")}
          {canEdit && <ChevronDown className="w-3 h-3" />}
        </button>
        {showStatusMenu && canEdit && (
          <div className="absolute bottom-full left-4 mb-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-10">
            {STATUSES.map(s => (
              <button key={s} onClick={() => { onStatusChange(s); setShowStatusMenu(false); }}
                className="w-full text-left px-4 py-2 text-xs capitalize hover:bg-slate-50 font-medium text-slate-700">
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}