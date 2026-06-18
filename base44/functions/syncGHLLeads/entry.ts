import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GHL Opportunity → LeadData field mapping (monthly rollup):
 *
 * opportunities created this month               → total_leads + new_leads
 * opportunities created this month with status "won" → closed_deals
 * sum of monetaryValue for those won opps          → revenue_generated
 * source breakdown JSON                          → lead_sources
 *
 * NOT mappable from GHL (must be entered manually):
 *   qualified_leads, appointments_booked, appointments_showed
 */

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

    // Parse body FIRST so we can use all params
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const now = new Date();
    const clientIdFilter = body.client_id || null;
    const targetYear = body.year ? Number(body.year) : now.getFullYear();
    const targetMonth = body.month !== undefined ? Number(body.month) : now.getMonth(); // 0-indexed
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 1);
    // Always use first day of the month as the canonical report_date key
    const reportDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;

    // Get all clients with GHL credentials (or just one if client_id is passed)
    const allClients = await db.entities.Client.list();
    const ghlClients = allClients.filter(c =>
      c.ghl_location_id && c.ghl_api_key && (!clientIdFilter || c.id === clientIdFilter)
    );

    if (ghlClients.length === 0) {
      return Response.json({ message: 'No clients with GHL credentials found.' });
    }

    const results = [];

    for (const client of ghlClients) {
      try {
        const opps = await fetchOpportunities(client.ghl_location_id, client.ghl_api_key);

        // Filter to target month only (between monthStart and monthEnd)
        const thisMonth = opps.filter(o => {
          const d = new Date(o.createdAt || o.dateAdded || 0);
          return d >= monthStart && d < monthEnd;
        });

        // total_leads = new leads created this month (not all-time pipeline count)
        const totalLeads = thisMonth.length;
        const newLeads = thisMonth.length;

        // Won deals = opportunities created this month that are currently "won"
        // (matches the Lead Tracker's ghlLeads function logic)
        const wonThisMonth = thisMonth.filter(o => o.status === 'won');
        const closedDeals = wonThisMonth.length;
        const revenueGenerated = wonThisMonth.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);

        // Source breakdown (this month only)
        const sourceCounts = {};
        const tagCounts = {};
        const sessionSourceCounts = {};
        for (const o of thisMonth) {
          if (o.source) sourceCounts[o.source] = (sourceCounts[o.source] || 0) + 1;
          const tags = (o.tags || []).map(t => t.trim()).filter(Boolean);
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
          const ss = o.sessionSource || o.attributionSource || null;
          if (ss) sessionSourceCounts[ss] = (sessionSourceCounts[ss] || 0) + 1;
        }
        const leadSources = JSON.stringify(sourceCounts);
        const leadTags = JSON.stringify(tagCounts);
        const leadSessionSources = JSON.stringify(sessionSourceCounts);

        // Find any existing LeadData record for this client in this calendar month
        // Use T12:00:00 to avoid UTC midnight timezone shifts
        const allClientRecords = await db.entities.LeadData.filter({ client_id: client.id });
        const existing = allClientRecords.filter(r => {
          const d = new Date(r.report_date + 'T12:00:00');
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        });

        const payload = {
          client_id: client.id,
          report_date: reportDate,
          total_leads: totalLeads,
          new_leads: newLeads,
          closed_deals: closedDeals,
          revenue_generated: revenueGenerated > 0 ? revenueGenerated : undefined,
          lead_sources: leadSources,
          lead_tags: leadTags,
          lead_session_sources: leadSessionSources,
          notes: `Auto-synced from GHL on ${new Date().toISOString().split('T')[0]}`,
        };

        if (existing && existing.length > 0) {
          await db.entities.LeadData.update(existing[0].id, payload);
          results.push({ client: client.name, action: 'updated', record_id: existing[0].id });
        } else {
          const created = await db.entities.LeadData.create(payload);
          results.push({ client: client.name, action: 'created', record_id: created.id });
        }
      } catch (err) {
        results.push({ client: client.name, action: 'error', error: err.message });
      }
    }

    return Response.json({ synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 200 });
  }
});