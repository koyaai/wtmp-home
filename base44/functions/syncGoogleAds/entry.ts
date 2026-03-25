import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, customer_id, sync_months = 1 } = await req.json();
    if (!client_id || !customer_id) {
      return Response.json({ error: 'client_id and customer_id are required' }, { status: 400 });
    }

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const managerCustomerId = Deno.env.get('GOOGLE_ADS_MANAGER_CUSTOMER_ID');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('google_oauth_client_secret');
    const refreshToken = Deno.env.get('GOOGLE_ADS_REFRESH_TOKEN');

    // Get access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.json({ error: 'Failed to get access token', details: tokenData }, { status: 500 });
    }
    const accessToken = tokenData.access_token;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
      'x-goog-api-client': 'gl-js/v19',
    };
    if (managerCustomerId) {
      headers['login-customer-id'] = managerCustomerId.replace(/-/g, '');
    }

    const cleanCustomerId = customer_id.replace(/-/g, '');
    const results = [];

    for (let m = 0; m < sync_months; m++) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);

      const fmt = (d) => d.toISOString().split('T')[0];
      const periodStart = fmt(startDate);
      const periodEnd = fmt(endDate);

      const query = `SELECT metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.ctr, metrics.average_cpc, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${periodStart}' AND '${periodEnd}'`;

      const adsRes = await fetch(
        `https://googleads.googleapis.com/v19/customers/${cleanCustomerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ query }),
        }
      );

      const rawText = await adsRes.text();
      if (rawText.trim().startsWith('<')) {
        return Response.json({ error: `Google Ads API HTML error (${adsRes.status})`, rawResponse: rawText.slice(0, 300) }, { status: 500 });
      }
      const adsJson = JSON.parse(rawText);
      if (!adsRes.ok) {
        const errDetail = Array.isArray(adsJson) ? adsJson[0]?.error : adsJson?.error;
        return Response.json({ error: errDetail?.message || `Google Ads API error (${adsRes.status})`, details: errDetail }, { status: 500 });
      }

      // searchStream returns an array of batch objects: [{results: [...]}, ...]
      const rows = (Array.isArray(adsJson) ? adsJson : [adsJson])
        .flatMap(batch => batch?.results || []);

      // Aggregate all rows for this month
      let impressions = 0, clicks = 0, conversions = 0, costMicros = 0, convValue = 0;
      let ctrTotal = 0, ctrCount = 0;

      for (const row of rows) {
        impressions += parseInt(row.metrics?.impressions || 0);
        clicks += parseInt(row.metrics?.clicks || 0);
        conversions += parseFloat(row.metrics?.conversions || 0);
        costMicros += parseInt(row.metrics?.costMicros || 0);
        convValue += parseFloat(row.metrics?.conversionsValue || 0);
        if (row.metrics?.ctr) { ctrTotal += parseFloat(row.metrics.ctr); ctrCount++; }
      }

      const spend = costMicros / 1_000_000;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const ctr = ctrCount > 0 ? parseFloat((ctrTotal / ctrCount * 100).toFixed(2)) : null;
      const roas = spend > 0 ? parseFloat((convValue / spend).toFixed(2)) : null;
      const costPerConversion = conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : null;

      // Check if record exists for this period
      const existing = await base44.asServiceRole.entities.PPCData.filter({
        client_id,
        report_date: periodStart,
        platform: 'Google Ads',
      });

      const record = {
        client_id,
        report_date: periodStart,
        period_start: periodStart,
        period_end: periodEnd,
        platform: 'Google Ads',
        impressions,
        clicks,
        conversions: parseFloat(conversions.toFixed(1)),
        spend: parseFloat(spend.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        ctr,
        roas,
        cost_per_conversion: costPerConversion,
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.PPCData.update(existing[0].id, record);
      } else {
        await base44.asServiceRole.entities.PPCData.create(record);
      }

      results.push({ period: `${periodStart} – ${periodEnd}`, impressions, clicks, spend: spend.toFixed(2) });
    }

    return Response.json({ success: true, synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});