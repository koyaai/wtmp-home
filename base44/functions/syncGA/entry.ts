import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, property_id, sync_months = 1, backfill = false, granularity = 'month' } = await req.json();
    if (!client_id || !property_id) {
      return Response.json({ error: 'client_id and property_id are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    // Build date ranges — one per period going back sync_months.
    // granularity 'month' = monthly ranges; 'week' = 7-day weekly ranges (sync_months = week count).
    // In backfill mode, start from the previous period (skip the current/partial one)
    // and only fill periods that don't already have a record.
    const startOffset = backfill ? 1 : 0;
    const ranges = [];

    if (granularity === 'week') {
      for (let i = startOffset; i < sync_months + startOffset; i++) {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        ranges.push({
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        });
      }
    } else {
      for (let i = startOffset; i < sync_months + startOffset; i++) {
        const end = new Date();
        end.setDate(1);
        end.setMonth(end.getMonth() - i);
        const start = new Date(end);
        start.setDate(1);
        const endDate = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        ranges.push({
          start: start.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        });
      }
    }

    const results = [];
    const allGaRecords = await base44.asServiceRole.entities.GAData.filter({ client_id });

    for (const range of ranges) {
      // Match by period_type + exact period_start (treat undefined period_type as 'month')
      const existingGa = allGaRecords.find(r =>
        (r.period_type || 'month') === granularity && r.period_start === range.start
      );
      if (backfill && existingGa) {
        results.push(existingGa);
        continue;
      }

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
              { name: 'engagedSessions' },
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

      // Upsert by client_id + period_type + period_start
      const gaPayload = {
        client_id,
        report_date: range.start,
        period_start: range.start,
        period_end: range.end,
        period_type: granularity,
        sessions: Math.round(getValue(0)),
        engaged_sessions: Math.round(getValue(1)),
        users: Math.round(getValue(2)),
        new_users: Math.round(getValue(3)),
        pageviews: Math.round(getValue(4)),
        bounce_rate: Math.round(getValue(5) * 100) / 100,
        avg_session_duration: Math.round(getValue(6)),
        top_pages: topPages,
        traffic_sources: trafficSources,
        notes: `Auto-synced from GA4. Period: ${range.start} to ${range.end} (${granularity})`,
      };

      let record;
      if (existingGa) {
        record = await base44.asServiceRole.entities.GAData.update(existingGa.id, gaPayload);
      } else {
        record = await base44.asServiceRole.entities.GAData.create(gaPayload);
      }

      results.push(record);
    }

    return Response.json({ success: true, synced: results.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});