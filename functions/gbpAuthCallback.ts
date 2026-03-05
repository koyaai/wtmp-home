import { createClient } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error || !code) {
            return new Response(`<html><body><script>window.opener.postMessage({type:'GBP_AUTH_ERROR', error: '${error || 'No code received'}'}, '*'); window.close();</script></body></html>`, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const appId = Deno.env.get('BASE44_APP_ID');
        const redirectUri = `https://${appId}.base44.app/api/functions/gbpAuthCallback`;

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
            return new Response(`<html><body><script>window.opener.postMessage({type:'GBP_AUTH_ERROR', error: '${tokens.error}'}, '*'); window.close();</script></body></html>`, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // Use service role client (no user auth needed for callback)
        const base44 = createClient({ appId });

        const settingsData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            connected: true,
            connected_at: new Date().toISOString(),
        };

        const existingSettings = await base44.asServiceRole.entities.GBPSettings.filter({});
        if (existingSettings.length > 0) {
            await base44.asServiceRole.entities.GBPSettings.update(existingSettings[0].id, settingsData);
        } else {
            await base44.asServiceRole.entities.GBPSettings.create(settingsData);
        }

        return new Response(`<html><body><script>window.opener.postMessage({type:'GBP_AUTH_SUCCESS'}, '*'); window.close();</script></body></html>`, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (error) {
        return new Response(`<html><body><script>window.opener.postMessage({type:'GBP_AUTH_ERROR', error: '${error.message}'}, '*'); window.close();</script></body></html>`, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
});