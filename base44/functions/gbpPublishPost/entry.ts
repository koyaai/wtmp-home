import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function refreshAccessToken(base44, settings) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: settings.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    const tokens = await res.json();
    if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error}`);

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    await base44.asServiceRole.entities.GBPSettings.update(settings.id, {
        access_token: tokens.access_token,
        token_expiry: expiry,
    });

    return tokens.access_token;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { location_name, summary, post_type, cta_type, cta_url, event_title, event_start, event_end } = await req.json();

        if (!location_name || !summary) {
            return Response.json({ error: 'location_name and summary are required' }, { status: 400 });
        }

        const settings = await base44.asServiceRole.entities.GBPSettings.filter({});
        if (!settings.length || !settings[0].connected) {
            return Response.json({ error: 'GBP not connected' }, { status: 400 });
        }

        let s = settings[0];
        let accessToken = s.access_token;

        if (new Date(s.token_expiry) <= new Date()) {
            accessToken = await refreshAccessToken(base44, s);
        }

        // Build post body
        const postBody = {
            summary,
            topicType: post_type || 'STANDARD',
        };

        if (cta_type && cta_url) {
            postBody.callToAction = {
                actionType: cta_type,
                url: cta_url,
            };
        }

        if (post_type === 'EVENT' && event_title) {
            postBody.event = {
                title: event_title,
                schedule: {
                    startDate: event_start ? { year: parseInt(event_start.split('-')[0]), month: parseInt(event_start.split('-')[1]), day: parseInt(event_start.split('-')[2]) } : undefined,
                    endDate: event_end ? { year: parseInt(event_end.split('-')[0]), month: parseInt(event_end.split('-')[1]), day: parseInt(event_end.split('-')[2]) } : undefined,
                }
            };
        }

        const postRes = await fetch(`https://mybusiness.googleapis.com/v4/${location_name}/localPosts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postBody),
        });

        const result = await postRes.json();

        if (result.error) {
            return Response.json({ error: result.error.message }, { status: 400 });
        }

        return Response.json({ success: true, post: result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});