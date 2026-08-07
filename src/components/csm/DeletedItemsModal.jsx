import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckSquare, RotateCcw, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

function DeletedRow({ item, type, onRestore, onPermanentDelete }) {
  const [confirming, setConfirming] = useState(false);
  const color = type === "red_flags" ? "text-red-700" : "text-slate-700";
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex-1 min-w-0">
        <span className={`text-sm line-through ${color}`}>{item.text}</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {item.team && <span className="text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{item.team}</span>}
          {item.point_person && <span className="text-xs text-slate-400">@ {item.point_person}</span>}
          {item.deleted_at && (
            <span className="text-xs text-slate-400">Deleted {format(parseISO(item.deleted_at), "MMM d, yyyy")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          onClick={() => onRestore(item._index)}
        >
          <RotateCcw className="w-3 h-3" /> Restore
        </Button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="destructive" onClick={() => onPermanentDelete(item._index)}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-600"
            onClick={() => setConfirming(true)}
            title="Remove permanently"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </li>
  );
}

export default function DeletedItemsModal({ open, onClose, redFlags, todos, onRestore, onPermanentDelete }) {
  const total = redFlags.length + todos.length;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deleted Items</DialogTitle>
          <DialogDescription>
            {total} soft-deleted item{total !== 1 ? "s" : ""}. Restore to return to active, or remove permanently.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {redFlags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-2">
                <AlertTriangle className="w-4 h-4" /> Red Flags ({redFlags.length})
              </div>
              <ul className="space-y-1.5">
                {redFlags.map((f) => (
                  <DeletedRow
                    key={`rf-${f._index}`}
                    item={f}
                    type="red_flags"
                    onRestore={(i) => onRestore("red_flags", i)}
                    onPermanentDelete={(i) => onPermanentDelete("red_flags", i)}
                  />
                ))}
              </ul>
            </div>
          )}
          {todos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-2">
                <CheckSquare className="w-4 h-4" /> To-Dos ({todos.length})
              </div>
              <ul className="space-y-1.5">
                {todos.map((t) => (
                  <DeletedRow
                    key={`td-${t._index}`}
                    item={t}
                    type="todos"
                    onRestore={(i) => onRestore("todos", i)}
                    onPermanentDelete={(i) => onPermanentDelete("todos", i)}
                  />
                ))}
              </ul>
            </div>
          )}
          {total === 0 && <p className="text-sm text-slate-400 text-center py-4">No deleted items.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}