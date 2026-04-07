import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function extractHash(url) {
  const match = url.match(/location-dashboard\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

function extractNumber(text, ...patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1].trim().replace(/,/g, '');
  }
  return null;
}

async function fetchRendered(url) {
  // Jina.ai reader renders JS pages and returns clean markdown
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Accept': 'text/plain',
      'X-No-Cache': 'true',
    }
  });
  return res.text();
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

  const [gbpText, lsgText] = await Promise.all([
    fetchRendered(gbpAuditUrl),
    fetchRendered(lsgUrl),
  ]);

  // Parse GBP Insights from markdown
  const totalViews = extractNumber(gbpText,
    /Total Views[:\s]*([0-9.,k]+)/i,
    /Total Views:\s*([0-9.,k]+)/i
  );
  const searchDesktop = extractNumber(gbpText, /Search\s*-?\s*Desktop\s*([0-9,]+)/i);
  const searchMobile = extractNumber(gbpText, /Search\s*-?\s*Mobile\s*([0-9,.k]+)/i);
  const mapsDesktop = extractNumber(gbpText, /Maps\s*-?\s*Desktop\s*([0-9,]+)/i);
  const mapsMobile = extractNumber(gbpText, /Maps\s*-?\s*Mobile\s*([0-9,]+)/i);

  const totalActions = extractNumber(gbpText, /Total Actions[:\s]*([0-9,]+)/i);
  const websiteClicks = extractNumber(gbpText, /Website clicks?\s*([0-9,]+)/i);
  const directionRequests = extractNumber(gbpText, /Request directions?\s*([0-9,]+)/i);
  const phoneCalls = extractNumber(gbpText, /Call you\s*([0-9,]+)/i, /Total Calls?\s*([0-9,]+)/i);
  const photoCount = extractNumber(gbpText, /Images\s*\[?([0-9,]+)/i, /Photos?\s*([0-9,]+)/i);

  // Parse LSG data
  const avgRank = extractNumber(lsgText,
    /Average Map Rank[:\s]*([0-9.]+)/i,
    /Avg\.?\s*Rank[:\s]*([0-9.]+)/i
  );
  const rankChange = extractNumber(lsgText,
    /Rank Change[:\s]*([+-]?[0-9.]+)/i,
    /([+-][0-9.]+)\s*(?:rank|position)/i
  );
  const keywordMatch = lsgText.match(/Results for[:\s]*["']?([^"'\n]+)["']?/i)
    || lsgText.match(/Keyword[:\s]*([^\n]+)/i);
  const keyword = keywordMatch ? keywordMatch[1].trim() : null;

  return Response.json({
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
      phone_calls: phoneCalls,
      photo_count: photoCount,
    },
    local_search_grid: {
      avg_map_rank: avgRank,
      rank_change: rankChange,
      keyword: keyword,
    },
  });
});