import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const appId = Deno.env.get('BASE44_APP_ID');

        // Redirect URI - the callback function URL
        const redirectUri = `https://${appId}.base44.app/api/apps/${appId}/functions/gbpAuthCallback`;

        const scopes = [
            'https://www.googleapis.com/auth/business.manage',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            access_type: 'offline',
            prompt: 'consent',
            state: appId,
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        return Response.json({ auth_url: authUrl });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});