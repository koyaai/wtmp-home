import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { location_id } = await req.json();
    if (!location_id) return Response.json({ error: 'location_id is required' }, { status: 400 });

    const apiKey = Deno.env.get('GHL_API_KEY');
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };

    // Fetch contacts with pagination (up to 100 per page, get first few pages)
    let allContacts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const res = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${location_id}&limit=100&startAfter=${(page - 1) * 100}`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        return Response.json({ error: `GHL API error: ${res.status} - ${err}` }, { status: res.status });
      }
      const data = await res.json();
      const contacts = data.contacts || [];
      allContacts = allContacts.concat(contacts);
      hasMore = contacts.length === 100;
      page++;
    }

    // Fetch pipelines to get stages
    const pipelineRes = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${location_id}`,
      { headers }
    );
    const pipelineData = pipelineRes.ok ? await pipelineRes.json() : { pipelines: [] };
    const pipelines = pipelineData.pipelines || [];

    // Fetch opportunities (leads in pipeline)
    let allOpportunities = [];
    let oppPage = 1;
    let oppHasMore = true;

    while (oppHasMore && oppPage <= 5) {
      const oppRes = await fetch(
        `https://services.leadconnectorhq.com/opportunities/search?location_id=${location_id}&limit=100&page=${oppPage}`,
        { headers }
      );
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        const opps = oppData.opportunities || [];
        allOpportunities = allOpportunities.concat(opps);
        oppHasMore = opps.length === 100;
      } else {
        oppHasMore = false;
      }
      oppPage++;
    }

    // Summarize opportunities by stage
    const stageCounts = {};
    const pipelineSummary = {};

    for (const opp of allOpportunities) {
      const stageName = opp.stage?.name || 'Unknown';
      stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;

      const pipelineName = opp.pipeline?.name || 'Default';
      if (!pipelineSummary[pipelineName]) {
        pipelineSummary[pipelineName] = { total: 0, won: 0, lost: 0, open: 0, stages: {} };
      }
      pipelineSummary[pipelineName].total++;
      if (opp.status === 'won') pipelineSummary[pipelineName].won++;
      else if (opp.status === 'lost') pipelineSummary[pipelineName].lost++;
      else pipelineSummary[pipelineName].open++;

      pipelineSummary[pipelineName].stages[stageName] = (pipelineSummary[pipelineName].stages[stageName] || 0) + 1;
    }

    // Recent contacts (last 10)
    const recentContacts = allContacts
      .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Unknown',
        email: c.email,
        phone: c.phone,
        source: c.source,
        dateAdded: c.dateAdded,
        tags: c.tags || [],
      }));

    return Response.json({
      total_contacts: allContacts.length,
      total_opportunities: allOpportunities.length,
      pipeline_summary: pipelineSummary,
      stage_counts: stageCounts,
      recent_contacts: recentContacts,
      pipelines: pipelines.map(p => ({ id: p.id, name: p.name, stages: p.stages?.map(s => s.name) || [] })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});