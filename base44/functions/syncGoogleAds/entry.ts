import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { GoogleAdsApi } from 'npm:google-ads-api@16.0.0';

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

    const cleanCustomerId = customer_id.replace(/-/g, '');
    const cleanManagerId = managerCustomerId ? managerCustomerId.replace(/-/g, '') : null;

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken,
    });

    const customer = client.Customer({
      customer_id: cleanCustomerId,
      login_customer_id: cleanManagerId || cleanCustomerId,
      refresh_token: refreshToken,
    });

    const results = [];

    for (let m = 0; m < sync_months; m++) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);

      const fmt = (d) => d.toISOString().split('T')[0];
      const periodStart = fmt(startDate);
      const periodEnd = fmt(endDate);

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${periodStart}' AND '${periodEnd}'
      `;

      const rows = await customer.query(query);

      let impressions = 0, clicks = 0, conversions = 0, costMicros = 0, convValue = 0;
      let ctrSum = 0, ctrCount = 0;

      for (const row of rows) {
        impressions += parseInt(row.metrics?.impressions || 0);
        clicks += parseInt(row.metrics?.clicks || 0);
        conversions += parseFloat(row.metrics?.conversions || 0);
        costMicros += parseInt(row.metrics?.cost_micros || 0);
        convValue += parseFloat(row.metrics?.conversions_value || 0);
        if (row.metrics?.ctr) { ctrSum += parseFloat(row.metrics.ctr); ctrCount++; }
      }

      const spend = costMicros / 1_000_000;
      const cpc = clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0;
      const ctr = ctrCount > 0 ? parseFloat((ctrSum / ctrCount * 100).toFixed(2)) : null;
      const roas = spend > 0 ? parseFloat((convValue / spend).toFixed(2)) : null;
      const costPerConversion = conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : null;

      const existing = await base44.asServiceRole.entities.PPCData.filter({
        client_id,
        report_date: periodStart,
        platform: 'Google Ads',
      });

      const record = {
        client_id,
        report_date: periodStart,
        platform: 'Google Ads',
        impressions,
        clicks,
        conversions: parseFloat(conversions.toFixed(1)),
        spend: parseFloat(spend.toFixed(2)),
        cpc,
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
    return Response.json({ error: error.message, details: error.errors || null }, { status: 500 });
  }
});