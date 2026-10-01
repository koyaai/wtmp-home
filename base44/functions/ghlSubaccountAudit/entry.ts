import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Monthly GHL subaccount monitor. Loops active Client subaccounts, pulls
// metrics from the GHL API using each subaccount's own Private Integration
// API key, upserts a GHLMonthlyReport, and generates GHLAlerts against
// configurable thresholds with month-over-month context.
//
// GHL API base: https://services.leadconnectorhq.com
// Auth: Bearer <subaccount API key>, Version header per endpoint group (v3
// default, date-based fallback). v3 is GHL's current named API version
// (released June 11 2026); some endpoint groups still need date-based versions.

const GHL_BASE = "https://services.leadconnectorhq.com";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ADMIN_ROLES = ["admin", "leadership", "team_lead"];

function pad2(n) { return String(n).padStart(2, "0"); }

function getTargetMonth(monthKey) {
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split("-").map(Number);
    return { year: y, monthIndex: m - 1, monthName: MONTHS[m - 1], monthKey };
  }
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { year: t.getUTCFullYear(), monthIndex: t.getUTCMonth(), monthName: MONTHS[t.getUTCMonth()], monthKey: `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}` };
}

function defaultSettings() {
  return {
    threshold_missed_calls: 10,
    threshold_unread_conversations: 10,
    threshold_cancelled_resched_pct: 30,
    version_calendars: "v3", fallback_calendars: "2021-07-28",
    version_forms: "v3", fallback_forms: "2021-07-28",
    version_conversations: "v3", fallback_conversations: "2021-07-28",
    version_calls: "v3", fallback_calls: "2021-07-28",
    version_integrations: "v3", fallback_integrations: "2021-07-28",
  };
}

// Fetch a GHL endpoint with the configured Version header; fall back to the
// date-based version for that endpoint group on 404/400 (version mismatch).
async function ghlFetch(path, apiKey, group, settings, params) {
  const version = settings[`version_${group}`] || "v3";
  const fallback = settings[`fallback_${group}`] || "2021-07-28";
  const url = new URL(GHL_BASE + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const doFetch = (ver) => fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", Version: ver },
  });
  let res = await doFetch(version);
  if (res.status === 404 || res.status === 400) {
    res = await doFetch(fallback);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data };
}

function isAuthErr(status) { return status === 401 || status === 403; }
function isServerErr(status) { return status >= 500; }

// Pull form submissions for the month (date strings YYYY-MM-DD).
async function pullForms(apiKey, locationId, startStr, endStr, settings, issues) {
  try {
    const r = await ghlFetch("/forms/submissions", apiKey, "forms", settings, {
      locationId, startAt: startStr, endAt: endStr, limit: 100, page: 1,
    });
    if (r.ok && r.data) {
      const total = r.data.meta?.total;
      if (typeof total === "number") return total;
      return Array.isArray(r.data.submissions) ? r.data.submissions.length : null;
    }
    if (isAuthErr(r.status)) issues.push({ integration: "Forms", status: "auth_error", error: `HTTP ${r.status}` });
    else if (isServerErr(r.status)) issues.push({ integration: "Forms", status: "error", error: `HTTP ${r.status}` });
    return null;
  } catch (e) {
    issues.push({ integration: "Forms", status: "error", error: e.message });
    return null;
  }
}

// Pull calendar events across all calendars; count by appointment status.
async function pullCalendar(apiKey, locationId, startMs, endMs, settings, issues) {
  const counts = { new: 0, confirmed: 0, cancelled: 0, rescheduled: 0, total: 0 };
  let calendarOk = false;
  try {
    const calRes = await ghlFetch("/calendars", apiKey, "calendars", settings, { locationId });
    if (!calRes.ok) {
      if (isAuthErr(calRes.status)) issues.push({ integration: "Calendar", status: "auth_error", error: `HTTP ${calRes.status}` });
      else if (isServerErr(calRes.status)) issues.push({ integration: "Calendar", status: "error", error: `HTTP ${calRes.status}` });
      return { counts, calendarOk: false };
    }
    calendarOk = true;
    const calendars = (calRes.data?.calendars || calRes.data || []).slice(0, 25);
    for (const cal of calendars) {
      const calId = cal.id || cal._id;
      if (!calId) continue;
      let page = 1;
      let guard = 0;
      while (guard < 6) {
        guard++;
        const r = await ghlFetch("/calendars/events", apiKey, "calendars", settings, {
          locationId, calendarId: calId, startTime: startMs, endTime: endMs, page, limit: 100,
        });
        if (!r.ok) break;
        const events = r.data?.events || r.data || [];
        for (const ev of events) {
          const st = (ev.appointmentStatus || ev.status || "").toString().toLowerCase();
          counts.total++;
          if (st === "new") counts.new++;
          else if (st === "confirmed" || st === "confirm") counts.confirmed++;
          else if (st === "cancelled" || st === "canceled") counts.cancelled++;
          else if (st === "rescheduled") counts.rescheduled++;
        }
        const total = r.data?.meta?.total ?? r.data?.total;
        const hasMore = typeof total === "number" ? counts.total < total : Array.isArray(events) && events.length >= 100;
        if (!hasMore) break;
        page++;
      }
    }
  } catch (e) {
    issues.push({ integration: "Calendar", status: "error", error: e.message });
  }
  return { counts, calendarOk };
}

// Pull conversations (bounded pagination). Returns unread count + missed-call
// count for the month (native "missed" call status, filtered by date).
async function pullConversations(apiKey, locationId, startMs, endMs, settings, issues) {
  let unread = 0;
  let missed = 0;
  let ok = false;
  try {
    let page = 1;
    let guard = 0;
    while (guard < 30) {
      guard++;
      const r = await ghlFetch("/conversations/search", apiKey, "conversations", settings, {
        locationId, limit: 100, page,
      });
      if (!r.ok) {
        if (isAuthErr(r.status)) issues.push({ integration: "Conversations", status: "auth_error", error: `HTTP ${r.status}` });
        else if (isServerErr(r.status)) issues.push({ integration: "Conversations", status: "error", error: `HTTP ${r.status}` });
        break;
      }
      ok = true;
      const convs = r.data?.conversations || [];
      for (const c of convs) {
        if (c.unreadCount && Number(c.unreadCount) > 0) unread++;
        const t = (c.type || c.lastMessageType || "").toString().toUpperCase();
        const isCall = t.includes("CALL") || t.includes("PHONE");
        if (isCall) {
          const callSt = (c.callStatus || c.status || "").toString().toLowerCase();
          const ts = c.lastMessageDate ? Number(c.lastMessageDate) : null;
          const inMonth = ts != null && ts >= startMs && ts < endMs;
          if (callSt === "missed" && inMonth) missed++;
        }
      }
      const total = r.data?.total ?? r.data?.meta?.total;
      const seen = guard * 100;
      if (typeof total === "number" ? seen >= total : convs.length < 100) break;
      page++;
    }
  } catch (e) {
    issues.push({ integration: "Conversations", status: "error", error: e.message });
  }
  return { unread: ok ? unread : null, missed: ok ? missed : null, ok };
}

// Best-effort integration probes (payments, phone). 404 = not connected, not
// an issue; 401/403/5xx = integration problem.
async function probeIntegration(apiKey, locationId, name, path, settings, issues) {
  try {
    const r = await ghlFetch(path, apiKey, "integrations", settings, { locationId });
    if (r.ok) return { integration: name, status: "healthy", error: null };
    if (r.status === 404) return { integration: name, status: "not_available", error: null };
    if (isAuthErr(r.status)) { issues.push({ integration: name, status: "auth_error", error: `HTTP ${r.status}` }); return { integration: name, status: "auth_error", error: `HTTP ${r.status}` }; }
    if (isServerErr(r.status)) { issues.push({ integration: name, status: "error", error: `HTTP ${r.status}` }); return { integration: name, status: "error", error: `HTTP ${r.status}` }; }
    return { integration: name, status: "not_available", error: null };
  } catch (e) {
    issues.push({ integration: name, status: "error", error: e.message });
    return { integration: name, status: "error", error: e.message };
  }
}

function buildAlerts(report, prior, settings, clientName) {
  const alerts = [];
  const mk = (issue_type, severity, description) => ({ issue_type, severity, description });

  // Missed calls
  if (report.calls_missed != null) {
    const thr = settings.threshold_missed_calls;
    const p = prior?.calls_missed;
    if (report.calls_missed > thr) {
      const sev = report.calls_missed > thr * 2 ? "critical" : "warning";
      const mom = p != null ? ` Prior month: ${p} (${report.calls_missed > p ? "+" : ""}${report.calls_missed - p} MoM).` : " No prior-month data.";
      alerts.push(mk("missed_calls", sev, `${clientName}: missed calls = ${report.calls_missed}, exceeds threshold of ${thr}.${mom}`));
    } else if (p != null && p > 0 && report.calls_missed > p * 1.5) {
      alerts.push(mk("missed_calls", "warning", `${clientName}: missed calls = ${report.calls_missed}, up noticeably from ${p} prior month (+${report.calls_missed - p}, ${Math.round((report.calls_missed / p - 1) * 100)}% MoM). Threshold: ${thr}.`));
    }
  }

  // Unread conversations
  if (report.unread_conversations != null && report.unread_conversations > settings.threshold_unread_conversations) {
    const sev = report.unread_conversations > settings.threshold_unread_conversations * 2 ? "critical" : "warning";
    alerts.push(mk("unread_conversations", sev, `${clientName}: unread conversations = ${report.unread_conversations}, exceeds threshold of ${settings.threshold_unread_conversations}.`));
  }

  // Cancelled + rescheduled share vs prior month
  if (report.cal_total > 0) {
    const pct = ((report.cal_cancelled + report.cal_rescheduled) / report.cal_total) * 100;
    const thr = settings.threshold_cancelled_resched_pct;
    const pTotal = prior?.cal_total || 0;
    const pPct = pTotal > 0 ? ((prior.cal_cancelled + prior.cal_rescheduled) / pTotal) * 100 : null;
    if (pct > thr) {
      const mom = pPct != null ? ` Prior month: ${pPct.toFixed(0)}% (${pct > pPct ? "+" : ""}${(pct - pPct).toFixed(0)} pts MoM).` : " No prior-month data.";
      alerts.push(mk("cancelled_rescheduled", "warning", `${clientName}: cancelled+rescheduled = ${report.cal_cancelled + report.cal_rescheduled} of ${report.cal_total} appointments (${pct.toFixed(0)}%), exceeds ${thr}% threshold.${mom}`));
    }
  }

  // Integration issues
  if (report.integration_status === "issue" && report.integration_issues_arr?.length) {
    const list = report.integration_issues_arr.map(i => `${i.integration}: ${i.status}${i.error ? ` (${i.error})` : ""}`).join("; ");
    const hasAuth = report.integration_issues_arr.some(i => i.status === "auth_error");
    alerts.push(mk("integration", hasAuth ? "critical" : "warning", `${clientName}: integration problems detected — ${list}.`));
  }

  return alerts;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Soft admin gate for manual triggers; scheduled (no user) proceeds.
    try {
      const user = await base44.auth.me();
      if (user && user.role && !ADMIN_ROLES.includes(user.role) && user.role !== "csm") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) { /* no user session — scheduled run */ }

    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const target = getTargetMonth(payload.month_key);
    const { year, monthIndex, monthName, monthKey } = target;
    const startStr = `${year}-${pad2(monthIndex + 1)}-01`;
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const endStr = `${year}-${pad2(monthIndex + 1)}-${pad2(lastDay)}`;
    const startMs = Date.UTC(year, monthIndex, 1);
    const endMs = Date.UTC(year, monthIndex + 1, 1);

    // Settings (singleton)
    const settingsRecs = await base44.asServiceRole.entities.GHLMonitorSettings.filter({}, "created_date", 1);
    const settings = { ...defaultSettings(), ...(settingsRecs[0] || {}) };

    // Active subaccounts
    let clients = await base44.asServiceRole.entities.Client.filter({ ghl_monitor_active: true }, "name", 500);
    clients = clients.filter(c => c.ghl_location_id && c.ghl_api_key);
    if (payload.client_id) clients = clients.filter(c => c.id === payload.client_id);

    const results = [];
    let totalAlerts = 0;

    for (const client of clients) {
      const issues = [];
      const integrationProbes = [];
      let integrationStatus = "healthy";

      const formSubmissions = await pullForms(client.ghl_api_key, client.ghl_location_id, startStr, endStr, settings, issues);
      const { counts, calendarOk } = await pullCalendar(client.ghl_api_key, client.ghl_location_id, startMs, endMs, settings, issues);
      const conv = await pullConversations(client.ghl_api_key, client.ghl_location_id, startMs, endMs, settings, issues);

      // Integration probes
      integrationProbes.push(await probeIntegration(client.ghl_api_key, client.ghl_location_id, "Payments", "/payments/accounts", settings, issues));
      integrationProbes.push(await probeIntegration(client.ghl_api_key, client.ghl_location_id, "Phone/Numbers", "/phone/numbers", settings, issues));
      if (calendarOk) integrationProbes.push({ integration: "Calendar", status: "healthy", error: null });
      if (conv.ok) integrationProbes.push({ integration: "Conversations", status: "healthy", error: null });
      if (formSubmissions != null) integrationProbes.push({ integration: "Forms", status: "healthy", error: null });

      const realIssues = issues.filter(i => i.status === "auth_error" || i.status === "error");
      if (realIssues.length) integrationStatus = "issue";
      else if (!integrationProbes.some(p => p.status === "healthy")) integrationStatus = "not_available";

      const report = {
        form_submissions: formSubmissions,
        cal_new: counts.new,
        cal_confirmed: counts.confirmed,
        cal_cancelled: counts.cancelled,
        cal_rescheduled: counts.rescheduled,
        cal_total: counts.total,
        unread_conversations: conv.unread,
        workflows_with_errors: null,
        calls_missed: conv.missed,
        email_deliverability: "not_available",
        sms_deliverability: "not_available",
        integration_status: integrationStatus,
        integration_issues: JSON.stringify(realIssues.length ? realIssues : integrationProbes.filter(p => p.status !== "healthy")),
        integration_issues_arr: realIssues.length ? realIssues : [],
        pulled_at: new Date().toISOString(),
      };

      // Prior month report for MoM
      const priorTarget = getTargetMonth(`${year}-${pad2(monthIndex === 0 ? 12 : monthIndex)}`); // not used directly
      let priorMonthKey;
      if (monthIndex === 0) priorMonthKey = `${year - 1}-12`;
      else priorMonthKey = `${year}-${pad2(monthIndex)}`;
      const priorRecs = await base44.asServiceRole.entities.GHLMonthlyReport.filter({ client_id: client.id, month_key: priorMonthKey });
      const prior = priorRecs[0] || null;

      const alerts = buildAlerts(report, prior, settings, client.name);
      totalAlerts += alerts.length;

      // Upsert monthly report
      const existing = await base44.asServiceRole.entities.GHLMonthlyReport.filter({ client_id: client.id, month_key: monthKey });
      const payload = {
        client_id: client.id,
        client_name: client.name,
        month: monthName,
        year,
        month_key: monthKey,
        form_submissions: report.form_submissions,
        cal_new: report.cal_new,
        cal_confirmed: report.cal_confirmed,
        cal_cancelled: report.cal_cancelled,
        cal_rescheduled: report.cal_rescheduled,
        cal_total: report.cal_total,
        unread_conversations: report.unread_conversations,
        workflows_with_errors: null,
        calls_missed: report.calls_missed,
        email_deliverability: "not_available",
        sms_deliverability: "not_available",
        integration_status: report.integration_status,
        integration_issues: report.integration_issues,
        pulled_at: report.pulled_at,
      };
      let savedReport;
      if (existing[0]) {
        savedReport = await base44.asServiceRole.entities.GHLMonthlyReport.update(existing[0].id, payload);
      } else {
        savedReport = await base44.asServiceRole.entities.GHLMonthlyReport.create(payload);
      }

      // Replace alerts for this client+month
      await base44.asServiceRole.entities.GHLAlert.deleteMany({ client_id: client.id, month_key: monthKey });
      for (const a of alerts) {
        await base44.asServiceRole.entities.GHLAlert.create({
          client_id: client.id,
          client_name: client.name,
          month_key: monthKey,
          month: monthName,
          year,
          issue_type: a.issue_type,
          severity: a.severity,
          description: a.description,
          resolved: false,
          created_at: new Date().toISOString(),
        });
      }

      results.push({
        client: client.name,
        form_submissions: report.form_submissions,
        cal_total: report.cal_total,
        unread_conversations: report.unread_conversations,
        calls_missed: report.calls_missed,
        integration_status: report.integration_status,
        alerts: alerts.length,
      });
    }

    return Response.json({
      ok: true,
      month_key: monthKey,
      processed: results.length,
      alerts: totalAlerts,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}