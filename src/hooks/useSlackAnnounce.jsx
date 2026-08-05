import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import SlackAnnounceToast from "@/components/clients/SlackAnnounceToast";

const MESSAGES = {
  red_flag_added: (name, text) => `🚩 *New Red Flag* — ${name}\n${text}`,
  red_flag_resolved: (name, text) => `✅ *Red Flag Resolved* — ${name}\n${text}`,
  red_flag_reopened: (name, text) => `↩️ *Red Flag Reopened* — ${name}\n${text}`,
  red_flag_updated: (name, text) => `🚩 *Red Flag Updated* — ${name}\n${text}`,
  red_flag_deleted: (name, text) => `🗑️ *Red Flag Deleted* — ${name}\n${text}`,
  todo_added: (name, text) => `📝 *New To-Do* — ${name}\n${text}`,
  todo_completed: (name, text) => `✅ *To-Do Completed* — ${name}\n${text}`,
  todo_reopened: (name, text) => `↩️ *To-Do Reopened* — ${name}\n${text}`,
  todo_updated: (name, text) => `📝 *To-Do Updated* — ${name}\n${text}`,
  todo_deleted: (name, text) => `🗑️ *To-Do Deleted* — ${name}\n${text}`,
  csm_update: (name, type, content) => `📢 *CSM Update (${type})* — ${name}\n${content}`,
  meeting_note: (name, note) => {
    const lines = [`🗒️ *Meeting Note* — ${name}\n*${note.title}*`];
    if (note.meeting_date) lines.push(`📅 ${new Date(note.meeting_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`);
    if (note.attendees) lines.push(`👤 ${note.attendees}`);
    if (note.summary) lines.push(`\n*Summary*\n${note.summary}`);
    if (note.action_items) lines.push(`\n*Next Steps / Action Items*\n${note.action_items}`);
    if (note.next_meeting_date) lines.push(`\n🔜 Next meeting: ${new Date(note.next_meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    return lines.join("\n");
  },
};

/**
 * Hook for prompting a Slack announcement after tracker/CSM changes.
 * @param {string} clientId
 * @returns {{ prompt: Function, toastElement: JSX }}
 */
export function useSlackAnnounce(clientId) {
  const [client, setClient] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    setClient(null);
    base44.entities.Client.get(clientId).then(setClient).catch(() => setClient(null));
  }, [clientId]);

  const prompt = useCallback(({ type, text, updateType, content }) => {
    if (!client) return;
    if (!client.slack_channel) {
      setToast({ mode: "no-channel" });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const fn = MESSAGES[type];
    if (!fn) return;
    const msg = type === "csm_update" ? fn(client.name, updateType, content)
      : type === "meeting_note" ? fn(client.name, text)
      : fn(client.name, text);
    setToast({ mode: "confirm", text: msg });
  }, [client]);

  const confirm = useCallback(async () => {
    setToast(t => ({ ...t, sending: true }));
    try {
      const res = await base44.functions.invoke("sendSlackMessage", { client_id: clientId, text: toast.text });
      if (res.data?.ok) {
        setToast({ mode: "success" });
        setTimeout(() => setToast(null), 2500);
      } else {
        setToast({ mode: "error", error: res.data?.error || "Failed to send" });
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      setToast({ mode: "error", error: err.message });
      setTimeout(() => setToast(null), 4000);
    }
  }, [clientId, toast]);

  const skip = useCallback(() => setToast(null), []);

  const toastElement = toast && createPortal(
    <SlackAnnounceToast toast={toast} onConfirm={confirm} onSkip={skip} />,
    document.body
  );

  return { prompt, toastElement };
}