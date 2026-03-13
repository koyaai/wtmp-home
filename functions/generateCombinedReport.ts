import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { seo_file_url, ppc_file_url, client_name, date_range } = await req.json();

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a senior digital marketing analyst for a window treatment marketing agency. You have been given two reports for the client "${client_name}" covering the period "${date_range}":
1. An SEO performance report (first file)
2. A PPC/Google Ads performance report (second file)

Analyze both reports thoroughly and generate a comprehensive combined marketing performance report in JSON format.

Extract all the key data points you can find and synthesize insights across both channels.`,
    file_urls: [seo_file_url, ppc_file_url],
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string", description: "2-3 paragraph executive summary covering overall performance across SEO and PPC" },
        seo: {
          type: "object",
          properties: {
            highlights: { type: "array", items: { type: "string" }, description: "Key SEO wins and metrics" },
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
                direction_requests: { type: "string" }
              }
            },
            local_seo_notes: { type: "string" },
            challenges: { type: "array", items: { type: "string" } }
          }
        },
        ppc: {
          type: "object",
          properties: {
            highlights: { type: "array", items: { type: "string" }, description: "Key PPC wins and metrics" },
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
        combined_insights: { type: "array", items: { type: "string" }, description: "Cross-channel insights and observations" },
        wins: { type: "array", items: { type: "string" }, description: "Notable wins across both channels" },
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
        next_period_focus: { type: "array", items: { type: "string" } }
      }
    }
  });

  return Response.json(result);
});