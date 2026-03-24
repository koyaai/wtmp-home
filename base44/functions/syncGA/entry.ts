import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, property_id, sync_months = 1 } = await req.json();
    if (!client_id || !property_id) {
      return Response.json({ error: 'client_id and property_id are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    // Build date ranges — one per month going back sync_months
    const ranges = [];
    for (let i = 0; i < sync_months; i++) {
      const end = new Date();
      end.setDate(1);
      end.setMonth(end.getMonth() - i);
      const start = new Date(end);
      start.setDate(1);
      // end = last day of that month
      const endDate = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      ranges.push({
        start: start.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      });
    }

    const results = [];

    for (const range of ranges) {
      // Main metrics
      const metricsRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: range.start, endDate: range.end }],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'screenPageViews' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
            ],
          }),
        }
      );

      if (!metricsRes.ok) {
        const err = await metricsRes.json();
        return Response.json({ error: err.error?.message || 'GA API error' }, { status: 400 });
      }

      const metricsData = await metricsRes.json();
      const row = metricsData.rows?.[0]?.metricValues || [];
      const getValue = (i) => parseFloat(row[i]?.value || '0');

      // Top pages
      const pagesRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: range.start, endDate: range.end }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10,
          }),
        }
      );

      let topPages = '';
      if (pagesRes.ok) {
        const pgData = await pagesRes.json();
        topPages = JSON.stringify((pgData.rows || []).map(r => ({
          page: r.dimensionValues[0].value,
          sessions: Math.round(parseFloat(r.metricValues[0].value)),
          pageviews: Math.round(parseFloat(r.metricValues[1].value)),
        })));
      }

      // Traffic sources
      const sourcesRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: range.start, endDate: range.end }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 8,
          }),
        }
      );

      let trafficSources = '';
      if (sourcesRes.ok) {
        const srcData = await sourcesRes.json();
        trafficSources = JSON.stringify((srcData.rows || []).map(r => ({
          source: r.dimensionValues[0].value,
          sessions: Math.round(parseFloat(r.metricValues[0].value)),
        })));
      }

      const record = await base44.asServiceRole.entities.GAData.create({
        client_id,
        report_date: range.end,
        period_start: range.start,
        period_end: range.end,
        sessions: Math.round(getValue(0)),
        users: Math.round(getValue(1)),
        new_users: Math.round(getValue(2)),
        pageviews: Math.round(getValue(3)),
        bounce_rate: Math.round(getValue(4) * 100) / 100,
        avg_session_duration: Math.round(getValue(5)),
        top_pages: topPages,
        traffic_sources: trafficSources,
        notes: `Auto-synced from GA4. Period: ${range.start} to ${range.end}`,
      });

      results.push(record);
    }

    return Response.json({ success: true, synced: results.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});