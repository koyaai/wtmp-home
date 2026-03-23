import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const appId = Deno.env.get('BASE44_APP_ID');

    const htmlResponse = (body) => new Response(
        `<html><body style="font-family:sans-serif;padding:20px">${body}</body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
    );

    const successHtml = `
        <p style="color:green;font-size:16px">✓ Connected successfully! This window will close...</p>
        <script>
            if(window.opener) window.opener.postMessage({type:'GBP_AUTH_SUCCESS'}, '*');
            setTimeout(() => window.close(), 1500);
        </script>`;

    const errorHtml = (msg) => `
        <p style="color:red;font-size:16px">Error: ${msg}</p>
        <script>
            if(window.opener) window.opener.postMessage({type:'GBP_AUTH_ERROR', error: ${JSON.stringify(msg)}}, '*');
            setTimeout(() => window.close(), 3000);
        </script>`;

    try {
        if (error || !code) {
            return htmlResponse(errorHtml(error || 'No authorization code received'));
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = `https://${appId}.base44.app/api/apps/${appId}/functions/gbpAuthCallback`;

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenRes.json();

        if (tokens.error) {
            return htmlResponse(errorHtml(`${tokens.error}: ${tokens.error_description}`));
        }

        const settingsData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            connected: true,
            connected_at: new Date().toISOString(),
        };

        // Use SDK service role to save tokens
        const base44 = createClientFromRequest(req);
        const existing = await base44.asServiceRole.entities.GBPSettings.list();

        if (existing && existing.length > 0) {
            await base44.asServiceRole.entities.GBPSettings.update(existing[0].id, settingsData);
        } else {
            await base44.asServiceRole.entities.GBPSettings.create(settingsData);
        }

        return htmlResponse(successHtml);

    } catch (err) {
        return htmlResponse(errorHtml(err.message || 'Unknown error'));
    }
});