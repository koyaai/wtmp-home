import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { GoogleAuth } from 'npm:google-auth-library@9.15.1';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Called by the daily automation. Loops through SyncSettings and syncs
// each client that is due based on their configured frequency.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allSettings = await base44.asServiceRole.entities.SyncSettings.filter({ active: true });
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const results = [];

    for (const setting of allSettings) {
      // Determine if this client is due for a sync
      const lastSync = setting.last_synced_at ? new Date(setting.last_synced_at) : null;
      let isDue = false;

      if (!lastSync) {
        isDue = true;
      } else {
        const diffMs = now - lastSync;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (setting.frequency === 'daily' && diffDays >= 1) isDue = true;
        if (setting.frequency === 'weekly' && diffDays >= 7) isDue = true;
        if (setting.frequency === 'monthly' && diffDays >= 28) isDue = true;
      }

      if (!isDue) {
        results.push({ client: setting.client_name, status: 'skipped', reason: 'not due yet' });
        continue;
      }

      // Fetch client details
      const clients = await base44.asServiceRole.entities.Client.filter({ id: setting.client_id });
      const client = clients[0];
      if (!client) {
        results.push({ client: setting.client_name, status: 'error', reason: 'client not found' });
        continue;
      }

      const syncMonths = setting.data_range_months || 3;
      const clientResult = { client: setting.client_name, gsc: null, ga4: null };

      // Sync GSC
      if (setting.sync_gsc && client.google_search_console_url) {
        try {
          const rawKey = Deno.env.get('GSC_SERVICE_ACCOUNT_KEY');
          const serviceAccountKey = JSON.parse(rawKey);
          const auth = new GoogleAuth({
            credentials: serviceAccountKey,
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
          });
          const authClient = await auth.getClient();
          const tokenResponse = await authClient.getAccessToken();
          const accessToken = tokenResponse.token;
          const siteUrl = client.google_search_console_url;

          const monthRanges = [];
          for (let i = 0; i < syncMonths; i++) {
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
            const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1);
            const endD = i === 0 ? now : monthEnd;
            monthRanges.push({
              start: monthStart.toISOString().split('T')[0],
              end: endD.toISOString().split('T')[0],
            });
          }

          for (const range of monthRanges) {
            // Sequential calls to avoid hitting GSC rate limits (1200 QPM but burst sensitive)
            const overallRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ startDate: range.start, endDate: range.end, dimensions: [], rowLimit: 1 }),
            });
            await sleep(300);

            const kwRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ startDate: range.start, endDate: range.end, dimensions: ['query'], rowLimit: 10, orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }] }),
            });
            await sleep(300);

            const pagesRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ startDate: range.start, endDate: range.end, dimensions: ['page'], rowLimit: 10, orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }] }),
            });
            await sleep(300);

            // Handle 429 rate limit responses
            if (overallRes.status === 429 || kwRes.status === 429 || pagesRes.status === 429) {
              console.log(`GSC rate limit hit for ${client.name}, waiting 10s...`);
              await sleep(10000);
              clientResult.gsc = 'rate_limited';
              break;
            }

            const gscData = await overallRes.json();
            const row = gscData.rows?.[0] || {};
            let topKeywords = '', topPages = '';
            if (kwRes.ok) { const d = await kwRes.json(); topKeywords = JSON.stringify((d.rows || []).map(r => ({ query: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), position: Math.round(r.position * 10) / 10 }))); }
            if (pagesRes.ok) { const d = await pagesRes.json(); topPages = JSON.stringify((d.rows || []).map(r => ({ page: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), position: Math.round(r.position * 10) / 10 }))); }

            await base44.asServiceRole.entities.SEOData.create({
              client_id: setting.client_id,
              report_date: range.end,
              organic_clicks: Math.round(row.clicks || 0),
              organic_impressions: Math.round(row.impressions || 0),
              avg_position: row.position ? Math.round(row.position * 10) / 10 : null,
              ctr: row.ctr ? Math.round(row.ctr * 10000) / 100 : null,
              top_keywords: topKeywords,
              top_pages: topPages,
              notes: `Auto-synced. Period: ${range.start} to ${range.end}`,
            });

            // Pause between month ranges to be gentle on quota
            await sleep(500);
          }
          if (clientResult.gsc !== 'rate_limited') clientResult.gsc = 'synced';
        } catch (e) {
          clientResult.gsc = 'error: ' + e.message;
        }
      }

      // Sync GA4
      if (setting.sync_ga4 && client.ga_property_id) {
        try {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');
          const propertyId = client.ga_property_id;

          const ranges = [];
          for (let i = 0; i < syncMonths; i++) {
            const end = new Date(now);
            end.setDate(1);
            end.setMonth(end.getMonth() - i);
            const start = new Date(end);
            const endDate = new Date(end.getFullYear(), end.getMonth() + 1, 0);
            ranges.push({ start: start.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] });
          }

          for (const range of ranges) {
            const gaHeaders = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
            const gaUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

            // Sequential calls — GA4 Data API allows ~10 req/sec per property
            const metricsRes = await fetch(gaUrl, { method: 'POST', headers: gaHeaders, body: JSON.stringify({ dateRanges: [{ startDate: range.start, endDate: range.end }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }] }) });
            await sleep(200);

            const pagesRes = await fetch(gaUrl, { method: 'POST', headers: gaHeaders, body: JSON.stringify({ dateRanges: [{ startDate: range.start, endDate: range.end }], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 }) });
            await sleep(200);

            const sourcesRes = await fetch(gaUrl, { method: 'POST', headers: gaHeaders, body: JSON.stringify({ dateRanges: [{ startDate: range.start, endDate: range.end }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }) });
            await sleep(200);

            // Handle 429 rate limit
            if (metricsRes.status === 429 || pagesRes.status === 429 || sourcesRes.status === 429) {
              console.log(`GA4 rate limit hit for ${client.name}, waiting 10s...`);
              await sleep(10000);
              clientResult.ga4 = 'rate_limited';
              break;
            }

            const metricsData = await metricsRes.json();
            const mRow = metricsData.rows?.[0]?.metricValues || [];
            const getValue = (i) => parseFloat(mRow[i]?.value || '0');

            let topPages = '', trafficSources = '';
            if (pagesRes.ok) { const d = await pagesRes.json(); topPages = JSON.stringify((d.rows || []).map(r => ({ page: r.dimensionValues[0].value, sessions: Math.round(parseFloat(r.metricValues[0].value)), pageviews: Math.round(parseFloat(r.metricValues[1].value)) }))); }
            if (sourcesRes.ok) { const d = await sourcesRes.json(); trafficSources = JSON.stringify((d.rows || []).map(r => ({ source: r.dimensionValues[0].value, sessions: Math.round(parseFloat(r.metricValues[0].value)) }))); }

            await base44.asServiceRole.entities.GAData.create({
              client_id: setting.client_id,
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
              notes: `Auto-synced. Period: ${range.start} to ${range.end}`,
            });

            // Pause between month ranges
            await sleep(500);
          }
          if (clientResult.ga4 !== 'rate_limited') clientResult.ga4 = 'synced';
        } catch (e) {
          clientResult.ga4 = 'error: ' + e.message;
        }
      }

      // Update last_synced_at
      await base44.asServiceRole.entities.SyncSettings.update(setting.id, {
        last_synced_at: now.toISOString(),
      });

      clientResult.status = (clientResult.gsc === 'rate_limited' || clientResult.ga4 === 'rate_limited') ? 'rate_limited' : 'synced';
      results.push(clientResult);

      // Pause between clients to avoid cross-client rate accumulation
      await sleep(1000);
    }

    return Response.json({ success: true, processed: allSettings.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});