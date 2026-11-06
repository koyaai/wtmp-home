import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Exports every entity's records to Google Drive as JSON, one file per entity,
// in "WTMP Home Data Backups/<UTC timestamp>/". Admin only (also run by the
// weekly "Weekly Data Backup to Google Drive" workflow).
//
// Optional body: { "entities": ["Client", "MeetingNote"] } to back up a subset.

const ENTITIES = [
  'Appointment', 'BrandProfile', 'CSMUpdate', 'Calendar', 'Call', 'Client',
  'ClientContact', 'ClientInsight', 'ClientScore', 'ContentItem', 'ContentPlan',
  'DashboardRecommendation', 'GAData', 'GBPCalendar', 'GBPProfile', 'GBPSettings',
  'GHLAlert', 'GHLMonitorSettings', 'LeadData', 'MeetingNote', 'MonthlyReport',
  'NotificationLog', 'Onboarding', 'PPCData', 'PostMortem', 'ReportSchedule',
  'SEOData', 'Subaccount', 'SyncSettings', 'UptimeCheck', 'Website',
  'WebsiteProject', 'WillMeeting', 'User',
];

const ROOT_FOLDER_NAME = 'WTMP Home Data Backups';
const PAGE = 5000;
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size';

// Page through an entity in created_date order using a date cursor, so large
// entities aren't limited by skip/offset caps. Ties on the boundary are deduped by id.
async function fetchAll(entity) {
  const out = [];
  const seenAtCursor = new Set();
  let cursor = null;
  for (;;) {
    const query = cursor ? { created_date: { $gte: cursor } } : {};
    const page = await entity.filter(query, 'created_date', PAGE);
    let added = 0;
    for (const rec of page) {
      if (cursor && rec.created_date === cursor && seenAtCursor.has(rec.id)) continue;
      out.push(rec);
      added++;
    }
    if (page.length < PAGE || added === 0) break;
    const last = page[page.length - 1].created_date;
    if (last !== cursor) seenAtCursor.clear();
    cursor = last;
    for (const rec of page) if (rec.created_date === cursor) seenAtCursor.add(rec.id);
  }
  return out;
}

async function drive(token, path, init = {}) {
  const res = await fetch(`${DRIVE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Drive ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function findOrCreateFolder(token, name, parentId) {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false',
    parentId ? `'${parentId}' in parents` : null,
  ].filter(Boolean).join(' and ');
  const found = await drive(token, `/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (found.files?.length) return found.files[0].id;
  return createFolder(token, name, parentId);
}

async function createFolder(token, name, parentId) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) };
  const created = await drive(token, '/files?fields=id', { method: 'POST', body: JSON.stringify(body) });
  return created.id;
}

// Resumable upload works for any size (multipart is capped at 5 MB).
async function uploadJson(token, folderId, name, data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data, null, 1));
  const init = await fetch(UPLOAD, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/json',
      'X-Upload-Content-Length': String(bytes.length),
    },
    body: JSON.stringify({ name, parents: [folderId], mimeType: 'application/json' }),
  });
  if (!init.ok) throw new Error(`Upload init for ${name} failed: ${init.status} ${await init.text()}`);
  const sessionUrl = init.headers.get('Location');
  const put = await fetch(sessionUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: bytes });
  if (!put.ok) throw new Error(`Upload of ${name} failed: ${put.status} ${await put.text()}`);
  return { bytes: bytes.length, ...(await put.json()) };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch { /* no body */ }
    const names = Array.isArray(body?.entities) && body.entities.length
      ? ENTITIES.filter((n) => body.entities.includes(n))
      : ENTITIES;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const startedAt = new Date().toISOString();
    const rootId = await findOrCreateFolder(accessToken, ROOT_FOLDER_NAME, null);
    const runFolderId = await createFolder(accessToken, startedAt.replace(/:/g, '-').slice(0, 19) + 'Z', rootId);

    const results = [];
    for (const name of names) {
      try {
        const entity = base44.asServiceRole.entities[name];
        const records = await fetchAll(entity);
        const up = await uploadJson(accessToken, runFolderId, `${name}.json`, records);
        results.push({ entity: name, records: records.length, bytes: up.bytes });
      } catch (err) {
        results.push({ entity: name, error: String(err?.message || err) });
      }
    }

    const manifest = {
      app: 'WTMP Home',
      app_id: '69a8542871f0800172d1b793',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      run_by: user.email,
      results,
    };
    await uploadJson(accessToken, runFolderId, '_manifest.json', manifest);

    const failed = results.filter((r) => r.error);
    return Response.json({
      ok: failed.length === 0,
      folder_url: `https://drive.google.com/drive/folders/${runFolderId}`,
      total_records: results.reduce((s, r) => s + (r.records || 0), 0),
      failed,
      results,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
