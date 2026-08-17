import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GHL Opportunity → LeadData field mapping:
 *
 * MONTHLY mode (default):
 *   opportunities created this month          → total_leads + new_leads
 *   opportunities created this month, "won"   → closed_deals
 *   sum of monetaryValue for won opps          → revenue_generated
 *   source breakdown JSON                      → lead_sources
 *
 * WEEKLY mode (mode: "weekly"):
 *   opportunities created in the last 7 days   → total_leads + new_leads
 *   those "won"                                → closed_deals
 *   sum of monetaryValue for those won          → revenue_generated
 *   report_date = today (the sync date)
 *
 * NOT mappable from GHL (must be entered manually):
 *   qualified_leads, appointments_booked, appointments_showed
 */

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchOpportunities(locationId, apiKey) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };
  const baseUrl = 'https://services.leadconnectorhq.com';

  let all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const res = await fetch(
      `${baseUrl}/opportunities/search?location_id=${locationId}&limit=100&page=${page}`,
      { headers }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GHL error ${res.status}: ${err}`);
    }
    const data = await res.json();
    const opps = data.opportunities || [];
    all = all.concat(opps);
    hasMore = opps.length === 100;
    page++;
  }
  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = base44.asServiceRole;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const mode = body.mode || "monthly"; // "monthly" (default) or "weekly"

    const now = new Date();
    const clientIdFilter = body.client_id || null;
    const targetYear = body.year ? Number(body.year) : now.getFullYear();
    const targetMonth = body.month !== undefined ? Number(body.month) : now.getMonth(); // 0-indexed

    // Get all clients with GHL credentials (or just one if client_id is passed)
    const allClients = await db.entities.Client.list();
    const ghlClients = allClients.filter(c =>
      c.ghl_location_id && c.ghl_api_key && (!clientIdFilter || c.id === clientIdFilter)
    );

    if (ghlClients.length === 0) {
      return Response.json({ message: 'No clients with GHL credentials found.' });
    }

    // Window boundaries
    let monthStart, monthEnd, reportDate, windowStart;
    if (mode === "weekly") {
      // Last 7 days from now
      windowStart = new Date(now.getTime() - 7 * DAY_MS);
      reportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else {
      monthStart = new Date(targetYear, targetMonth, 1);
      monthEnd = new Date(targetYear, targetMonth + 1, 1);
      reportDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
    }

    const results = [];

    for (const client of ghlClients) {
      try {
        const opps = await fetchOpportunities(client.ghl_location_id, client.ghl_api_key);

        // Filter to the target window
        const inWindow = opps.filter(o => {
          const d = new Date(o.createdAt || o.dateAdded || 0);
          return mode === "weekly" ? d >= windowStart : (d >= monthStart && d < monthEnd);
        });

        const totalLeads = inWindow.length;
        const newLeads = inWindow.length;
        const wonInWindow = inWindow.filter(o => o.status === 'won');
        const closedDeals = wonInWindow.length;
        const revenueGenerated = wonInWindow.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);

        // Source / tag / session breakdown (only populated for monthly mode to keep weekly light)
        let leadSources, leadTags, leadSessionSources;
        if (mode !== "weekly") {
          const sourceCounts = {};
          const tagCounts = {};
          const sessionSourceCounts = {};
          for (const o of inWindow) {
            if (o.source) sourceCounts[o.source] = (sourceCounts[o.source] || 0) + 1;
            const tags = (o.contact?.tags || o.tags || []).map(t => (typeof t === 'string' ? t : t?.name || '')).map(t => t.trim()).filter(Boolean);
            for (const tag of tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            const ss = o.sessionSource || o.attributionSource || null;
            if (ss) sessionSourceCounts[ss] = (sessionSourceCounts[ss] || 0) + 1;
          }
          leadSources = JSON.stringify(sourceCounts);
          leadTags = JSON.stringify(tagCounts);
          leadSessionSources = JSON.stringify(sessionSourceCounts);
        }

        const payload = {
          client_id: client.id,
          report_date: reportDate,
          total_leads: totalLeads,
          new_leads: newLeads,
          closed_deals: closedDeals,
          revenue_generated: revenueGenerated > 0 ? revenueGenerated : undefined,
          ...(mode !== "weekly" ? {
            lead_sources: leadSources,
            lead_tags: leadTags,
            lead_session_sources: leadSessionSources,
          } : {}),
          notes: mode === "weekly"
            ? `Weekly GHL sync ${new Date().toISOString().split('T')[0]}`
            : `Auto-synced from GHL on ${new Date().toISOString().split('T')[0]}`,
        };

        // Find any existing LeadData record for this client on this exact report_date
        const allClientRecords = await db.entities.LeadData.filter({ client_id: client.id });
        const existing = allClientRecords.filter(r => r.report_date === reportDate);

        if (existing && existing.length > 0) {
          await db.entities.LeadData.update(existing[0].id, payload);
          results.push({ client: client.name, mode, action: 'updated', record_id: existing[0].id });
        } else {
          const created = await db.entities.LeadData.create(payload);
          results.push({ client: client.name, mode, action: 'created', record_id: created.id });
        }
      } catch (err) {
        results.push({ client: client.name, mode, action: 'error', error: err.message });
      }
    }

    return Response.json({ mode, synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 200 });
  }
});