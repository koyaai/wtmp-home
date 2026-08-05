import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SlackAnnounceToast({ toast, onConfirm, onSkip }) {
  if (!toast) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
      >
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {toast.mode === "no-channel" && (
            <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-slate-500">
              <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>No Slack channel set for this client.</span>
            </div>
          )}

          {toast.mode === "confirm" && (
            <div>
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-slate-700">Announce this change on Slack?</p>
                </div>
                <button onClick={onSkip} className="text-slate-300 hover:text-slate-500 -mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-2.5 mx-4 my-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{toast.preview || toast.text}</p>
              </div>
              <div className="flex gap-2 px-4 pb-3.5">
                <button
                  onClick={onConfirm}
                  disabled={toast.sending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {toast.sending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting...</>
                  ) : (
                    <>Post to Slack</>
                  )}
                </button>
                <button
                  onClick={onSkip}
                  disabled={toast.sending}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {toast.mode === "success" && (
            <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Posted to Slack successfully.</span>
            </div>
          )}

          {toast.mode === "error" && (
            <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{toast.error || "Failed to send to Slack."}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}