import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeItem, daysOpen, ageLabel, buildMentions } from "../../shared/clientReportUtils.ts";

const STALE_THRESHOLDS = { Outshine: 2, Rocketfuel: 2, Growth: 5, default: 5 };

function getStaleThreshold(program) {
  return STALE_THRESHOLDS[program] ?? STALE_THRESHOLDS.default;
}

function getLatestActivityDate(clientId, insights, updates, meetingNotes, onboardings) {
  let latest = 0;
  for (const records of [insights, updates, meetingNotes, onboardings]) {
    for (const r of records) {
      if (r.client_id !== clientId) continue;
      const ts = Math.max(
        ...[r.created_date, r.updated_date].filter(Boolean).map(d => new Date(d).getTime())
      );
      if (ts > latest) latest = ts;
    }
  }
  return latest || null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [clients, insights, updates, meetingNotes, onboardings] = await Promise.all([
      base44.asServiceRole.entities.Client.list("-created_date", 500),
      base44.asServiceRole.entities.ClientInsight.list("-created_date", 1000),
      base44.asServiceRole.entities.CSMUpdate.list("-created_date", 1000),
      base44.asServiceRole.entities.MeetingNote.list("-created_date", 1000),
      base44.asServiceRole.entities.Onboarding.list("-created_date", 1000),
    ]);

    const eligible = clients.filter(c =>
      ["active", "onboarding"].includes(c.status) && c.slack_channel
    );

    const today = Date.now();
    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const client of eligible) {
      const clientInsights = insights.filter(i => i.client_id === client.id);

      // Open red flags
      const openRedFlags = [];
      clientInsights.forEach(ins => {
        (ins.red_flags || []).forEach(f => {
          const item = normalizeItem(f);
          if (!item.resolved && !item.deleted) openRedFlags.push({ item, days: daysOpen(item, ins) });
        });
      });
      // Oldest first → highest priority
      openRedFlags.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

      // Open to-dos
      const openTodos = [];
      clientInsights.forEach(ins => {
        (ins.todos || []).forEach(t => {
          const item = normalizeItem(t);
          if (!item.resolved && !item.deleted) openTodos.push({ item, days: daysOpen(item, ins) });
        });
      });
      openTodos.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

      // Stale check
      const lastActivity = getLatestActivityDate(client.id, insights, updates, meetingNotes, onboardings);
      const threshold = getStaleThreshold(client.program);
      const daysSinceActivity = lastActivity
        ? Math.floor((today - lastActivity) / (24 * 60 * 60 * 1000))
        : null;
      const isStale = daysSinceActivity === null || daysSinceActivity > threshold;

      // Skip if nothing to report
      if (openRedFlags.length === 0 && openTodos.length === 0 && !isStale) {
        skipped++;
        continue;
      }

      // Compose headline + threaded body
      const dateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const headline = `📋 *EOD Report — ${client.name}* · ${dateStr}`;

      let body = "";
      if (openRedFlags.length > 0) {
        body += `\n🚩 *Red Flags (${openRedFlags.length})* — sorted by age\n`;
        openRedFlags.forEach((f, i) => {
          body += `${i + 1}. ${f.item.text}${ageLabel(f.days)}${f.item.solution ? ` _→ ${f.item.solution}_` : ""}\n`;
        });
      }

      if (openTodos.length > 0) {
        body += `\n✅ *Open To-Dos (${openTodos.length})* — sorted by age\n`;
        openTodos.forEach((t, i) => {
          const deadline = t.item.date ? ` _(due ${t.item.date})_` : "";
          body += `${i + 1}. ${t.item.text}${ageLabel(t.days)}${deadline}\n`;
        });
      }

      if (isStale) {
        const staleMsg = daysSinceActivity === null
          ? "No recorded activity yet"
          : `No activity for ${daysSinceActivity} days (threshold: ${threshold} days)`;
        body += `\n⚠️ *Stale Warning*\n${staleMsg}\n`;
      }

      body = body.trim();

      // Append CSM/CSA @mentions to every client-scoped message
      const mentions = buildMentions(client);
      const suffix = mentions ? ` ${mentions}` : "";
      const taggedHeadline = headline + suffix;
      const taggedBody = body + suffix;

      // Send headline first, then full body as a threaded reply
      try {
        const headRes = await base44.functions.invoke("sendSlackMessage", {
          client_id: client.id,
          text: taggedHeadline,
        });
        if (!headRes.data?.ok || !headRes.data?.ts) {
          errors.push({ client: client.name, error: headRes.data?.error || "Headline post failed" });
        } else {
          const threadTs = headRes.data.ts;
          const bodyRes = await base44.functions.invoke("sendSlackMessage", {
            client_id: client.id,
            text: taggedBody,
            thread_ts: threadTs,
          });
          if (bodyRes.data?.ok) {
            sent++;
          } else {
            errors.push({ client: client.name, error: bodyRes.data?.error || "Body post failed" });
          }
        }
      } catch (err) {
        errors.push({ client: client.name, error: err.message });
      }

      // Stagger to avoid Slack rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({ ok: true, sent, skipped, errors, total: eligible.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}