import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { channel, text, channel_id, client_id } = body || {};

    if (!text || !text.trim()) {
      return Response.json({ error: 'Message text is required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    // Resolve the target channel: explicit channel_id > explicit channel name > client's saved slack_channel.
    let targetChannel = channel_id;
    let resolvedChannelName = null;

    if (!targetChannel && client_id) {
      const client = await base44.asServiceRole.entities.Client.get(client_id);
      if (client?.slack_channel) {
        // If the saved value is already a Slack channel ID (starts with C/G/D), use it directly.
        if (/^[CGD][A-Z0-9]{8,}$/.test(client.slack_channel)) {
          targetChannel = client.slack_channel;
        } else {
          resolvedChannelName = client.slack_channel;
        }
      } else {
        return Response.json({ error: 'This client has no Slack channel configured. Set it in the client record first.' }, { status: 400 });
      }
    } else if (!targetChannel && channel) {
      if (/^[CGD][A-Z0-9]{8,}$/.test(channel)) {
        targetChannel = channel;
      } else {
        resolvedChannelName = channel;
      }
    }

    if (!targetChannel && !resolvedChannelName) {
      return Response.json({ error: 'Channel is required (channel name, channel_id, or client_id)' }, { status: 400 });
    }

    // If a channel name was passed (e.g. "general" or "#general"), resolve it to an ID.
    if (!targetChannel) {
      const cleanName = resolvedChannelName.replace(/^#/, '').trim();
      const listRes = await fetch('https://slack.com/api/conversations.list?limit=1000', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const listData = await listRes.json();
      if (!listData.ok) {
        return Response.json({ error: `Failed to list channels: ${listData.error}` }, { status: 502 });
      }
      const found = listData.channels.find(
        (c) => c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (!found) {
        return Response.json({ error: `Channel "#${cleanName}" not found. For private channels, invite the bot first.` }, { status: 404 });
      }
      targetChannel = found.id;
    }

    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: targetChannel,
        text: text.trim(),
        username: 'WTMP Home',
        icon_emoji: ':rocket:',
      }),
    });
    const postData = await postRes.json();

    if (!postData.ok) {
      return Response.json({ error: `Slack error: ${postData.error}` }, { status: 502 });
    }

    return Response.json({ ok: true, channel: targetChannel, ts: postData.ts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}