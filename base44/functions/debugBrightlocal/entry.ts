import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { report_url } = await req.json();
  if (!report_url) return Response.json({ error: 'report_url is required' }, { status: 400 });

  // Try multiple hash patterns
  const patterns = [
    /location-dashboard\/([a-f0-9]+)/,
    /location-dashboard\/([^\/\?]+)/,
    /\/([a-f0-9]{8,})/,
    /dashboard\/([^\/\?#]+)/,
  ];

  let hash = null;
  for (const p of patterns) {
    const m = report_url.match(p);
    if (m) { hash = m[1]; break; }
  }

  const urls_to_try = hash ? [
    `https://www.local-marketing-reports.com/location-dashboard/${hash}/gbpa-reports`,
    `https://www.local-marketing-reports.com/location-dashboard/${hash}`,
  ] : [];

  const results = {};

  for (const url of urls_to_try) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });
      const html = await res.text();
      results[url] = {
        status: res.status,
        html_sample: html.slice(0, 3000),
        // Find anything that looks like numbers near keywords
        views_snippet: (html.match(/.{0,100}[Vv]iew.{0,100}/g) || []).slice(0, 5),
        actions_snippet: (html.match(/.{0,100}[Aa]ction.{0,100}/g) || []).slice(0, 5),
        rank_snippet: (html.match(/.{0,100}[Rr]ank.{0,100}/g) || []).slice(0, 5),
      };
    } catch (e) {
      results[url] = { error: e.message };
    }
  }

  return Response.json({ hash, report_url, results });
});