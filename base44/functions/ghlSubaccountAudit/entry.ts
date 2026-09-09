import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GHL Subaccount Monthly Audit
 *
 * For each active client with ghl_location_id + ghl_api_key, pulls a monthly
 * snapshot of GHL metrics using that subaccount's OWN API key, upserts a
 * GHLMonthlyReport keyed by client + month, compares to the prior month's
 * snapshot against global/per-client thresholds, and creates contextual
 * GHLAlert records for any breach.
 *
 * Endpoints verified against the live GHL API (services.leadconnectorhq.com):
 *  - Forms submissions: GET /forms/submissions?locationId&startAt=YYYY-MM-DD&endAt=YYYY-MM-DD  (meta.total)
 *  - Missed calls:       POST /contacts/search { locationId, pageLimit, page, filters:[{field:'tags',operator:'eq',value:tag}] }
 *  - Unread convos:      GET /conversations/search?locationId&limit=100&page=N  (sum unreadCount, pagination capped)
 *  - Calendar appts:     GET /calendars/appointments?locationId&startTime=<unix>&endTime=<unix>  (requires calendars.readonly scope)
 *  - Workflows list:     GET /workflows/?locationId  (no execution-error field exposed by GHL → unavailable)
 *  - Integration probes: forms / workflows / calendars / conversations  (calendars 401 = missing scope)
 *
 * Any metric that cannot be retrieved is stored as null / "unavailable" and is NOT alerted on.
 */

const BASE = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

const GLOBAL_DEFAULTS = {
  missed_calls: 10,
  unread_conversations: 10,
  cancelled_resched_pct: 30, // percent of total appointments
  missed_call_tag: 'missed-call',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Version: VERSION,
    Accept: 'application/json',
  };
}

async function ghlGet(apiKey, path) {
  return fetch(`${BASE}${path}`, { headers: authHeaders(apiKey) });
}

async function ghlPost(apiKey, path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function safeParse(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

// ---------- Per-metric fetchers (each best-effort, returns null on failure) ----------

async function fetchFormSubmissions(apiKey, locationId, start, end) {
  const res = await ghlGet(
    apiKey,
    `/forms/submissions?locationId=${locationId}&page=1&limit=100&startAt=${ymd(start)}&endAt=${ymd(end)}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.meta?.total != null ? data.meta.total : (data.submissions || []).length;
}

async function fetchCalendarEvents(apiKey, locationId, start, end) {
  // Requires calendars.readonly scope on the location API key (401 otherwise).
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);
  const res = await ghlGet(
    apiKey,
    `/calendars/appointments?locationId=${locationId}&startTime=${startTs}&endTime=${endTs}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  const appts = data.appointments || data.events || [];
  const buckets = { new: 0, confirmed: 0, cancelled: 0, rescheduled: 0 };
  for (const a of appts) {
    const st = String(a.appointmentStatus || a.status || '').toLowerCase();
    if (st === 'new') buckets.new++;
    else if (st === 'confirmed') buckets.confirmed++;
    else if (st === 'cancelled' || st === 'canceled') buckets.cancelled++;
    else if (st === 'rescheduled' || st === 'moved') buckets.rescheduled++;
  }
  return buckets;
}

async function fetchUnreadConversations(apiKey, locationId) {
  let unread = 0;
  let total = null;
  const seen = new Set();
  let firstId = null;
  for (let page = 1; page <= 5; page++) {
    const res = await ghlGet(apiKey, `/conversations/search?locationId=${locationId}&limit=100&page=${page}`);
    if (!res.ok) return null;
    const data = await res.json();
    const convs = data.conversations || [];
    if (convs.length === 0) break;
    if (firstId === null) firstId = convs[0].id;
    else if (convs[0].id === firstId) break; // pagination param ignored — stop to avoid double counting
    if (data.meta?.total != null) total = data.meta.total;
    let added = 0;
    for (const c of convs) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      added++;
      if ((c.unreadCount || 0) > 0) unread++;
    }
    if (added === 0) break;
    if (convs.length < 100) break;
  }
  return { unread, capped: total != null && total > seen.size };
}

async function fetchMissedCalls(apiKey, locationId, start, end, tag) {
  let count = 0;
  let hasMore = false;
  for (let page = 0; page < 10; page++) {
    const body = {
      locationId,
      pageLimit: 100,
      page,
      filters: [{ field: 'tags', operator: 'eq', value: tag }],
    };
    const res = await ghlPost(apiKey, '/contacts/search', body);
    if (!res.ok) return null;
    const data = await res.json();
    const contacts = data.contacts || [];
    for (const c of contacts) {
      const d = new Date(c.dateAdded || c.createdAt || c.dateCreated || 0);
      if (d >= start && d < end) count++;
    }
    if (contacts.length < 100) { hasMore = false; break; }
    hasMore = true;
  }
  return { count, capped: hasMore };
}

async function fetchIntegrationHealth(apiKey, locationId) {
  const probes = [
    { name: 'Forms', path: `/forms/?locationId=${locationId}` },
    { name: 'Workflows', path: `/workflows/?locationId=${locationId}` },
    { name: 'Calendars', path: `/calendars/?locationId=${locationId}` },
    { name: 'Conversations', path: `/conversations/search?locationId=${locationId}&limit=1` },
  ];
  const issues = [];
  let anyOk = false;
  for (const p of probes) {
    let res;
    try {
      res = await ghlGet(apiKey, p.path);
    } catch (e) {
      issues.push({ integration: p.name, status: 'error', error: e.message });
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      issues.push({ integration: p.name, status: 'auth_failure', error: `HTTP ${res.status} (missing scope)` });
    } else if (res.status >= 500) {
      issues.push({ integration: p.name, status: 'error', error: `HTTP ${res.status}` });
    } else if (res.ok) {
      anyOk = true;
    }
  }
  const status = issues.length > 0 ? 'issue' : anyOk ? 'healthy' : 'unavailable';
  return { status, issues };
}

// ---------- Assemble report for one client ----------

async function auditClient(client, monthStart, monthEnd) {
  const apiKey = client.ghl_api_key;
  const locationId = client.ghl_location_id;
  const missedCallTag = client.ghl_missed_call_tag || GLOBAL_DEFAULTS.missed_call_tag;

  const report = {
    form_submissions: null,
    cal_new: 0,
    cal_confirmed: 0,
    cal_cancelled: 0,
    cal_rescheduled: 0,
    unread_conversations: null,
    workflows_with_errors: null, // GHL API does not expose workflow execution errors
    workflow_error_names: null,
    calls_missed: null,
    email_deliverability: 'unavailable', // no GHL endpoint for deliverability status
    sms_deliverability: 'unavailable',
    integration_status: 'unavailable',
    integration_issues: null,
  };

  try {
    report.form_submissions = await fetchFormSubmissions(apiKey, locationId, monthStart, monthEnd);
  } catch {}
  try {
    const cal = await fetchCalendarEvents(apiKey, locationId, monthStart, monthEnd);
    if (cal) {
      report.cal_new = cal.new;
      report.cal_confirmed = cal.confirmed;
      report.cal_cancelled = cal.cancelled;
      report.cal_rescheduled = cal.rescheduled;
    }
  } catch {}
  try {
    const uc = await fetchUnreadConversations(apiKey, locationId);
    if (uc) report.unread_conversations = uc.unread;
  } catch {}
  try {
    const mc = await fetchMissedCalls(apiKey, locationId, monthStart, monthEnd, missedCallTag);
    if (mc) report.calls_missed = mc.count;
  } catch {}
  try {
    const ih = await fetchIntegrationHealth(apiKey, locationId);
    report.integration_status = ih.status;
    if (ih.issues && ih.issues.length > 0) report.integration_issues = JSON.stringify(ih.issues);
  } catch {}

  return report;
}

// ---------- Alert generation ----------

function buildAlerts(client, report, prior, thresholds, monthKey, monthName, year) {
  const alerts = [];
  const push = (issue_type, severity, description) =>
    alerts.push({
      client_id: client.id,
      client_name: client.name,
      month_key: monthKey,
      month: monthName,
      year,
      issue_type,
      severity,
      description,
      resolved: false,
    });

  if (report.calls_missed != null) {
    const mc = report.calls_missed;
    const prev = prior?.calls_missed ?? null;
    if (mc >= thresholds.missed_calls) {
      const sev = mc >= thresholds.missed_calls * 2 ? 'critical' : 'warning';
      const delta =
        prev != null
          ? ` (prior month: ${prev}, ${mc > prev ? '+' + (mc - prev) : mc < prev ? String(mc - prev) : 'no change'})`
          : '';
      push('missed_calls', sev, `Missed-call contacts at ${mc} this month, threshold ${thresholds.missed_calls}${delta}.`);
    } else if (prev != null && mc > prev && mc - prev >= Math.max(5, Math.ceil(prev * 0.5))) {
      push(
        'missed_calls',
        'warning',
        `Missed-call contacts rose to ${mc} from ${prev} prior month (+${mc - prev}), approaching threshold ${thresholds.missed_calls}.`,
      );
    }
  }

  if (report.unread_conversations != null) {
    const u = report.unread_conversations;
    if (u >= thresholds.unread_conversations) {
      const sev = u >= thresholds.unread_conversations * 2 ? 'critical' : 'warning';
      const prev = prior?.unread_conversations ?? null;
      const delta = prev != null ? ` (prior month: ${prev})` : '';
      push('unread_conversations', sev, `Unread conversations at ${u}, threshold ${thresholds.unread_conversations}${delta}.`);
    }
  }

  if (report.workflows_with_errors != null && report.workflows_with_errors > 0) {
    const names = safeParse(report.workflow_error_names);
    push(
      'workflow_errors',
      'critical',
      `${report.workflows_with_errors} workflow(s) with errors${names.length ? ': ' + names.join(', ') : ''}.`,
    );
  }

  if (report.email_deliverability === 'warning' || report.email_deliverability === 'failed') {
    push('email_deliverability', report.email_deliverability === 'failed' ? 'critical' : 'warning', `Email deliverability status is ${report.email_deliverability}.`);
  }
  if (report.sms_deliverability === 'warning' || report.sms_deliverability === 'failed') {
    push('sms_deliverability', report.sms_deliverability === 'failed' ? 'critical' : 'warning', `SMS deliverability status is ${report.sms_deliverability}.`);
  }

  const totalAppts =
    (report.cal_new || 0) + (report.cal_confirmed || 0) + (report.cal_cancelled || 0) + (report.cal_rescheduled || 0);
  if (totalAppts > 0) {
    const cr = (report.cal_cancelled || 0) + (report.cal_rescheduled || 0);
    const pct = (cr / totalAppts) * 100;
    const prevTotal = prior
      ? (prior.cal_new || 0) + (prior.cal_confirmed || 0) + (prior.cal_cancelled || 0) + (prior.cal_rescheduled || 0)
      : 0;
    const prevCr = prior ? (prior.cal_cancelled || 0) + (prior.cal_rescheduled || 0) : 0;
    const prevPct = prevTotal > 0 ? (prevCr / prevTotal) * 100 : null;
    if (pct >= thresholds.cancelled_resched_pct && (prevPct == null || pct > prevPct + 10)) {
      const delta = prevPct != null ? ` vs ${prevPct.toFixed(0)}% prior month (+${(pct - prevPct).toFixed(0)}pp)` : '';
      push(
        'cancelled_rescheduled',
        'warning',
        `Cancelled/rescheduled appointments ${cr} of ${totalAppts} (${pct.toFixed(0)}%), threshold ${thresholds.cancelled_resched_pct}%${delta}.`,
      );
    }
  }

  if (report.integration_status === 'issue') {
    const issues = safeParse(report.integration_issues);
    for (const it of issues) {
      push(
        'integration',
        it.status === 'auth_failure' ? 'critical' : 'warning',
        `Integration "${it.integration}" ${it.status}: ${it.error}.`,
      );
    }
  }

  return alerts;
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const db = base44.asServiceRole;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const clientIdFilter = body.client_id || null;

    const now = new Date();
    const defaultPrior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetYear = body.year != null ? Number(body.year) : defaultPrior.getFullYear();
    const targetMonth = body.month != null ? Number(body.month) : defaultPrior.getMonth();

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 1);
    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const monthName = MONTH_NAMES[targetMonth];

    const prevDate = new Date(targetYear, targetMonth - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const allClients = await db.entities.Client.list();
    const ghlClients = allClients.filter(
      (c) =>
        c.ghl_location_id &&
        c.ghl_api_key &&
        c.ghl_audit_active !== false &&
        (!clientIdFilter || c.id === clientIdFilter),
    );

    if (ghlClients.length === 0) {
      return Response.json({ message: 'No GHL-enabled clients found for audit.', month_key: monthKey });
    }

    const results = [];
    for (const client of ghlClients) {
      try {
        const report = await auditClient(client, monthStart, monthEnd);

        const existing = await db.entities.GHLMonthlyReport.filter({ client_id: client.id });
        const match = existing.find((r) => r.month_key === monthKey);
        const prior = existing.find((r) => r.month_key === prevKey);
        const payload = {
          ...report,
          client_id: client.id,
          client_name: client.name,
          month: monthName,
          year: targetYear,
          month_key: monthKey,
          pulled_at: new Date().toISOString(),
        };
        let recordId;
        if (match) {
          await db.entities.GHLMonthlyReport.update(match.id, payload);
          recordId = match.id;
        } else {
          const created = await db.entities.GHLMonthlyReport.create(payload);
          recordId = created.id;
        }

        const thresholds = {
          missed_calls:
            client.ghl_threshold_missed_calls != null ? client.ghl_threshold_missed_calls : GLOBAL_DEFAULTS.missed_calls,
          unread_conversations:
            client.ghl_threshold_unread_conversations != null
              ? client.ghl_threshold_unread_conversations
              : GLOBAL_DEFAULTS.unread_conversations,
          cancelled_resched_pct:
            client.ghl_threshold_cancelled_resched_pct != null
              ? client.ghl_threshold_cancelled_resched_pct
              : GLOBAL_DEFAULTS.cancelled_resched_pct,
        };

        const alerts = buildAlerts(client, report, prior, thresholds, monthKey, monthName, targetYear);

        const oldAlerts = await db.entities.GHLAlert.filter({ client_id: client.id });
        const stale = oldAlerts.filter((a) => a.month_key === monthKey && !a.resolved);
        for (const a of stale) await db.entities.GHLAlert.delete(a.id);
        for (const al of alerts) {
          await db.entities.GHLAlert.create({ ...al, created_at: new Date().toISOString() });
        }

        results.push({ client: client.name, month_key: monthKey, record_id: recordId, alerts: alerts.length });
      } catch (err) {
        results.push({ client: client.name, error: err.message });
      }
    }

    return Response.json({ month_key: monthKey, audited: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 200 });
  }
});