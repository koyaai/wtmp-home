Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const appId = Deno.env.get('BASE44_APP_ID');

        const closeWithError = (msg) => new Response(`<html><body>
            <p style="font-family:sans-serif;color:red">Error: ${msg}</p>
            <script>
                if(window.opener) window.opener.postMessage({type:'GBP_AUTH_ERROR', error: '${msg}'}, '*');
                setTimeout(() => window.close(), 3000);
            </script>
        </body></html>`, { headers: { 'Content-Type': 'text/html' } });

        if (error || !code) {
            return closeWithError(error || 'No code received');
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
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
            return closeWithError(tokens.error + ': ' + tokens.error_description);
        }

        const settingsData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            connected: true,
            connected_at: new Date().toISOString(),
        };

        // Use Base44 REST API directly with service role
        const apiBase = `https://api.base44.com/api/apps/${appId}/entities/GBPSettings`;
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': 'service-role',
            'x-app-id': appId,
        };

        // Check existing
        const listRes = await fetch(apiBase, { headers });
        const listData = await listRes.json();
        const existing = Array.isArray(listData) ? listData : (listData.data || []);

        if (existing.length > 0) {
            await fetch(`${apiBase}/${existing[0].id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(settingsData),
            });
        } else {
            await fetch(apiBase, {
                method: 'POST',
                headers,
                body: JSON.stringify(settingsData),
            });
        }

        return new Response(`<html><body>
            <p style="font-family:sans-serif;color:green">✓ Connected successfully! This window will close...</p>
            <script>
                if(window.opener) window.opener.postMessage({type:'GBP_AUTH_SUCCESS'}, '*');
                setTimeout(() => window.close(), 1500);
            </script>
        </body></html>`, { headers: { 'Content-Type': 'text/html' } });

    } catch (err) {
        const msg = (err.message || 'Unknown error').replace(/'/g, "\\'");
        return new Response(`<html><body>
            <p style="font-family:sans-serif;color:red">Error: ${msg}</p>
            <script>
                if(window.opener) window.opener.postMessage({type:'GBP_AUTH_ERROR', error: '${msg}'}, '*');
                setTimeout(() => window.close(), 3000);
            </script>
        </body></html>`, { headers: { 'Content-Type': 'text/html' } });
    }
});