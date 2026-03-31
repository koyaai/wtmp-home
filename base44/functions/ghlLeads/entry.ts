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

    // Fetch opportunities (these are the actual leads)
    let allOpportunities = [];
    let oppPage = 1;
    let oppHasMore = true;

    while (oppHasMore && oppPage <= 10) {
      const oppRes = await fetch(
        `${baseUrl}/opportunities/search?location_id=${location_id}&limit=100&page=${oppPage}`,
        { headers }
      );
      if (!oppRes.ok) {
        const err = await oppRes.text();
        return Response.json({ error: `GHL opportunities error: ${oppRes.status} - ${err}` }, { status: 200 });
      }
      const oppData = await oppRes.json();
      const opps = oppData.opportunities || [];
      allOpportunities = allOpportunities.concat(opps);
      oppHasMore = opps.length === 100;
      oppPage++;
    }

    // Summarize by pipeline and stage
    const pipelineSummary = {};
    let totalWonRevenue = 0;
    const sourceCounts = {};

    for (const opp of allOpportunities) {
      const pipelineName = opp.pipeline?.name || 'Default';
      const stageName = opp.stage?.name || 'Unknown';
      const status = opp.status || 'open';
      const value = opp.monetaryValue || 0;

      if (!pipelineSummary[pipelineName]) {
        pipelineSummary[pipelineName] = { total: 0, won: 0, lost: 0, open: 0, stages: {}, revenue_won: 0 };
      }
      pipelineSummary[pipelineName].total++;
      pipelineSummary[pipelineName].stages[stageName] = (pipelineSummary[pipelineName].stages[stageName] || 0) + 1;

      if (status === 'won') {
        pipelineSummary[pipelineName].won++;
        pipelineSummary[pipelineName].revenue_won += value;
        totalWonRevenue += value;
      } else if (status === 'lost') {
        pipelineSummary[pipelineName].lost++;
      } else {
        pipelineSummary[pipelineName].open++;
      }

      // Track lead sources
      if (opp.source) {
        sourceCounts[opp.source] = (sourceCounts[opp.source] || 0) + 1;
      }
    }

    // Recent 10 opportunities
    const recentOpportunities = allOpportunities
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10)
      .map(o => ({
        id: o.id,
        name: o.name || 'Unnamed',
        contactName: o.contact?.name || `${o.contact?.firstName || ''} ${o.contact?.lastName || ''}`.trim() || 'Unknown',
        stage: o.stage?.name || 'Unknown',
        pipeline: o.pipeline?.name || 'Default',
        status: o.status || 'open',
        value: o.monetaryValue || 0,
        source: o.source || null,
        createdAt: o.createdAt,
      }));

    return Response.json({
      total_opportunities: allOpportunities.length,
      total_won: allOpportunities.filter(o => o.status === 'won').length,
      total_lost: allOpportunities.filter(o => o.status === 'lost').length,
      total_open: allOpportunities.filter(o => o.status !== 'won' && o.status !== 'lost').length,
      total_won_revenue: totalWonRevenue,
      pipeline_summary: pipelineSummary,
      source_counts: sourceCounts,
      recent_opportunities: recentOpportunities,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 200 });
  }
});