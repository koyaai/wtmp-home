import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { location_id, api_key } = await req.json();
    if (!location_id) return Response.json({ error: 'location_id is required' }, { status: 400 });
    if (!api_key) return Response.json({ error: 'api_key is required' }, { status: 400 });

    const headers = {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };
    const baseUrl = 'https://services.leadconnectorhq.com';

    // Fetch all opportunities
    let allOpportunities = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const res = await fetch(
        `${baseUrl}/opportunities/search?location_id=${location_id}&limit=100&page=${page}`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        return Response.json({ error: `GHL opportunities error: ${res.status} - ${err}` }, { status: 200 });
      }
      const data = await res.json();
      const opps = data.opportunities || [];
      allOpportunities = allOpportunities.concat(opps);
      hasMore = opps.length === 100;
      page++;
    }

    // Group by month (YYYY-MM)
    const monthlyData = {};

    for (const opp of allOpportunities) {
      const date = new Date(opp.createdAt || opp.dateAdded || 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          total: 0,
          won: 0,
          lost: 0,
          open: 0,
          revenue_won: 0,
          sources: {},
          pipelines: {},
          opportunities: [],
        };
      }

      const m = monthlyData[monthKey];
      m.total++;

      if (opp.status === 'won') {
        m.won++;
        m.revenue_won += opp.monetaryValue || 0;
      } else if (opp.status === 'lost') {
        m.lost++;
      } else {
        m.open++;
      }

      // Source breakdown
      const src = opp.source || 'Direct';
      m.sources[src] = (m.sources[src] || 0) + 1;

      // Pipeline breakdown
      const pipelineName = opp.pipeline?.name || 'Default';
      const stageName = opp.stage?.name || 'Unknown';
      if (!m.pipelines[pipelineName]) {
        m.pipelines[pipelineName] = { total: 0, won: 0, lost: 0, open: 0, revenue_won: 0, stages: {} };
      }
      const p = m.pipelines[pipelineName];
      p.total++;
      p.stages[stageName] = (p.stages[stageName] || 0) + 1;
      if (opp.status === 'won') { p.won++; p.revenue_won += opp.monetaryValue || 0; }
      else if (opp.status === 'lost') p.lost++;
      else p.open++;

      // Store lightweight opp for the list
      const tags = (opp.tags || []).map(t => t.trim()).filter(Boolean);
      m.opportunities.push({
        id: opp.id,
        name: opp.name || 'Unnamed',
        contactName: `${opp.contact?.firstName || ''} ${opp.contact?.lastName || ''}`.trim() || opp.contact?.name || 'Unknown',
        stage: stageName,
        pipeline: pipelineName,
        status: opp.status || 'open',
        value: opp.monetaryValue || 0,
        source: opp.source || null,
        tags,
        createdAt: opp.createdAt,
      });

      // Tag breakdown
      for (const tag of tags) {
        m.tags = m.tags || {};
        m.tags[tag] = (m.tags[tag] || 0) + 1;
      }
    }

    // Sort months descending
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));

    return Response.json({
      total_all_time: allOpportunities.length,
      months: sortedMonths,
      monthly_data: monthlyData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 200 });
  }
});