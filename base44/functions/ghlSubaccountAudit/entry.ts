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
 * Metrics are best-effort against available GHL endpoints; any metric that
 * cannot be retrieved is stored as null / "unavailable" and is NOT alerted on.
 */

const BASE = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

const GLOBAL_DEFAULTS = {
  missed_calls: 10,
  unread_conversations: 10,
  cancelled_resched_pct: 30, // percent of total appointments
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

function safeParse(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

// ---------- Per-metric fetchers (each best-effort, returns null on failure) ----------

async function fetchFormSubmissions(apiKey, locationId, start, end) {
  const formsRes = await ghlGet(apiKey, `/forms?locationId=${locationId}`);
  if (!formsRes.ok) return null;
  const formsData = await formsRes.json();
  const forms = formsData.forms || [];
  let total = 0;
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);
  for (const f of forms.slice(0, 25)) {
    const id = f.id || f._id || f.formId;
    if (!id) continue;
    try {
      const sRes = await ghlGet(
        apiKey,
        `/forms/${id}/submissions?limit=100&startAt=${startTs}&endAt=${endTs}`,
      );
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      total += (sData.submissions || sData || []).length;
    } catch {}
  }
  return total;
}

async function fetchCalendarEvents(apiKey, locationId, start, end) {
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);
  const res = await ghlGet(
    apiKey,
    `/calendars/events/appointments?locationId=${locationId}&startTime=${startTs}&endTime=${endTs}`,
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
  const res = await ghlGet(
    apiKey,
    `/conversations/search?locationId=${locationId}&status=unread&limit=100`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.total != null ? data.total : (data.conversations || []).length;
}

async function fetchWorkflowErrors(apiKey, locationId) {
  const res = await ghlGet(apiKey, `/workflows?locationId=${locationId}`);
  if (!res.ok) return null;
  const data = await res.json();
  const wfs = data.workflows || data || [];
  let errCount = 0;
  const names = [];
  for (const w of wfs) {
    const hasErr =
      (w.errors && w.errors.length > 0) ||
      w.errorCount > 0 ||
      w.status === 'error' ||
      w.health === 'error';
    if (hasErr) {
      errCount++;
      names.push(w.name || w.id);
    }
  }
  return { count: errCount, names };
}

async function fetchMissedCalls(apiKey, locationId, start, end) {
  let all = [];
  let page = 0;
  let hasMore = true;
  while (hasMore && page < 5) {
    const body = {
      locationId,
      filters: [{ id: 'tags', operator: 'exists', value: 'missed-call' }],
      limit: 100,
      skip: page * 100,
    };
    const res = await ghlPost(apiKey, '/contacts/search', body);
    if (!res.ok) return null;
    const data = await res.json();
    const contacts = data.contacts || [];
    all = all.concat(contacts);
    hasMore = contacts.length === 100;
    page++;
  }
  const tagged = all.filter((c) =>
    (c.tags || []).some((t) => (typeof t === 'string' ? t : t?.name || '') === 'missed-call'),
  );
  const inWin = tagged.filter((c) => {
    const d = new Date(c.dateAdded || c.dateCreated || c.createdAt || 0);
    return d >= start && d < end;
  });
  return inWin.length;
}

async function fetchDeliverability(apiKey, locationId, start, end, type) {
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);
  const path =
    type === 'email'
      ? `/emails?locationId=${locationId}&startTime=${startTs}&endTime=${endTs}&limit=100`
      : `/sms/messages?locationId=${locationId}&startTime=${startTs}&endTime=${endTs}&limit=100`;
  const res = await ghlGet(apiKey, path);
  if (!res.ok) return null;
  const data = await res.json();
  const recs = data.emails || data.messages || data.sms || data || [];
  if (!Array.isArray(recs) || recs.length === 0) return null;
  const failed = recs.filter((r) =>
    /fail|bounce|error|undeliver/i.test(String(r.status || r.deliveryStatus || '')),
  ).length;
  const rate = failed / recs.length;
  if (rate > 0.2) return 'failed';
  if (rate > 0.05) return 'warning';
  return 'good';
}

async function fetchIntegrationHealth(apiKey, locationId) {
  const probes = [
    { name: 'Calendar', path: `/calendars?locationId=${locationId}` },
    { name: 'Payment Providers', path: `/payments/providers?locationId=${locationId}` },
    { name: 'Phone Numbers', path: `/locations/${locationId}/numbers` },
    { name: 'Custom Fields', path: `/custom-fields?locationId=${locationId}` },
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
      issues.push({ integration: p.name, status: 'auth_failure', error: `HTTP ${res.status}` });
    } else if (res.status >= 500) {
      issues.push({ integration: p.name, status: 'error', error: `HTTP ${res.status}` });
    } else if (res.ok) {
      anyOk = true;
    }
    // 404 / 4xx other than auth = integration not present, not an error
  }
  const status = issues.length > 0 ? 'issue' : anyOk ? 'healthy' : 'unavailable';
  return { status, issues };
}

// ---------- Assemble report for one client ----------

async function auditClient(client, monthStart, monthEnd) {
  const apiKey = client.ghl_api_key;
  const locationId = client.ghl_location_id;
  const report = {
    form_submissions: null,
    cal_new: 0,
    cal_confirmed: 0,
    cal_cancelled: 0,
    cal_rescheduled: 0,
    unread_conversations: null,
    workflows_with_errors: null,
    workflow_error_names: null,
    calls_missed: null,
    email_deliverability: 'unavailable',
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
    report.unread_conversations = await fetchUnreadConversations(apiKey, locationId);
  } catch {}
  try {
    const wf = await fetchWorkflowErrors(apiKey, locationId);
    if (wf) {
      report.workflows_with_errors = wf.count;
      if (wf.count > 0) report.workflow_error_names = JSON.stringify(wf.names);
    }
  } catch {}
  try {
    report.calls_missed = await fetchMissedCalls(apiKey, locationId, monthStart, monthEnd);
  } catch {}
  try {
    const ed = await fetchDeliverability(apiKey, locationId, monthStart, monthEnd, 'email');
    if (ed) report.email_deliverability = ed;
  } catch {}
  try {
    const sd = await fetchDeliverability(apiKey, locationId, monthStart, monthEnd, 'sms');
    if (sd) report.sms_deliverability = sd;
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

  // Missed calls
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

  // Unread conversations
  if (report.unread_conversations != null) {
    const u = report.unread_conversations;
    if (u >= thresholds.unread_conversations) {
      const sev = u >= thresholds.unread_conversations * 2 ? 'critical' : 'warning';
      const prev = prior?.unread_conversations ?? null;
      const delta = prev != null ? ` (prior month: ${prev})` : '';
      push('unread_conversations', sev, `Unread conversations at ${u}, threshold ${thresholds.unread_conversations}${delta}.`);
    }
  }

  // Workflow errors
  if (report.workflows_with_errors != null && report.workflows_with_errors > 0) {
    const names = safeParse(report.workflow_error_names);
    push(
      'workflow_errors',
      'critical',
      `${report.workflows_with_errors} workflow(s) with errors${names.length ? ': ' + names.join(', ') : ''}.`,
    );
  }

  // Email / SMS deliverability
  if (report.email_deliverability === 'warning' || report.email_deliverability === 'failed') {
    push(
      'email_deliverability',
      report.email_deliverability === 'failed' ? 'critical' : 'warning',
      `Email deliverability status is ${report.email_deliverability}.`,
    );
  }
  if (report.sms_deliverability === 'warning' || report.sms_deliverability === 'failed') {
    push(
      'sms_deliverability',
      report.sms_deliverability === 'failed' ? 'critical' : 'warning',
      `SMS deliverability status is ${report.sms_deliverability}.`,
    );
  }

  // Cancelled + rescheduled share spike
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
      const delta =
        prevPct != null
          ? ` vs ${prevPct.toFixed(0)}% prior month (+${(pct - prevPct).toFixed(0)}pp)`
          : '';
      push(
        'cancelled_rescheduled',
        'warning',
        `Cancelled/rescheduled appointments ${cr} of ${totalAppts} (${pct.toFixed(0)}%), threshold ${thresholds.cancelled_resched_pct}%${delta}.`,
      );
    }
  }

  // Integration issues
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

    // Default to prior month
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

        // Upsert GHLMonthlyReport by client + month_key
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

        // Thresholds (per-client overrides fall back to global defaults)
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

        // Replace only unresolved alerts for this client + month (preserve resolved ones)
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