import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { client_id, month, year, date_range, brightlocal_data: passedBrightlocalData } = await req.json();
  if (!client_id) return Response.json({ error: 'client_id is required' }, { status: 400 });

  const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
  const client = clients?.[0];
  if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

  // ── Month matching ────────────────────────────────────────────────
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const targetMonthIndex = month ? new Date(`${month} 1, ${targetYear}`).getMonth() : null;

  // Use T12:00:00 to avoid UTC midnight timezone shifts
  const matchesMonth = (reportDate) => {
    if (targetMonthIndex === null || !reportDate) return false;
    const d = new Date(reportDate + 'T12:00:00');
    return d.getFullYear() === targetYear && d.getMonth() === targetMonthIndex;
  };

  const findByMonth = (records) => {
    return records.find(r => matchesMonth(r.report_date)) || null;
  };

  const sections = [];

  // ── 1. BrightLocal / GBP ─────────────────────────────────────────
  let blData = null;
  if (passedBrightlocalData?.gbp_insights) {
    blData = passedBrightlocalData;
  } else if (client.brightlocal_report_url) {
    try {
      const blRes = await base44.asServiceRole.functions.invoke('fetchBrightlocalData', {
        report_url: client.brightlocal_report_url,
      });
      if (blRes?.gbp_insights) blData = blRes;
    } catch (_) {}
  }

  if (blData) {
    sections.push(`BRIGHTLOCAL / GBP PERFORMANCE for ${month} ${year}:
- GBP Impressions: ${blData.gbp_insights?.total_views ?? 'N/A'}
  - Search Desktop: ${blData.gbp_insights?.search_desktop ?? 'N/A'}
  - Search Mobile: ${blData.gbp_insights?.search_mobile ?? 'N/A'}
  - Maps Desktop: ${blData.gbp_insights?.maps_desktop ?? 'N/A'}
  - Maps Mobile: ${blData.gbp_insights?.maps_mobile ?? 'N/A'}
- Total Actions: ${blData.gbp_insights?.total_actions ?? 'N/A'}
- Website Clicks: ${blData.gbp_insights?.website_clicks ?? 'N/A'}
- Direction Requests: ${blData.gbp_insights?.direction_requests ?? 'N/A'}
- Phone Calls: ${blData.gbp_insights?.phone_calls ?? 'N/A'}
- Avg Map Rank: ${blData.local_search_grid?.avg_map_rank ?? 'N/A'}
- Rank Change: ${blData.local_search_grid?.rank_change ?? 'N/A'}
- Primary Keyword: ${blData.local_search_grid?.keyword ?? 'N/A'}
Map this data to the seo.gbp_metrics block in the output JSON.`);
  }

  // ── 2. SEO / GSC ─────────────────────────────────────────────────
  if (client.google_search_console_url || client.ga_property_id) {
    const seoRecords = await base44.asServiceRole.entities.SEOData.filter({ client_id });
    const seo = findByMonth(seoRecords);
    if (seo) {
      sections.push(`GOOGLE SEARCH CONSOLE / SEO DATA for ${month} ${year} (report_date: ${seo.report_date}):
- Organic Clicks: ${seo.organic_clicks ?? 'N/A'}
- Organic Impressions: ${seo.organic_impressions ?? 'N/A'}
- Avg Position: ${seo.avg_position ?? 'N/A'}
- CTR: ${seo.ctr ?? 'N/A'}%
- Top Keywords: ${seo.top_keywords || 'N/A'}
- Top Pages: ${seo.top_pages || 'N/A'}
- GBP Views: ${seo.gbp_views ?? 'N/A'}
- GBP Calls: ${seo.gbp_calls ?? 'N/A'}
- GBP Direction Requests: ${seo.gbp_direction_requests ?? 'N/A'}`);
    }
  }

  // ── 3. GA4 ───────────────────────────────────────────────────────
  if (client.ga_property_id) {
    const gaRecords = await base44.asServiceRole.entities.GAData.filter({ client_id });
    const ga = findByMonth(gaRecords);
    if (ga) {
      // Parse traffic sources to find organic search sessions
      let organicSessions = 'N/A';
      if (ga.traffic_sources) {
        try {
          const sources = typeof ga.traffic_sources === 'string' ? JSON.parse(ga.traffic_sources) : ga.traffic_sources;
          const organic = sources.find(s => s.source === 'Organic Search');
          if (organic) organicSessions = organic.sessions;
        } catch (_) {}
      }
      sections.push(`GOOGLE ANALYTICS 4 DATA for ${month} ${year} (report_date: ${ga.report_date}):
- Total Sessions: ${ga.sessions ?? 'N/A'}
- Total Users: ${ga.users ?? 'N/A'}
- New Users: ${ga.new_users ?? 'N/A'}
- Organic Search Sessions: ${organicSessions}
- Bounce Rate: ${ga.bounce_rate !== null && ga.bounce_rate !== undefined ? (ga.bounce_rate * 100).toFixed(0) + '%' : 'N/A'}
- Avg Session Duration: ${ga.avg_session_duration ?? 'N/A'} seconds
- Pageviews: ${ga.pageviews ?? 'N/A'}
- Traffic Sources Breakdown: ${ga.traffic_sources || 'N/A'}
- Top Pages: ${ga.top_pages || 'N/A'}

Map sessions, users, new_users, organic_sessions, bounce_rate, avg_session_duration, pageviews, and traffic_sources_breakdown to the seo.ga4_metrics block in the output JSON.`);
    }
  }

  // ── 4. GHL Lead Data ─────────────────────────────────────────────
  if (client.ghl_location_id) {
    const leadRecords = await base44.asServiceRole.entities.LeadData.filter({ client_id });
    const lead = findByMonth(leadRecords);
    if (lead) {
      const retainerFee = client.retainer_fee;
      // Use new_leads as the this-month count (total_leads may include pipeline history)
      const monthLeads = lead.new_leads ?? lead.total_leads;
      let costPerLead = null;
      let roiPct = null;
      if (retainerFee && monthLeads) costPerLead = (retainerFee / monthLeads).toFixed(2);
      if (retainerFee && lead.revenue_generated) {
        roiPct = (((lead.revenue_generated - retainerFee) / retainerFee) * 100).toFixed(0);
      }

      sections.push(`GHL / LEAD DATA for ${month} ${year} (report_date: ${lead.report_date}):
- New Leads This Month: ${monthLeads ?? 'N/A'}
- Closed Deals (won this month): ${lead.closed_deals ?? 'N/A'}
- Revenue Generated (from won deals): ${lead.revenue_generated ? `$${lead.revenue_generated.toLocaleString()}` : 'N/A'}
- Qualified Leads: ${lead.qualified_leads ?? 'N/A (manually entered)'}
- Appointments Booked: ${lead.appointments_booked ?? 'N/A (manually entered)'}
- Appointments Showed: ${lead.appointments_showed ?? 'N/A (manually entered)'}
- Monthly Retainer Fee: ${retainerFee ? `$${retainerFee}` : 'N/A'}
- Calculated Cost Per Lead: ${costPerLead ? `$${costPerLead}` : 'N/A'}
- Calculated ROI: ${roiPct !== null ? `${roiPct}%` : 'N/A'}
- Lead Sources Breakdown: ${lead.lead_sources || 'N/A'}

IMPORTANT: Use exactly these numbers for the leads block. Do NOT estimate or fabricate lead counts. The "New Leads This Month" figure is the correct total_leads for this report.`);
    } else {
      sections.push(`GHL / LEAD DATA: No data found for ${month} ${year}. The leads section should indicate data is not yet available for this month.`);
    }
  }

  // ── 5. PPC Data ──────────────────────────────────────────────────
  const ppcRecords = await base44.asServiceRole.entities.PPCData.filter({ client_id });
  const ppc = findByMonth(ppcRecords);
  if (ppc) {
    sections.push(`PPC / GOOGLE ADS DATA for ${month} ${year} (report_date: ${ppc.report_date}):
- Platform: ${ppc.platform || 'Google Ads'}
- Impressions: ${ppc.impressions ?? 'N/A'}
- Clicks: ${ppc.clicks ?? 'N/A'}
- CTR: ${ppc.ctr ?? 'N/A'}%
- Spend: ${ppc.spend ? `$${ppc.spend}` : 'N/A'}
- CPC: ${ppc.cpc ? `$${ppc.cpc}` : 'N/A'}
- Conversions: ${ppc.conversions ?? 'N/A'}
- Cost Per Conversion: ${ppc.cost_per_conversion ? `$${ppc.cost_per_conversion}` : 'N/A'}
- ROAS: ${ppc.roas ?? 'N/A'}
- Budget: ${ppc.budget ? `$${ppc.budget}` : 'N/A'}
- Notes: ${ppc.notes || 'None'}
Map this data to the ppc block in the output JSON.`);
  }

  if (sections.length === 0) {
    return Response.json({ error: 'No data found for this client and month. Make sure data has been synced for the selected period.' }, { status: 422 });
  }

  // ── 6. Client scorecard ───────────────────────────────────────────
  let scoreSection = '';
  const scoreResults = await base44.asServiceRole.entities.ClientScore.filter({
    client_id,
    month: month || '',
    year: year || new Date().getFullYear(),
  });
  const clientScore = scoreResults[0];
  if (clientScore) {
    scoreSection = `
CLIENT SCORECARD (CSM Evaluation for ${month} ${year}):
- Overall Grade: ${clientScore.overall_grade || 'N/A'}
- Attended Meetings: ${clientScore.attended_meetings || 'N/A'}
- Responsiveness: ${clientScore.responsiveness || 'N/A'}
- Lead Handling: ${clientScore.lead_handling || 'N/A'}
- Notes: ${clientScore.notes || 'None'}
Generate a client_scorecard block with a 2-3 sentence grade explanation and 2-4 improvement tips written directly to the client.`;
  }

  const isLocalSEO = client.services?.includes('Local SEO') && !client.services?.includes('SEO');
  const retainerFee = client.retainer_fee || null;

  const prompt = `You are a senior digital marketing analyst at a window treatment marketing agency.

Generate a professional monthly performance report for "${client.name}" covering ${month} ${year}.

DATA AVAILABLE (${month} ${year} only):
${sections.join('\n\n')}
${scoreSection}

CLIENT CONTEXT:
- Services: ${client.services?.join(', ') || 'Not specified'}
- Monthly Retainer: ${retainerFee ? `$${retainerFee}` : 'Not specified'}
- Location: ${client.location || 'Not specified'}
- Website: ${client.website || 'Not specified'}
- SEO Type: ${isLocalSEO ? 'Local SEO (GBP-focused)' : 'Full SEO'}

STRICT RULES:
1. ONLY use data explicitly provided above for ${month} ${year}. Do NOT invent, estimate, or fabricate any numbers.
2. For the "leads" block: use the GHL data above verbatim. "total_leads" = "New Leads This Month" figure.
3. ONLY populate the "ppc" block if actual PPC data was provided above. Lead data is NOT PPC data.
4. If a metric is "N/A" or not provided, output it as "N/A" — never guess.
5. The executive_summary and narratives should be written in a friendly, professional tone for the client.
6. Focus insights on what actually happened this month and what it means for the client's business.`;

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
            challenges: { type: "array", items: { type: "string" } },
            ga4_metrics: {
              type: "object",
              properties: {
                sessions: { type: "string" },
                users: { type: "string" },
                new_users: { type: "string" },
                organic_sessions: { type: "string" },
                bounce_rate: { type: "string" },
                avg_session_duration: { type: "string" },
                pageviews: { type: "string" },
                traffic_sources_breakdown: { type: "string" }
              }
            }
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
        wins: { type: "array", items: { type: "string" } },
        combined_insights: { type: "array", items: { type: "string" } },
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