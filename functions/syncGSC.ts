import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { GoogleAuth } from 'npm:google-auth-library@9.15.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, site_url, start_date, end_date } = await req.json();

    if (!client_id || !site_url) {
      return Response.json({ error: 'client_id and site_url are required' }, { status: 400 });
    }

    // Parse service account key from secret
    const rawKey = Deno.env.get("GSC_SERVICE_ACCOUNT_KEY");
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(rawKey);
    } catch (e) {
      return Response.json({ error: 'GSC_SERVICE_ACCOUNT_KEY secret is not valid JSON. Please re-paste the entire service account JSON key.' }, { status: 500 });
    }

    // Authenticate using service account
    const auth = new GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    // Build monthly date ranges to sync
    const today = new Date();
    const months = parseInt(sync_months) || 1;

    // Generate one entry per month going back `months` months
    const monthRanges = [];
    for (let i = 0; i < months; i++) {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i, 0); // last day of that month
      const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1); // first day of that month
      // For the current month, use today as end
      const endD = i === 0 ? today : monthEnd;
      monthRanges.push({
        start: monthStart.toISOString().split('T')[0],
        end: endD.toISOString().split('T')[0],
      });
    }

    const results = [];

    for (const range of monthRanges) {
      // Fetch overall metrics from GSC
      const gscResponse = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: range.start,
            endDate: range.end,
            dimensions: [],
            rowLimit: 1,
          }),
        }
      );

      if (!gscResponse.ok) {
        const errText = await gscResponse.text();
        return Response.json({ error: `GSC API error: ${errText}` }, { status: 400 });
      }

      const gscData = await gscResponse.json();
      const row = gscData.rows?.[0] || {};

      // Fetch top keywords
      const keywordsResponse = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: range.start,
            endDate: range.end,
            dimensions: ['query'],
            rowLimit: 10,
            orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
          }),
        }
      );

      let topKeywords = '';
      if (keywordsResponse.ok) {
        const kwData = await keywordsResponse.json();
        topKeywords = (kwData.rows || []).map(r => r.keys[0]).join(', ');
      }

      // Save to SEOData entity
      const seoRecord = await base44.entities.SEOData.create({
        client_id,
        report_date: range.end,
        organic_clicks: Math.round(row.clicks || 0),
        organic_impressions: Math.round(row.impressions || 0),
        avg_position: row.position ? Math.round(row.position * 10) / 10 : null,
        ctr: row.ctr ? Math.round(row.ctr * 10000) / 100 : null,
        top_keywords: topKeywords,
        notes: `Auto-synced from GSC. Period: ${range.start} to ${range.end}`,
      });

      results.push(seoRecord);
    }

    return Response.json({ success: true, synced: results.length, data: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});