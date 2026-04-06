import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    is_local_seo,
    seo_file_url,
    ppc_file_url,
    brightlocal_data,
    client_name,
    date_range,
    client_context,
    client_score,
  } = await req.json();

  const scoreSection = client_score ? `

CLIENT SCORECARD (CSM/CSA Evaluation for this period):
- Overall Grade: ${client_score.overall_grade || "N/A"}
- Attended Meetings: ${client_score.attended_meetings || "N/A"}
- Responsiveness & Portal Engagement: ${client_score.responsiveness || "N/A"}
- Project Posts Submission: ${client_score.project_posts_submission || "N/A"}
- Lead Handling: ${client_score.lead_handling || "N/A"}
- CSM Notes: ${client_score.notes || "None"}
- Roadblocks: ${client_score.roadblocks || "None"}

Based on this scorecard, generate a client_scorecard block in the JSON with a friendly, professional 2-3 sentence explanation of why the client received this grade, and 2-4 specific, actionable improvement tips written directly to the client (use "you/your" tone). Be honest but encouraging.` : "";

  let prompt;
  const file_urls = [];

  if (is_local_seo) {
    // Local SEO mode: BrightLocal data + optional PPC PDF
    const blSection = brightlocal_data ? `
BRIGHTLOCAL / GBP PERFORMANCE DATA:
- Total GBP Views: ${brightlocal_data.gbp_insights?.total_views || "N/A"}
  - Search Desktop: ${brightlocal_data.gbp_insights?.search_desktop || "N/A"}
  - Search Mobile: ${brightlocal_data.gbp_insights?.search_mobile || "N/A"}
  - Maps Desktop: ${brightlocal_data.gbp_insights?.maps_desktop || "N/A"}
  - Maps Mobile: ${brightlocal_data.gbp_insights?.maps_mobile || "N/A"}
- Total Actions: ${brightlocal_data.gbp_insights?.total_actions || "N/A"}
  - Website Clicks: ${brightlocal_data.gbp_insights?.website_clicks || "N/A"}
  - Direction Requests: ${brightlocal_data.gbp_insights?.direction_requests || "N/A"}
  - Phone Calls: ${brightlocal_data.gbp_insights?.phone_calls || "N/A"}
- Local Search Grid Avg Map Rank: ${brightlocal_data.local_search_grid?.avg_map_rank || "N/A"}
- Rank Change: ${brightlocal_data.local_search_grid?.rank_change || "N/A"}
- Primary Keyword tracked: ${brightlocal_data.local_search_grid?.keyword || "N/A"}
- GBP Photos: ${brightlocal_data.gbp_insights?.photo_count || "N/A"}` : "";

    if (ppc_file_url) file_urls.push(ppc_file_url);

    prompt = `You are a senior digital marketing analyst for a window treatment marketing agency. You are creating a Local SEO performance report for "${client_name}" covering "${date_range}".

This client is on a LOCAL SEO program. Their primary traffic driver is Google Business Profile (GBP) — NOT traditional organic SEO. Do NOT reference website organic traffic or Search Console data.
${blSection}
${ppc_file_url ? `A PPC/Google Ads report PDF has also been provided as an attached file.` : `No PPC data was provided for this period.`}
${scoreSection}

Generate a comprehensive combined marketing performance report focused on Local SEO (GBP) performance.`;
  } else {
    // Regular SEO mode: SEO PDF (or auto data) + PPC PDF
    if (seo_file_url) file_urls.push(seo_file_url);
    if (ppc_file_url) file_urls.push(ppc_file_url);

    const brightlocalSection = brightlocal_data ? `
ADDITIONAL BRIGHTLOCAL / GBP DATA:
- Total GBP Views: ${brightlocal_data.gbp_insights?.total_views || "N/A"}
- Total Actions: ${brightlocal_data.gbp_insights?.total_actions || "N/A"}
- Website Clicks: ${brightlocal_data.gbp_insights?.website_clicks || "N/A"}
- Direction Requests: ${brightlocal_data.gbp_insights?.direction_requests || "N/A"}
- Phone Calls: ${brightlocal_data.gbp_insights?.phone_calls || "N/A"}
- Avg Map Rank: ${brightlocal_data.local_search_grid?.avg_map_rank || "N/A"}` : "";

    prompt = `You are a senior digital marketing analyst for a window treatment marketing agency. You have been given reports for the client "${client_name}" covering the period "${date_range}":
${seo_file_url ? `1. An SEO performance report (first file)` : `1. No SEO PDF provided — use any SEO data available in context.`}
${ppc_file_url ? `2. A PPC/Google Ads performance report (${seo_file_url ? "second" : "first"} file)` : `2. No PPC data provided.`}
${brightlocalSection}
${scoreSection}
Analyze all provided data and generate a comprehensive combined marketing performance report in JSON format.`;
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: file_urls.length > 0 ? file_urls : undefined,
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string", description: "2-3 paragraph executive summary" },
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