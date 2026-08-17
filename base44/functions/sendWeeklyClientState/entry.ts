import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeItem, daysOpen, buildMentions, startOfDay, fmtNum, fmtMoney } from "../../shared/clientReportUtils.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// Aggregate PPCData records within a window
function aggregatePPC(records, fromTime) {
  const filtered = records.filter(r => r.report_date && new Date(r.report_date).getTime() >= fromTime);
  const totals = filtered.reduce((acc, r) => {
    acc.spend += r.spend || 0;
    acc.clicks += r.clicks || 0;
    return acc;
  }, { spend: 0, clicks: 0 });
  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  return totals;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [clients, insights, leadData, ppcData] = await Promise.all([
      base44.asServiceRole.entities.Client.list("-created_date", 500),
      base44.asServiceRole.entities.ClientInsight.list("-created_date", 1000),
      base44.asServiceRole.entities.LeadData.list("-created_date", 1000),
      base44.asServiceRole.entities.PPCData.list("-created_date", 1000),
    ]);

    const eligible = clients.filter(c =>
      ["active", "onboarding"].includes(c.status) && c.slack_channel
    );

    const now = new Date();
    const sevenDaysAgo = startOfDay(new Date(now.getTime() - 7 * DAY_MS)).getTime();
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).getTime();

    const dateStrNow = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const client of eligible) {
      const clientInsights = insights.filter(i => i.client_id === client.id);

      // Open red flags — oldest first
      const openRedFlags = [];
      clientInsights.forEach(ins => {
        (ins.red_flags || []).forEach(f => {
          const item = normalizeItem(f);
          if (!item.resolved && !item.deleted) openRedFlags.push({ item, days: daysOpen(item, ins) });
        });
      });
      openRedFlags.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

      // Open to-dos — oldest first
      const openTodos = [];
      clientInsights.forEach(ins => {
        (ins.todos || []).forEach(t => {
          const item = normalizeItem(t);
          if (!item.resolved && !item.deleted) openTodos.push({ item, days: daysOpen(item, ins) });
        });
      });
      openTodos.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

      // LeadData — read synced GHL records: weekly snapshot (last 7 days) + monthly (MTD)
      let leads7 = null, leadsMTD = null;
      if (client.ghl_location_id) {
        const clientLeads = leadData.filter(r => r.client_id === client.id);
        // Weekly record: most recent record with report_date in the last 7 days
        const weeklyRec = clientLeads
          .filter(r => r.report_date && new Date(r.report_date + 'T12:00:00').getTime() >= sevenDaysAgo)
          .sort((a, b) => new Date(b.report_date) - new Date(a.report_date))[0];
        if (weeklyRec) {
          leads7 = {
            new_leads: weeklyRec.new_leads || 0,
            closed_deals: weeklyRec.closed_deals || 0,
            revenue: weeklyRec.revenue_generated || 0,
          };
        }
        // Monthly record: report_date = 1st of current month
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const monthRec = clientLeads.find(r => r.report_date === monthKey);
        if (monthRec) {
          leadsMTD = {
            new_leads: monthRec.new_leads || 0,
            closed_deals: monthRec.closed_deals || 0,
            revenue: monthRec.revenue_generated || 0,
          };
        }
      }

      // PPCData — only if client has google_ads_account_id or any PPC record
      let ppc7 = null, ppcMTD = null;
      const hasPPC = client.google_ads_account_id || ppcData.some(r => r.client_id === client.id);
      if (hasPPC) {
        const clientPPC = ppcData.filter(r => r.client_id === client.id);
        ppc7 = aggregatePPC(clientPPC, sevenDaysAgo);
        ppcMTD = aggregatePPC(clientPPC, monthStart);
      }

      const hasOpenItems = openRedFlags.length > 0 || openTodos.length > 0;
      const hasLeads = (leads7 && (leads7.new_leads || leads7.closed_deals)) || (leadsMTD && (leadsMTD.new_leads || leadsMTD.closed_deals));
      const hasPPCData = ppc7 && (ppc7.spend || ppc7.clicks || ppcMTD.spend || ppcMTD.clicks);

      // Skip if nothing to report
      if (!hasOpenItems && !hasLeads && !hasPPCData) {
        skipped++;
        continue;
      }

      // Compose headline
      const headline = `📊 *State of the Client — ${client.name}* · ${dateStrNow}`;

      // Compose body
      let body = "";

      if (hasOpenItems) {
        const total = openRedFlags.length + openTodos.length;
        body += `\n🚩 *Open Items (${total})*\n`;

        if (openRedFlags.length > 0) {
          body += `*Red Flags (${openRedFlags.length}):*\n`;
          openRedFlags.slice(0, 3).forEach((f, i) => {
            body += `${i + 1}. ${f.item.text}${f.days !== null ? ` · ${f.days}d open` : ""}\n`;
          });
          if (openRedFlags.length > 3) body += `_+ ${openRedFlags.length - 3} more_\n`;
        }

        if (openTodos.length > 0) {
          body += `*To-Dos (${openTodos.length}):*\n`;
          openTodos.slice(0, 3).forEach((t, i) => {
            body += `${i + 1}. ${t.item.text}${t.days !== null ? ` · ${t.days}d open` : ""}\n`;
          });
          if (openTodos.length > 3) body += `_+ ${openTodos.length - 3} more_\n`;
        }
      }

      if (hasLeads) {
        body += `\n📈 *Leads (GHL)*\n`;
        if (leads7) {
          body += `*Last 7 Days:* ${fmtNum(leads7.new_leads)} new · ${fmtNum(leads7.closed_deals)} closed${leads7.revenue ? ` · ${fmtMoney(leads7.revenue)} rev` : ""}\n`;
        }
        if (leadsMTD) {
          body += `*Month to Date:* ${fmtNum(leadsMTD.new_leads)} new · ${fmtNum(leadsMTD.closed_deals)} closed${leadsMTD.revenue ? ` · ${fmtMoney(leadsMTD.revenue)} rev` : ""}\n`;
        }
      }

      if (hasPPCData) {
        body += `\n💰 *PPC*\n`;
        body += `*Last 7 Days:* ${fmtMoney(ppc7.spend)} spend · ${fmtNum(ppc7.clicks)} clicks · ${ppc7.cpc ? fmtMoney(ppc7.cpc) : "$0"} CPC\n`;
        body += `*Month to Date:* ${fmtMoney(ppcMTD.spend)} spend · ${fmtNum(ppcMTD.clicks)} clicks · ${ppcMTD.cpc ? fmtMoney(ppcMTD.cpc) : "$0"} CPC\n`;
      }

      body = body.trim();

      // Append CSM/CSA @mentions
      const mentions = buildMentions(client);
      const suffix = mentions ? ` ${mentions}` : "";
      const taggedHeadline = headline + suffix;
      const taggedBody = body + suffix;

      // Send headline, then body as threaded reply
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

      // Stagger to respect Slack rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({ ok: true, sent, skipped, errors, total: eligible.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}