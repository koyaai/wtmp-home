import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { client_id } = await req.json();

  if (!client_id) return Response.json({ error: 'client_id required' }, { status: 400 });

  // Use service role - this is a public endpoint, no user auth needed
  const [reports, client] = await Promise.all([
    base44.asServiceRole.entities.MonthlyReport.filter({ client_id }, '-year'),
    base44.asServiceRole.entities.Client.filter({ id: client_id }),
  ]);

  // Sort reports by year desc, then month desc
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  reports.sort((a, b) => {
    if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });

  return Response.json({ reports, client: client[0] || null });
});