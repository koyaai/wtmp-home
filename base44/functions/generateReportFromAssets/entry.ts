import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { client_id, month, year, date_range, brightlocal_data: passedBrightlocalData } = await req.json();

  if (!client_id) return Response.json({ error: 'client_id is required' }, { status: 400 });

  // Fetch client
  const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
  const client = clients?.[0];
  if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

  const sections = [];
  let brightlocal_data = null;

  // Compute target month/year for record matching
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const targetMonthIndex = month ? new Date(`${month} 1, ${targetYear}`).getMonth() : null;

  const findByMonth = (records) => {
    if (targetMonthIndex === null) return null;
    return records.find(r => {
      const d = new Date(r.report_date);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonthIndex;
    }) || null;
  };
  const mostRecent = (records) => records.sort((a, b) => new Date(b.report_date) - new Date(a.report_date))[0];

  // ── 1. BrightLocal ────────────────────────────────────────────────
  // If brightlocal_data was pre-fetched by the frontend, use it directly to avoid timeout
  if (passedBrightlocalData?.gbp_insights) {
    const blRes = passedBrightlocalData;
    brightlocal_data = blRes;
    sections.push(`
BRIGHTLOCAL / GBP PERFORMANCE (map these to seo.gbp_metrics in the output JSON):
- GBP Impressions (total_views → impressions): ${blRes.gbp_insights?.total_views || "N/A"}
  - Search Desktop: ${blRes.gbp_insights?.search_desktop || "N/A"}
  - Search Mobile: ${blRes.gbp_insights?.search_mobile || "N/A"}
  - Maps Desktop: ${blRes.gbp_insights?.maps_desktop || "N/A"}
  - Maps Mobile: ${blRes.gbp_insights?.maps_mobile || "N/A"}
- Total Actions: ${blRes.gbp_insights?.total_actions || "N/A"}
- Website Clicks (→ website_clicks): ${blRes.gbp_insights?.website_clicks || "N/A"}
- Direction Requests (→ direction_requests): ${blRes.gbp_insights?.direction_requests || "N/A"}
- Phone Calls (→ call_clicks): ${blRes.gbp_insights?.phone_calls || "N/A"}
- Avg Map Rank (→ avg_map_rank): ${blRes.local_search_grid?.avg_map_rank || "N/A"}
- Rank Change (→ rank_change): ${blRes.local_search_grid?.rank_change || "N/A"}
- Primary Keyword: ${blRes.local_search_grid?.keyword || "N/A"}
IMPORTANT: Populate seo.gbp_metrics with the above values using the field mappings indicated.`);
  } else if (client.brightlocal_report_url) {
    try {
      const blRes = await base44.asServiceRole.functions.invoke('fetchBrightlocalData', {
        report_url: client.brightlocal_report_url,
      });
      if (blRes?.gbp_insights) {
        brightlocal_data = blRes;
        sections.push(`
BRIGHTLOCAL / GBP PERFORMANCE (map these to seo.gbp_metrics in the output JSON):
- GBP Impressions (total_views → impressions): ${blRes.gbp_insights?.total_views || "N/A"}
  - Search Desktop: ${blRes.gbp_insights?.search_desktop || "N/A"}
  - Search Mobile: ${blRes.gbp_insights?.search_mobile || "N/A"}
  - Maps Desktop: ${blRes.gbp_insights?.maps_desktop || "N/A"}
  - Maps Mobile: ${blRes.gbp_insights?.maps_mobile || "N/A"}
- Total Actions: ${blRes.gbp_insights?.total_actions || "N/A"}
- Website Clicks (→ website_clicks): ${blRes.gbp_insights?.website_clicks || "N/A"}
- Direction Requests (→ direction_requests): ${blRes.gbp_insights?.direction_requests || "N/A"}
- Phone Calls (→ call_clicks): ${blRes.gbp_insights?.phone_calls || "N/A"}
- Avg Map Rank (→ avg_map_rank): ${blRes.local_search_grid?.avg_map_rank || "N/A"}
- Rank Change (→ rank_change): ${blRes.local_search_grid?.rank_change || "N/A"}
- Primary Keyword: ${blRes.local_search_grid?.keyword || "N/A"}
IMPORTANT: Populate seo.gbp_metrics with the above values using the field mappings indicated.`);
      }
    } catch (e) {
      sections.push(`\nBRIGHTLOCAL: Could not fetch data (${e.message})`);
    }
  }

  // ── 2. SEO / GSC data from stored records ─────────────────────────
  if (client.google_search_console_url || client.ga_property_id) {
    const seoRecords = await base44.asServiceRole.entities.SEOData.filter({ client_id });
    const seo = findByMonth(seoRecords) || mostRecent(seoRecords);
    if (seo) {
      sections.push(`
GOOGLE SEARCH CONSOLE / SEO DATA (most recent stored):
- Report Date: ${seo.report_date || "N/A"}
- Organic Clicks: ${seo.organic_clicks ?? "N/A"}
- Organic Impressions: ${seo.organic_impressions ?? "N/A"}
- Avg Position: ${seo.avg_position ?? "N/A"}
- CTR: ${seo.ctr ?? "N/A"}%
- Top Keywords: ${seo.top_keywords || "N/A"}
- Top Pages: ${seo.top_pages || "N/A"}
- GBP Views: ${seo.gbp_views ?? "N/A"}
- GBP Calls: ${seo.gbp_calls ?? "N/A"}
- GBP Direction Requests: ${seo.gbp_direction_requests ?? "N/A"}`);
    }
  }

  // ── 3. GA4 data from stored records ───────────────────────────────
  if (client.ga_property_id) {
    const gaRecords = await base44.asServiceRole.entities.GAData.filter({ client_id });
    const ga = findByMonth(gaRecords) || mostRecent(gaRecords);
    if (ga) {
      sections.push(`
GOOGLE ANALYTICS 4 DATA (most recent stored):
- Report Date: ${ga.report_date || "N/A"}
- Sessions: ${ga.sessions ?? "N/A"}
- Users: ${ga.users ?? "N/A"}
- New Users: ${ga.new_users ?? "N/A"}
- Bounce Rate: ${ga.bounce_rate ?? "N/A"}%
- Avg Session Duration: ${ga.avg_session_duration ?? "N/A"}s
- Conversions: ${ga.conversions ?? "N/A"}
- Top Channels: ${ga.top_channels || "N/A"}
- Top Pages: ${ga.top_pages || "N/A"}`);
    }
  }

  // ── 4. Lead Boomerang / Lead data from stored records ──────────────────────────
  if (client.ghl_location_id) {
    const leadRecords = await base44.asServiceRole.entities.LeadData.filter({ client_id });
    const lead = findByMonth(leadRecords) || mostRecent(leadRecords);
    if (lead) {
      sections.push(`
LEAD BOOMERANG / LEAD DATA (most recent stored):
- Report Date: ${lead.report_date || "N/A"}
- Total Leads: ${lead.total_leads ?? "N/A"}
- New Leads: ${lead.new_leads ?? "N/A"}
- Qualified Leads: ${lead.qualified_leads ?? "N/A"}
- Appointments Booked: ${lead.appointments_booked ?? "N/A"}
- Appointments Showed: ${lead.appointments_showed ?? "N/A"}
- Closed Deals: ${lead.closed_deals ?? "N/A"}
- Revenue Generated: ${lead.revenue_generated ? `$${lead.revenue_generated}` : "N/A"}
- Lead Sources: ${lead.lead_sources || "N/A"}`);
    }
  }

  if (sections.length === 0) {
    return Response.json({ error: 'No connected data sources found for this client.' }, { status: 422 });
  }

  // ── 5. Client scorecard ───────────────────────────────────────────
  let scoreSection = '';
  const scoreResults = await base44.asServiceRole.entities.ClientScore.filter({
    client_id,
    month: month || '',
    year: year || new Date().getFullYear(),
  });
  const clientScore = scoreResults[0];
  if (clientScore) {
    scoreSection = `
CLIENT SCORECARD (CSM/CSA Evaluation):
- Overall Grade: ${clientScore.overall_grade || "N/A"}
- Attended Meetings: ${clientScore.attended_meetings || "N/A"}
- Responsiveness: ${clientScore.responsiveness || "N/A"}
- Notes: ${clientScore.notes || "None"}
Based on this scorecard, generate a client_scorecard block with a 2-3 sentence grade explanation and 2-4 improvement tips written to the client.`;
  }

  const isLocalSEO = client.services?.includes('Local SEO') && !client.services?.includes('SEO');
  const retainerFee = client.retainer_fee || null;

  const prompt = `You are a senior digital marketing analyst for a window treatment marketing agency. 
Generate a comprehensive marketing performance report for "${client.name}" covering "${date_range || `${month || ''} ${year || ''}`}".

The following data was automatically pulled from connected integrations:
${sections.join('\n')}
${scoreSection}

Services this client is on: ${client.services?.join(', ') || 'Not specified'}
Monthly Retainer Fee: ${retainerFee ? `$${retainerFee}` : 'Not specified (cannot calculate ROI)'}
Location: ${client.location || 'Not specified'}
Website: ${client.website || 'Not specified'}

${isLocalSEO ? 'This client is on a LOCAL SEO program. Focus on GBP/local search performance.' : 'This client is on a full SEO program. Cover both organic and local performance.'}

IMPORTANT: Only populate the "ppc" block if actual PPC/Google Ads data was provided above. Lead Boomerang lead data is NOT PPC data — do NOT use it to fill PPC metrics. If no PPC data is available, leave all ppc fields as "N/A" or empty arrays.

For the "leads" block: Use the Lead Boomerang data provided above. Calculate ROI where possible:
- cost_per_lead = retainer_fee / total_leads (if both available)
- roi_estimate = ((revenue_generated - retainer_fee) / retainer_fee) * 100 as a percentage string
- Provide a 2-3 sentence roi_narrative explaining what the numbers mean for the client.
If no Lead Boomerang data is available, omit or leave leads fields as N/A. — do NOT use it to fill PPC metrics. If no PPC data is available, leave all ppc fields as "N/A" or empty arrays.

Analyze all provided data and generate a comprehensive combined marketing performance report. If some data is missing or unavailable, note it briefly but focus on what IS available.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        seo: {
          type: "object",
          properties: {
            highlights: { type: "array", items: { type: "string" } },
            organic_sessions: { type: "string" },
            organic_clicks: { type: "string" },
            avg_position: { type: "string" },
            top_pages: { type: "array", items: { type: "string" } },
            gbp_metrics: {
              type: "object",
              properties: {
                impressions: { type: "string" },
                website_clicks: { type: "string" },
                call_clicks: { type: "string" },
                direction_requests: { type: "string" },
                avg_map_rank: { type: "string" },
                rank_change: { type: "string" }
              }
            },
            local_seo_notes: { type: "string" },
            challenges: { type: "array", items: { type: "string" } }
          }
        },
        ppc: {
          type: "object",
          properties: {
            highlights: { type: "array", items: { type: "string" } },
            total_spend: { type: "string" },
            total_leads: { type: "string" },
            cost_per_lead: { type: "string" },
            total_clicks: { type: "string" },
            impressions: { type: "string" },
            avg_cpc: { type: "string" },
            ctr: { type: "string" },
            conversions_breakdown: { type: "string" },
            top_performing_city: { type: "string" },
            top_performing_keywords: { type: "array", items: { type: "string" } },
            challenges: { type: "array", items: { type: "string" } }
          }
        },
        combined_insights: { type: "array", items: { type: "string" } },
        wins: { type: "array", items: { type: "string" } },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              channel: { type: "string" },
              priority: { type: "string", enum: ["High", "Medium", "Low"] },
              action: { type: "string" }
            }
          }
        },
        next_period_focus: { type: "array", items: { type: "string" } },
        leads: {
          type: "object",
          properties: {
            total_leads: { type: "string" },
            new_leads: { type: "string" },
            qualified_leads: { type: "string" },
            appointments_booked: { type: "string" },
            appointments_showed: { type: "string" },
            closed_deals: { type: "string" },
            revenue_generated: { type: "string" },
            cost_per_lead: { type: "string" },
            close_rate: { type: "string" },
            roi_estimate: { type: "string" },
            roi_narrative: { type: "string" },
            lead_sources_summary: { type: "string" },
            highlights: { type: "array", items: { type: "string" } }
          }
        },
        client_scorecard: {
          type: "object",
          properties: {
            overall_grade: { type: "string" },
            grade_summary: { type: "string" },
            improvement_tips: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  });

  return Response.json(result);
});