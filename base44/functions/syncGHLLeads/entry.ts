import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GHL Opportunity → LeadData field mapping (monthly rollup):
 *
 * opportunities created this month               → total_leads (and new_leads)
 * opportunities with status "won" updated this month → closed_deals
 * sum of monetaryValue for won opps this month   → revenue_generated
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

    // For scheduled runs use service role; for manual runs use user context
    const db = base44.asServiceRole;

    // Get all clients with GHL credentials
    const clients = await db.entities.Client.list();
    const ghlClients = clients.filter(c => c.ghl_location_id && c.ghl_api_key);

    if (ghlClients.length === 0) {
      return Response.json({ message: 'No clients with GHL credentials found.' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Use first day of current month as report_date so each month has one canonical record
    const reportDate = monthStart.toISOString().split('T')[0];
    const results = [];

    for (const client of ghlClients) {
      try {
        const opps = await fetchOpportunities(client.ghl_location_id, client.ghl_api_key);

        // Filter to current month
        const thisMonth = opps.filter(o => {
          const d = new Date(o.createdAt || o.dateAdded || 0);
          return d >= monthStart;
        });

        // total_leads = new leads created this month (not all-time pipeline count)
        const totalLeads = thisMonth.length;
        const newLeads = thisMonth.length;

        // Won deals = opportunities marked "won" that were last updated this month
        // (GHL updates the updatedAt timestamp when status changes to won)
        const wonThisMonth = opps.filter(o => {
          if (o.status !== 'won') return false;
          const updatedAt = new Date(o.updatedAt || o.dateUpdated || 0);
          return updatedAt >= monthStart;
        });
        const closedDeals = wonThisMonth.length;
        const revenueGenerated = wonThisMonth.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);

        // Source breakdown (this month only)
        const sourceCounts = {};
        for (const o of thisMonth) {
          if (o.source) sourceCounts[o.source] = (sourceCounts[o.source] || 0) + 1;
        }
        const leadSources = JSON.stringify(sourceCounts);

        // Check if a LeadData record already exists for this client + this month
        const existing = await db.entities.LeadData.filter({
          client_id: client.id,
          report_date: reportDate,
        });

        const payload = {
          client_id: client.id,
          report_date: reportDate,
          total_leads: totalLeads,
          new_leads: newLeads,
          closed_deals: closedDeals,
          revenue_generated: revenueGenerated > 0 ? revenueGenerated : undefined,
          lead_sources: leadSources,
          notes: `Auto-synced from GHL on ${reportDate}`,
        };

        if (existing && existing.length > 0) {
          // Update the existing record
          await db.entities.LeadData.update(existing[0].id, payload);
          results.push({ client: client.name, action: 'updated', record_id: existing[0].id });
        } else {
          // Create a new record
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