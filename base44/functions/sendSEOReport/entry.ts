import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, recipient_emails, notes } = await req.json();
    if (!client_id || !recipient_emails?.length) {
      return Response.json({ error: 'client_id and recipient_emails are required' }, { status: 400 });
    }

    // Fetch client info
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    const client = clients[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // Fetch latest SEO and GA data
    const [seoRecords, gaRecords] = await Promise.all([
      base44.asServiceRole.entities.SEOData.filter({ client_id }, '-report_date', 3),
      base44.asServiceRole.entities.GAData.filter({ client_id }, '-report_date', 3),
    ]);

    const latestSEO = seoRecords[0];
    const latestGA = gaRecords[0];

    if (!latestSEO && !latestGA) {
      return Response.json({ error: 'No SEO or GA data found for this client' }, { status: 404 });
    }

    // Build data summary for LLM
    const seoSummary = latestSEO ? `
SEO (Google Search Console) - ${latestSEO.report_date}:
- Organic Clicks: ${latestSEO.organic_clicks ?? 'N/A'}
- Organic Impressions: ${latestSEO.organic_impressions ?? 'N/A'}
- Average Position: ${latestSEO.avg_position ?? 'N/A'}
- CTR: ${latestSEO.ctr ?? 'N/A'}%
- GBP Views: ${latestSEO.gbp_views ?? 'N/A'}
- GBP Calls: ${latestSEO.gbp_calls ?? 'N/A'}
- GBP Direction Requests: ${latestSEO.gbp_direction_requests ?? 'N/A'}
` : 'No SEO data available.';

    const gaSummary = latestGA ? `
Google Analytics 4 - ${latestGA.period_start} to ${latestGA.period_end}:
- Sessions: ${latestGA.sessions ?? 'N/A'}
- Users: ${latestGA.users ?? 'N/A'}
- New Users: ${latestGA.new_users ?? 'N/A'}
- Pageviews: ${latestGA.pageviews ?? 'N/A'}
- Bounce Rate: ${latestGA.bounce_rate ?? 'N/A'}%
- Avg. Session Duration: ${latestGA.avg_session_duration ?? 'N/A'}s
` : 'No Google Analytics data available.';

    const prevSEO = seoRecords[1];
    const prevGA = gaRecords[1];
    const trendSummary = (prevSEO || prevGA) ? `
Previous period comparison:
${prevSEO && latestSEO ? `- Clicks change: ${latestSEO.organic_clicks - prevSEO.organic_clicks > 0 ? '+' : ''}${latestSEO.organic_clicks - prevSEO.organic_clicks}
- Position change: ${prevSEO.avg_position && latestSEO.avg_position ? (prevSEO.avg_position - latestSEO.avg_position).toFixed(1) + ' (lower is better)' : 'N/A'}` : ''}
${prevGA && latestGA ? `- Sessions change: ${latestGA.sessions - prevGA.sessions > 0 ? '+' : ''}${latestGA.sessions - prevGA.sessions}
- Users change: ${latestGA.users - prevGA.users > 0 ? '+' : ''}${latestGA.users - prevGA.users}` : ''}
` : '';

    // Generate AI summary
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a digital marketing specialist writing a monthly performance email to the client "${client.name}".

Here is their latest data:

${seoSummary}
${gaSummary}
${trendSummary}

${notes ? `Additional notes from the team: ${notes}` : ''}

Write a professional, friendly, and easy-to-understand monthly performance email. Use clear sections with emoji headers. Highlight wins, note any concerns constructively, and end with 2–3 actionable recommendations. Write as if addressing the client directly ("your website", "your business"). Keep it concise — 400 words max. Format as clean HTML suitable for an email body (use <p>, <ul>, <li>, <strong>, <h3> tags). Do not include html or body tags.`,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Email subject line' },
          html_body: { type: 'string', description: 'Full HTML email body content' },
          plain_summary: { type: 'string', description: 'One-sentence summary of performance' }
        }
      }
    });

    const { subject, html_body } = aiResult;

    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const fullHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 32px; border-radius: 12px 12px 0 0; color: white;">
    <h1 style="margin: 0; font-size: 22px; font-weight: bold;">${client.name}</h1>
    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Monthly Performance Report — ${monthYear}</p>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    ${html_body}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      This report was automatically generated based on your latest SEO and analytics data.<br/>
      Questions? Reply to this email or reach out to your account manager.
    </p>
  </div>
</div>`;

    // Send to all recipients
    await Promise.all(recipient_emails.map(email =>
      base44.integrations.Core.SendEmail({
        to: email,
        subject: subject || `${client.name} — Monthly SEO & Analytics Report (${monthYear})`,
        body: fullHtml,
      })
    ));

    // Update last_sent_date on the schedule if one exists
    const schedules = await base44.asServiceRole.entities.ReportSchedule.filter({ client_id });
    if (schedules[0]) {
      await base44.asServiceRole.entities.ReportSchedule.update(schedules[0].id, {
        last_sent_date: new Date().toISOString().split('T')[0],
      });
    }

    return Response.json({
      success: true,
      sent_to: recipient_emails,
      subject: subject,
      summary: aiResult.plain_summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});