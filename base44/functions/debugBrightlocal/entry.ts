import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { report_url } = await req.json();
  if (!report_url) return Response.json({ error: 'report_url is required' }, { status: 400 });

  const match = report_url.match(/location-dashboard\/([^\/\?#]+)/);
  const hash = match ? match[1] : null;
  if (!hash) return Response.json({ error: 'Could not extract hash' }, { status: 400 });

  const gbpaUrl = `https://www.local-marketing-reports.com/location-dashboard/${hash}/gbpa-reports`;
  const lsgUrl = `https://www.local-marketing-reports.com/location-dashboard/${hash}/lsg/view`;

  // Use LLM with internet context to read the JS-rendered pages
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Please visit these two BrightLocal dashboard pages and extract all the data you can find:

1. GBP Audit page: ${gbpaUrl}
2. Local Search Grid page: ${lsgUrl}

From the GBP Audit page, extract: Total Views, Search Desktop, Search Mobile, Maps Desktop, Maps Mobile, Total Actions, Website Clicks, Direction Requests, Phone Calls, photo count, and any other metrics shown.

From the Local Search Grid page, extract: Average Map Rank, Rank Change, keyword being tracked, and any ranking data.

Return all extracted data as structured JSON.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        gbp_insights: {
          type: "object",
          properties: {
            total_views: { type: "string" },
            search_desktop: { type: "string" },
            search_mobile: { type: "string" },
            maps_desktop: { type: "string" },
            maps_mobile: { type: "string" },
            total_actions: { type: "string" },
            website_clicks: { type: "string" },
            direction_requests: { type: "string" },
            phone_calls: { type: "string" },
            photo_count: { type: "string" }
          }
        },
        local_search_grid: {
          type: "object",
          properties: {
            avg_map_rank: { type: "string" },
            rank_change: { type: "string" },
            keyword: { type: "string" }
          }
        },
        raw_notes: { type: "string", description: "Any additional notes about what was found on the pages" }
      }
    }
  });

  return Response.json(result);
});