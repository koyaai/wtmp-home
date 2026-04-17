import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id, title, content: rawContent, status, scheduled_date, excerpt, post_type } = await req.json();

        // Convert basic markdown to HTML for WordPress
        const content = rawContent
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^\| .+ \|$/gm, (tableBlock) => tableBlock) // preserve tables as-is for now
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[a-z])/gm, '')
            .trim();

        const wrappedContent = content.startsWith('<') ? content : `<p>${content}</p>`;

        if (!client_id || !title || !content) {
            return Response.json({ error: 'client_id, title, and content are required' }, { status: 400 });
        }

        // Fetch client to get WP credentials
        const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
        const client = clients?.[0];

        if (!client) {
            return Response.json({ error: 'Client not found' }, { status: 404 });
        }

        const { wordpress_url, wordpress_username, wordpress_app_password } = client;

        if (!wordpress_url || !wordpress_username || !wordpress_app_password) {
            return Response.json({
                error: 'This client does not have WordPress credentials configured. Please add the WordPress URL, username, and application password in the client settings.'
            }, { status: 422 });
        }

        // Normalize the WP URL
        const baseUrl = wordpress_url.replace(/\/$/, '');
        const endpoint = post_type === 'page' ? 'pages' : 'posts';
        const apiUrl = `${baseUrl}/wp-json/wp/v2/${endpoint}`;

        // Build the Basic Auth header using WP Application Passwords
        const credentials = btoa(`${wordpress_username}:${wordpress_app_password}`);

        // Build the post payload
        const postStatus = status === 'schedule' ? 'future' : (status || 'draft');
        const postPayload = {
            title,
            content: wrappedContent,
            status: postStatus,
            ...(excerpt ? { excerpt } : {}),
            ...(postStatus === 'future' && scheduled_date ? { date: scheduled_date } : {}),
        };

        const wpResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify(postPayload),
        });

        const wpData = await wpResponse.json();

        if (!wpResponse.ok) {
            return Response.json({
                error: wpData?.message || `WordPress API error: ${wpResponse.status}`,
                code: wpData?.code,
            }, { status: wpResponse.status });
        }

        const editPath = post_type === 'page' ? 'post.php?post=' : 'post.php?post=';
        return Response.json({
            success: true,
            post_id: wpData.id,
            post_url: wpData.link,
            post_status: wpData.status,
            post_type: post_type || 'post',
            edit_url: `${baseUrl}/wp-admin/post.php?post=${wpData.id}&action=edit`,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});