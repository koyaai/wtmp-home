import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Pulls "Notes by Gemini" emails from the connected Gmail inbox, reads the
// linked Google Doc (falls back to the email body), and asks the LLM which
// roster clients were discussed. Each email becomes one MeetingInbox record
// in "pending_review" — nothing reaches a client's ClientInsight until a CSM
// confirms the client on the Meeting Inbox page.
//
// Actions:
//   { action: "ingest", days?: number, max?: number }   (default; scheduled hourly)
//   { action: "extract_for_client", inbox_id, client_id } (reviewer added a client by hand)

const REVIEWER_ROLES = ["admin", "leadership", "team_lead", "csm"];
const GEMINI_SENDER = "gemini-notes@google.com";
const SOURCE_CAP = 60000; // stored text
const LLM_CAP = 30000;    // text sent to the LLM

function teamFromTitle(title) {
  const t = (title || "").toLowerCase();
  if (/\bppc\b|google ads|paid/.test(t)) return "PPC";
  if (/\bseo\b/.test(t)) return "SEO";
  if (/\bcs\b|client success|customer success/.test(t)) return "CS";
  if (/\bom\b|operations/.test(t)) return "OM";
  if (/web ?dev|website/.test(t)) return "Web Dev";
  if (/automation/.test(t)) return "Automations";
  if (/social/.test(t)) return "Social Media";
  if (/will meeting room/.test(t)) return "Will";
  return "Other";
}

function decodeB64Url(data) {
  const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function collectParts(payload, out = { html: "", text: "" }) {
  if (!payload) return out;
  if (payload.body?.data) {
    if (payload.mimeType === "text/html") out.html += decodeB64Url(payload.body.data);
    if (payload.mimeType === "text/plain") out.text += decodeB64Url(payload.body.data);
  }
  (payload.parts || []).forEach((p) => collectParts(p, out));
  return out;
}

function header(msg, name) {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

// "Notes: “Meet SEO” Oct 15, 2026" -> { title: "Meet SEO", date: "2026-10-15" }
function parseSubject(subject, fallbackMs) {
  const title = (subject.match(/[“"](.+?)[”"]/) || [])[1] || subject.replace(/^Notes:\s*/i, "");
  const dateStr = (subject.match(/([A-Z][a-z]{2,8} \d{1,2}, \d{4})\s*$/) || [])[1];
  const d = dateStr ? new Date(`${dateStr} 12:00:00 UTC`) : new Date(Number(fallbackMs));
  return { title: title.trim(), date: isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10) };
}

async function gmailFetch(token, path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
  return res.json();
}

async function readDoc(driveToken, docId) {
  if (!driveToken || !docId) return null;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${driveToken}` } }
  );
  if (!res.ok) return null;
  const text = (await res.text()).trim();
  return text.length > 200 ? text : null;
}

async function buildRoster(base44) {
  const [clients, contacts] = await Promise.all([
    base44.asServiceRole.entities.Client.list("name", 500),
    base44.asServiceRole.entities.ClientContact.list("-created_date", 1000).catch(() => []),
  ]);
  const active = clients.filter((c) => !["churned", "offboarded"].includes(c.status) && !/^test /i.test(c.name || ""));
  const contactsByClient = {};
  for (const ct of contacts) {
    if (!ct.client_id) continue;
    (contactsByClient[ct.client_id] ||= []).push(
      [ct.full_name, ct.preferred_name?.replace(/"/g, "").trim()].filter(Boolean).join(" / ")
    );
  }
  const lines = active.map((c) => {
    const people = [c.contact_name, ...(contactsByClient[c.id] || [])].filter(Boolean);
    const domain = (c.website || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return `${c.id} | ${c.name}${c.location ? ` | ${c.location}` : ""}${domain ? ` | ${domain}` : ""}${people.length ? ` | contacts: ${[...new Set(people)].join(", ")}` : ""}`;
  });
  return { clients: active, byId: Object.fromEntries(active.map((c) => [c.id, c])), text: lines.join("\n") };
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    todos: {
      type: "array",
      items: { type: "object", properties: { text: { type: "string" }, point_person: { type: "string" } } },
    },
    requests: { type: "array", items: { type: "string" } },
    red_flags: { type: "array", items: { type: "string" } },
  },
};

const EXTRACT_RULES = `- "summary": a thorough narrative of ONLY what was said about this client — decisions, numbers, timelines, status, and any client sentiment. Several paragraphs if warranted. Ignore unrelated agenda items.
- "todos": action items the agency team must do for this client (start with a verb; point_person if named).
- "requests": things the client explicitly asked for.
- "red_flags": risks, dissatisfaction, churn signals, blockers for this client.
Empty arrays when nothing applies. Never invent details.`;

async function matchClients(base44, roster, meetingTitle, team, text) {
  return base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You route internal meeting notes for a digital marketing agency (WTMP) to client accounts.

Meeting: "${meetingTitle}" (team: ${team})

CLIENT ROSTER (id | business name | location | website | contacts):
${roster.text}

TASK: Identify every roster client that was actually discussed in the notes below. Clients are often referred to by a short name ("Mits Eastern Shore", "Eastern Shore", "Tampa"), by location, or only by a contact's first name. Match conservatively:
- "high": business named unambiguously, or contact full name matches.
- "medium": short name/location/first name that fits exactly one roster client.
- "low": plausible but ambiguous — still include it so a human can confirm.
Do NOT include a client just because a generic topic applies to all clients. Internal-only topics (PTO, team metrics, training, hiring, podcasts, internal projects) are not client discussions.
Note: MITS has several separate locations (Eastern Shore, Annapolis, Rockville, St. Louis, Little Rock, Lafayette, Ashburn) — never merge them; if the location is unclear, use "low" and say so in evidence.

For each matched client return:
- "client_id": exactly as in the roster
- "confidence": high | medium | low
- "evidence": the exact names/phrases from the notes that support the match
${EXTRACT_RULES}

Also return "unmatched_mentions": businesses or people who appear to be clients/prospects but are NOT in the roster (e.g. a prospect on a sales call).

NOTES:
"""
${text.slice(0, LLM_CAP)}
"""`,
    response_json_schema: {
      type: "object",
      properties: {
        clients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              client_id: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              evidence: { type: "string" },
              ...EXTRACT_SCHEMA.properties,
            },
          },
        },
        unmatched_mentions: { type: "array", items: { type: "string" } },
      },
    },
  });
}

async function ingest(base44, { days = 3, max = 8 }) {
  const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection("gmail");
  let driveToken = null;
  try {
    driveToken = (await base44.asServiceRole.connectors.getConnection("googledrive")).accessToken;
  } catch (_e) { /* Drive optional — fall back to the email body */ }

  const after = Math.floor((Date.now() - days * 86400000) / 1000);
  const q = encodeURIComponent(`from:${GEMINI_SENDER} after:${after}`);
  const ids = [];
  let pageToken = "";
  do {
    const page = await gmailFetch(gmailToken, `messages?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
    (page.messages || []).forEach((m) => ids.push(m));
    pageToken = page.nextPageToken || "";
  } while (pageToken && ids.length < 500);

  // Skip anything already in the queue
  const existing = await base44.asServiceRole.entities.MeetingInbox.list("-created_date", 2000);
  const seen = new Set(existing.map((e) => e.gmail_message_id));
  const todo = ids.filter((m) => !seen.has(m.id)).reverse(); // oldest first
  const batch = todo.slice(0, max);

  const roster = batch.length ? await buildRoster(base44) : null;
  const results = [];

  for (const { id, threadId } of batch) {
    let subject = "";
    try {
      const msg = await gmailFetch(gmailToken, `messages/${id}?format=full`);
      subject = header(msg, "Subject");
      const { title, date } = parseSubject(subject, msg.internalDate);
      const team = teamFromTitle(title);
      const parts = collectParts(msg.payload);
      const docId = (parts.html.match(/docs\.google\.com\/document\/d\/([\w-]+)/) || [])[1];
      const docUrl = docId ? `https://docs.google.com/document/d/${docId}/edit` : null;

      const docText = await readDoc(driveToken, docId);
      const emailText = parts.text || parts.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const sourceText = (docText || emailText).slice(0, SOURCE_CAP);

      const ai = await matchClients(base44, roster, title, team, sourceText);
      const matches = (ai.clients || [])
        .filter((m) => roster.byId[m.client_id])
        .map((m) => ({
          client_id: m.client_id,
          client_name: roster.byId[m.client_id].name,
          confidence: m.confidence || "low",
          evidence: m.evidence || "",
          summary: m.summary || "",
          todos: (m.todos || []).filter((t) => t?.text),
          requests: m.requests || [],
          red_flags: m.red_flags || [],
        }));

      await base44.asServiceRole.entities.MeetingInbox.create({
        gmail_message_id: id,
        gmail_thread_id: threadId,
        subject,
        meeting_title: title,
        team,
        meeting_date: date,
        received_at: new Date(Number(msg.internalDate)).toISOString(),
        doc_url: docUrl,
        gmail_url: `https://mail.google.com/mail/u/0/#all/${id}`,
        source_origin: docText ? "google_doc" : "email_body",
        source_text: sourceText,
        status: matches.length ? "pending_review" : "no_client",
        matches,
        unmatched_mentions: ai.unmatched_mentions || [],
      });
      results.push({ subject, matched: matches.map((m) => `${m.client_name} (${m.confidence})`), source: docText ? "doc" : "email" });
    } catch (err) {
      await base44.asServiceRole.entities.MeetingInbox.create({
        gmail_message_id: id,
        gmail_thread_id: threadId,
        subject: subject || "(unreadable)",
        status: "error",
        error_message: String(err.message || err).slice(0, 2000),
      });
      results.push({ subject, error: err.message });
    }
  }

  return { ok: true, found: ids.length, processed: batch.length, remaining: todo.length - batch.length, results };
}

async function extractForClient(base44, { inbox_id, client_id }) {
  const item = await base44.asServiceRole.entities.MeetingInbox.get(inbox_id);
  const client = await base44.asServiceRole.entities.Client.get(client_id);
  if (!item || !client) throw new Error("Meeting or client not found");
  const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `From these internal meeting notes ("${item.meeting_title}"), extract everything relevant to the client "${client.name}"${client.location ? ` (${client.location})` : ""}${client.contact_name ? `, contact ${client.contact_name}` : ""}. A reviewer confirmed this client was discussed.
${EXTRACT_RULES}

NOTES:
"""
${(item.source_text || "").slice(0, LLM_CAP)}
"""`,
    response_json_schema: EXTRACT_SCHEMA,
  });
  return {
    client_id: client.id,
    client_name: client.name,
    confidence: "high",
    evidence: "Added by reviewer",
    manual: true,
    summary: out.summary || "",
    todos: (out.todos || []).filter((t) => t?.text),
    requests: out.requests || [],
    red_flags: out.red_flags || [],
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Scheduled runs have no user; interactive calls must come from a reviewer role.
    if (user && !REVIEWER_ROLES.includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === "extract_for_client") {
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      return Response.json(await extractForClient(base44, body));
    }

    const days = Math.min(Math.max(Number(body.days) || 3, 1), 120);
    const max = Math.min(Math.max(Number(body.max) || 8, 1), 25);
    return Response.json(await ingest(base44, { days, max }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
