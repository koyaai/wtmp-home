import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Extract the hash from various BrightLocal URL formats
function extractHash(url) {
  const match = url.match(/location-dashboard\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

function extractNumber(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1].trim() : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { report_url } = await req.json();
  if (!report_url) return Response.json({ error: 'report_url is required' }, { status: 400 });

  const hash = extractHash(report_url);
  if (!hash) return Response.json({ error: 'Could not extract report hash from URL' }, { status: 400 });

  const gbpAuditUrl = `https://www.local-marketing-reports.com/location-dashboard/${hash}/gbpa-reports`;
  const lsgUrl = `https://www.local-marketing-reports.com/location-dashboard/${hash}/lsg/view`;

  const [gbpRes, lsgRes] = await Promise.all([
    fetch(gbpAuditUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    fetch(lsgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
  ]);

  const [gbpHtml, lsgHtml] = await Promise.all([gbpRes.text(), lsgRes.text()]);

  // Parse GBP Audit data
  const totalViews = extractNumber(gbpHtml, /Total Views[:\s]*<\/[^>]+>[^<]*<[^>]+>([0-9,]+)/);
  const totalActions = extractNumber(gbpHtml, /Total Actions[:\s]*<\/[^>]+>[^<]*<[^>]+>([0-9,]+)/);

  // Extract view breakdown
  const searchDesktop = extractNumber(gbpHtml, /Search - Desktop\s*<\/[^>]*>\s*([0-9,]+)/);
  const searchMobile = extractNumber(gbpHtml, /Search - Mobile\s*<\/[^>]*>\s*([0-9,]+)/);
  const mapsDesktop = extractNumber(gbpHtml, /Maps - Desktop\s*<\/[^>]*>\s*([0-9,]+)/);
  const mapsMobile = extractNumber(gbpHtml, /Maps - Mobile\s*<\/[^>]*>\s*([0-9,]+)/);

  // Extract action breakdown
  const websiteClicks = extractNumber(gbpHtml, /Website clicks\s*<\/[^>]*>\s*([0-9,]+)/);
  const directionRequests = extractNumber(gbpHtml, /Request directions\s*<\/[^>]*>\s*([0-9,]+)/);
  const phoneCalls = extractNumber(gbpHtml, /Call you\s*<\/[^>]*>\s*([0-9,]+)/);
  const totalCalls = extractNumber(gbpHtml, /Total Calls\s*([0-9,]+)/);

  // Extract photo count
  const photoCount = extractNumber(gbpHtml, /Images\s*<[^>]*>([0-9,]+)/);

  // Parse LSG (Local Search Grid) data
  const avgRank = extractNumber(lsgHtml, /Average Map Rank[\s\S]*?([0-9]+\.[0-9]+)/);
  const rankChange = extractNumber(lsgHtml, /([0-9]+\.[0-9]+)\s*<[^>]*>\s*(?:↑|↓|Change)/);

  // Extract keyword from LSG
  const keyword = extractNumber(lsgHtml, /Results for:\s*['"](.*?)['"]/);

  // Extract business name
  const businessName = extractNumber(gbpHtml, /<h1[^>]*>(.*?)<\/h1>/);

  const data = {
    source_url: report_url,
    generated_at: new Date().toISOString(),
    gbp_insights: {
      total_views: totalViews,
      search_desktop: searchDesktop,
      search_mobile: searchMobile,
      maps_desktop: mapsDesktop,
      maps_mobile: mapsMobile,
      total_actions: totalActions,
      website_clicks: websiteClicks,
      direction_requests: directionRequests,
      phone_calls: phoneCalls || totalCalls,
      photo_count: photoCount,
    },
    local_search_grid: {
      avg_map_rank: avgRank,
      rank_change: rankChange,
      keyword: keyword,
    },
  };

  return Response.json(data);
});