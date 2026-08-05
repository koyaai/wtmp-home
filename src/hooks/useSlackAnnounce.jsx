import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import SlackAnnounceToast from "@/components/clients/SlackAnnounceToast";
import { buildMentions } from "@/utils/slackMentions";

// Project management team members to tag on individual red-flag / to-do
// messages posted after a client insight summary (so they can create tasks).
const PM_MENTIONS = ["D04N8BHPLAU", "D0ATV43LQCB"].map((id) => `<@${id}>`).join(" ");

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
  insight_added: (name, data) => {
    const date = data.meeting_date
      ? new Date(data.meeting_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const headline = `🧠 *New Insight* — ${name} · ${date}`;
    const lines = [];
    if (data.source_type) lines.push(`📂 ${data.source_type}`);
    if (data.summary) lines.push(`\n*Summary*\n${data.summary}`);
    if (data.red_flags?.length) {
      lines.push(`\n🚩 *Red Flags (${data.red_flags.length})*`);
      data.red_flags.slice(0, 8).forEach((f, i) => lines.push(`${i + 1}. ${typeof f === "string" ? f : f.text}`));
      if (data.red_flags.length > 8) lines.push(`_…+${data.red_flags.length - 8} more_`);
    }
    if (data.todos?.length) {
      lines.push(`\n✅ *Next Steps / To-Dos (${data.todos.length})*`);
      data.todos.slice(0, 8).forEach((t, i) => lines.push(`${i + 1}. ${typeof t === "string" ? t : t.text}`));
      if (data.todos.length > 8) lines.push(`_…+${data.todos.length - 8} more_`);
    }
    // Individual bold messages for each to-do / red flag — posted as top-level
    // messages so each gets its own thread for team discussion.
    const itemMessages = [];
    (data.red_flags || []).forEach((f) => {
      const t = typeof f === "string" ? f : f.text;
      if (t) itemMessages.push(`🚩 *Red Flag: ${t}*`);
    });
    (data.todos || []).forEach((td) => {
      const t = typeof td === "string" ? td : td.text;
      if (t) itemMessages.push(`✅ *To-Do: ${t}*`);
    });
    return { headline, body: lines.join("\n").trim(), itemMessages };
  },
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
    if (type === "insight_added") {
      const { headline, body, itemMessages } = fn(client.name, text);
      const tag = buildMentions(client);
      const suffix = tag ? ` ${tag}` : "";
      const taggedHeadline = headline + suffix;
      // Items get the CSM/CSA mentions PLUS the PM team (for task creation)
      const itemSuffix = `${suffix} ${PM_MENTIONS}`;
      const taggedItems = itemMessages.map((m) => m + itemSuffix);
      setToast({ mode: "confirm", headline: taggedHeadline, body, itemMessages: taggedItems, preview: `${taggedHeadline}\n\n${body}${taggedItems.length ? `\n\n+ ${taggedItems.length} item thread(s)` : ""}` });
      return;
    }
    const msg = type === "csm_update" ? fn(client.name, updateType, content)
      : (type === "meeting_note") ? fn(client.name, text)
      : fn(client.name, text);
    setToast({ mode: "confirm", text: msg });
  }, [client]);

  const confirm = useCallback(async () => {
    setToast(t => ({ ...t, sending: true }));
    try {
      let res;
      if (toast.headline && toast.body) {
        // Threaded: headline first, then full summary as a reply
        const headRes = await base44.functions.invoke("sendSlackMessage", { client_id: clientId, text: toast.headline });
        if (!headRes.data?.ok || !headRes.data?.ts) {
          setToast({ mode: "error", error: headRes.data?.error || "Headline post failed" });
          setTimeout(() => setToast(null), 4000);
          return;
        }
        res = await base44.functions.invoke("sendSlackMessage", { client_id: clientId, text: toast.body, thread_ts: headRes.data.ts });
        // Post each to-do / red flag as its own top-level bold message so each
        // gets a dedicated thread for the concerned team's discussion.
        for (const itemText of (toast.itemMessages || [])) {
          await new Promise((r) => setTimeout(r, 400)); // light rate-limit stagger
          try {
            await base44.functions.invoke("sendSlackMessage", { client_id: clientId, text: itemText });
          } catch (e) { /* best-effort; continue with remaining items */ }
        }
      } else {
        res = await base44.functions.invoke("sendSlackMessage", { client_id: clientId, text: toast.text });
      }
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