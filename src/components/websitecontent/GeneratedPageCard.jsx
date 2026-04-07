import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Check, Bookmark, Globe } from "lucide-react";
import WordPressPublishModal from "@/components/content/WordPressPublishModal";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const PAGE_LABELS = {
  home: 'Home', about: 'About Us', products: 'Products', services: 'Services',
  service_areas: 'Service Areas', gallery: 'Gallery',
  new_construction: 'New Construction', motorization: 'Motorization',
  blinds: 'Blinds', shades: 'Shades', shutters: 'Shutters', draperies: 'Draperies',
  wood_blinds: 'Wood Blinds', faux_wood_blinds: 'Faux Wood Blinds', vertical_blinds: 'Vertical Blinds',
  roller_shades: 'Roller Shades', roman_shades: 'Roman Shades',
  woven_wood_shades: 'Woven Wood Shades', honeycomb_shades: 'Honeycomb Shades',
  plantation_shutters: 'Plantation Shutters', wood_shutters: 'Wood Shutters',
  composite_shutters: 'Composite Shutters', vinyl_shutters: 'Vinyl Shutters',
};

const BADGE_COLORS = {
  home: 'bg-blue-100 text-blue-700', about: 'bg-purple-100 text-purple-700',
  products: 'bg-indigo-100 text-indigo-700', services: 'bg-cyan-100 text-cyan-700',
  service_areas: 'bg-teal-100 text-teal-700', gallery: 'bg-pink-100 text-pink-700',
  new_construction: 'bg-orange-100 text-orange-700', motorization: 'bg-green-100 text-green-700',
  blinds: 'bg-amber-100 text-amber-700', shades: 'bg-sky-100 text-sky-700',
  shutters: 'bg-rose-100 text-rose-700', draperies: 'bg-fuchsia-100 text-fuchsia-700',
};

export default function GeneratedPageCard({ page, onSaveToLibrary, client }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWpModal, setShowWpModal] = useState(false);

  const handleCopy = () => {
    const text = `H1: ${page.h1}\nMeta: ${page.meta_description}\n\n${page.content}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await onSaveToLibrary();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const badgeColor = BADGE_COLORS[page.page_key] || 'bg-slate-100 text-slate-600';
  const label = PAGE_LABELS[page.page_key] || page.page_name;

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex-1 min-w-0">
          <Badge className={`${badgeColor} mb-1.5`}>{label}</Badge>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{page.h1}</h3>
          {page.meta_description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{page.meta_description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button onClick={handleSave} title="Save to Content Library"
            className={`p-1.5 rounded-lg transition-colors ${saved ? 'text-green-500' : 'text-slate-300 hover:text-blue-500'}`}>
            <Bookmark className="w-4 h-4" />
          </button>
          {client?.wordpress_url && (
            <button onClick={() => setShowWpModal(true)} title="Publish to WordPress as Page"
              className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg transition-colors">
              <Globe className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showWpModal && (
        <WordPressPublishModal
          item={{ title: page.h1 || page.page_name, final_content: `${page.content}` }}
          client={client}
          defaultPostType="page"
          onClose={() => setShowWpModal(false)}
        />
      )}

      {expanded && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          <div className="prose prose-sm prose-slate max-w-none max-h-[600px] overflow-y-auto text-sm leading-relaxed">
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}