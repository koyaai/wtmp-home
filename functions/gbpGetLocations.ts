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

        const settings = await base44.asServiceRole.entities.GBPSettings.filter({});
        if (!settings.length || !settings[0].connected) {
            return Response.json({ error: 'GBP not connected' }, { status: 400 });
        }

        let s = settings[0];
        let accessToken = s.access_token;

        // Refresh token if expired
        if (new Date(s.token_expiry) <= new Date()) {
            accessToken = await refreshAccessToken(base44, s);
        }

        // Get all accounts
        const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const accountsData = await accountsRes.json();

        if (!accountsData.accounts?.length) {
            return Response.json({ locations: [] });
        }

        // Get all locations across all accounts
        const allLocations = [];
        for (const account of accountsData.accounts) {
            const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,websiteUri,primaryPhone,regularHours,primaryCategory`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const locData = await locRes.json();
            if (locData.locations) {
                allLocations.push(...locData.locations.map(l => ({ ...l, accountName: account.name })));
            }
        }

        return Response.json({ locations: allLocations });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});