import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

const BASE = "https://services.leadconnectorhq.com";

// ---------- month helpers ----------
function parseMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  return { year: y, month: m - 1 };
}
function monthLabel(mk) {
  const { year, month } = parseMonthKey(mk);
  return new Date(year, month, 1).toLocaleString("en-US", { month: "long" });
}
function monthYearLabel(mk) {
  const { year } = parseMonthKey(mk);
  return `${monthLabel(mk)} ${year}`;
}
function previousMonthKey(mk) {
  const { year, month } = parseMonthKey(mk);
  const d = new Date(year, month - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function currentPreviousMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function inMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

// ---------- GHL request with version fallback + 429 retry ----------
async function ghlRequest(pathname, { apiKey, version, fallbackVersion, params }) {
  const url = new URL(BASE + pathname);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const tryReq = async (ver) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, Version: ver, Accept: "application/json" },
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (res.status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { ok: res.ok, status: res.status, data, text, ver };
    }
  };
  const safeUrl = url.pathname + url.search;
  let r = await tryReq(version || "v3");
  if (!r.ok && fallbackVersion && (version || "v3") !== fallbackVersion && (r.status === 404 || r.status === 400)) {
    const fb = await tryReq(fallbackVersion);
    if (fb.ok) return { ok: true, status: fb.status, data: fb.data, usedVersion: fb.ver, safeUrl };
    return { ok: false, status: fb.status, error: fb.text, safeUrl, usedVersion: fb.ver };
  }
  if (!r.ok) return { ok: false, status: r.status, error: r.text, safeUrl, usedVersion: r.ver };
  return { ok: true, status: r.status, data: r.data, usedVersion: r.ver, safeUrl };
}

// ---------- settings singleton ----------
async function getSettings(base44) {
  const recs = await base44.asServiceRole.entities.GHLMonitorSettings.filter({ name: "default" }, "-created_date", 1);
  if (recs.length) return recs[0];
  return await base44.asServiceRole.entities.GHLMonitorSettings.create({
    name: "default",
    threshold_missed_calls: 10, threshold_unread_conversations: 10,
    threshold_cancelled_pct: 30, threshold_noshow_pct: 30,
    missed_call_statuses: '["no-answer","busy","voicemail"]',
    version_calendars: "v3", fallback_calendars: "2021-07-28",
    version_events: "v3", fallback_events: "2021-07-28",
    version_calls: "v3", fallback_calls: "2021-07-28",
    version_forms: "v3", fallback_forms: "2021-07-28",
    version_conversations: "v3", fallback_conversations: "2021-07-28",
    version_integrations: "v3", fallback_integrations: "2021-07-28",
    slack_webhook_url: "", notify_day_of_month: 1, notify_time: "08:00",
    notify_timezone: "Asia/Manila", include_no_alerts: true,
    diagnostics_call_statuses: "[]", diagnostics_appt_statuses: "[]",
    updated_at: new Date().toISOString(),
  });
}

function mergeDiagnostics(existingJson, seen) {
  const arr = JSON.parse(existingJson || "[]");
  const map = new Map(arr.map((d) => [d.status, d]));
  for (const [status, count] of Object.entries(seen)) {
    const cur = map.get(status) || { status, count: 0, last_seen: null };
    cur.count += count;
    cur.last_seen = new Date().toISOString();
    map.set(status, cur);
  }
  return JSON.stringify([...map.values()]);
}

// ---------- sync: calls (bulk upsert) ----------
async function syncCalls(base44, sub, settings, diagSeen) {
  const now = Date.now();
  const existing = await base44.asServiceRole.entities.Call.filter({ subaccount_id: sub.id }, "-date_added", 5000);
  const firstRun = existing.length === 0;
  const days = firstRun ? 30 : 3;
  const startDate = new Date(now - days * 86400000).toISOString().slice(0, 10);
  const endDate = new Date(now).toISOString().slice(0, 10);
  const idMap = new Map(existing.map((c) => [c.ghl_message_id, c.id]));
  let cursor = null;
  let synced = 0;
  const newRecords = [];
  const updateRecords = [];
  do {
    const params = { locationId: sub.ghl_location_id, channel: "Call", limit: 1000, startDate, endDate };
    if (cursor) params.cursor = cursor;
    const r = await ghlRequest("/conversations/messages/export", {
      apiKey: sub.ghl_api_key, version: settings.version_calls, fallbackVersion: settings.fallback_calls, params,
    });
    if (!r.ok) return { ok: false, error: `Calls sync failed: HTTP ${r.status} ${r.error}`, safeUrl: r.safeUrl };
    const data = r.data || {};
    const messages = data.messages || data.data || [];
    for (const m of messages) {
      const mid = m.id || m.messageId;
      if (!mid) continue;
      const call_status = (m.meta && m.meta.call && m.meta.call.status) || m.status || null;
      if (call_status) diagSeen.calls[call_status] = (diagSeen.calls[call_status] || 0) + 1;
      const payload = {
        subaccount_id: sub.id, subaccount_name: sub.name, ghl_message_id: mid,
        call_status, direction: m.direction || null,
        from_number: m.fromNumber || m.from || null,
        to_number: m.toNumber || m.to || null,
        contact_id: m.contactId || (m.contact && m.contact.id) || null,
        conversation_id: m.conversationId || null,
        user_id: m.userId || m.assignedUserId || null,
        date_added: m.dateAdded || m.createdAt || null,
        date_updated: m.dateUpdated || m.updatedAt || null,
        source: m.source || null, alt_id: m.altId || null,
      };
      if (idMap.has(mid)) updateRecords.push({ id: idMap.get(mid), ...payload });
      else newRecords.push(payload);
      synced++;
    }
    cursor = data.nextCursor || null;
  } while (cursor);
  if (newRecords.length) {
    const created = await base44.asServiceRole.entities.Call.bulkCreate(newRecords);
    for (const c of created) idMap.set(c.ghl_message_id, c.id);
  }
  if (updateRecords.length) await base44.asServiceRole.entities.Call.bulkUpdate(updateRecords);
  return { ok: true, synced };
}

// ---------- sync: appointments (bulk upsert) ----------
async function syncAppointments(base44, sub, settings, diagSeen) {
  const now = Date.now();
  const existing = await base44.asServiceRole.entities.Appointment.filter({ subaccount_id: sub.id }, "-start_time", 5000);
  const firstRun = existing.length === 0;
  const backDays = firstRun ? 30 : 14;
  const aheadDays = firstRun ? 60 : 14;
  const windowStart = now - backDays * 86400000;
  const windowEnd = now + aheadDays * 86400000;
  const calRes = await ghlRequest("/calendars/", {
    apiKey: sub.ghl_api_key, version: settings.version_calendars, fallbackVersion: settings.fallback_calendars,
    params: { locationId: sub.ghl_location_id },
  });
  if (!calRes.ok) return { ok: false, error: `Calendars list failed: HTTP ${calRes.status} ${calRes.error}`, safeUrl: calRes.safeUrl };
  const calendars = (calRes.data && calRes.data.calendars) || [];
  if (!calendars.length) return { ok: true, synced: 0 };
  const idMap = new Map(existing.map((a) => [a.ghl_event_id, a.id]));
  let synced = 0;
  const newRecords = [];
  const updateRecords = [];
  for (const cal of calendars) {
    for (let ws = windowStart; ws < windowEnd; ws += 7 * 86400000) {
      const we = Math.min(ws + 7 * 86400000, windowEnd);
      const r = await ghlRequest("/calendars/events", {
        apiKey: sub.ghl_api_key, version: settings.version_events, fallbackVersion: settings.fallback_events,
        params: { locationId: sub.ghl_location_id, calendarId: cal.id, startTime: ws, endTime: we },
      });
      if (!r.ok) return { ok: false, error: `Events sync failed for calendar ${cal.id}: HTTP ${r.status} ${r.error}`, safeUrl: r.safeUrl };
      const events = (r.data && (r.data.events || r.data.appointments)) || [];
      for (const e of events) {
        const eid = e.id;
        if (!eid) continue;
        const status = e.appointmentStatus || null;
        if (status) diagSeen.appts[status] = (diagSeen.appts[status] || 0) + 1;
        const payload = {
          subaccount_id: sub.id, subaccount_name: sub.name, ghl_event_id: eid,
          calendar_id: e.calendarId || cal.id || null,
          contact_id: e.contactId || null,
          assigned_user_id: e.assignedUserId || e.userId || null,
          title: e.title || null, appointment_status: status,
          start_time: e.startTime || null, end_time: e.endTime || null,
          date_added: e.dateAdded || e.createdAt || null,
          date_updated: e.dateUpdated || e.updatedAt || null,
          raw_event: JSON.stringify(e),
        };
        if (idMap.has(eid)) updateRecords.push({ id: idMap.get(eid), ...payload });
        else newRecords.push(payload);
        synced++;
      }
    }
  }
  if (newRecords.length) {
    const created = await base44.asServiceRole.entities.Appointment.bulkCreate(newRecords);
    for (const c of created) idMap.set(c.ghl_event_id, c.id);
  }
  if (updateRecords.length) await base44.asServiceRole.entities.Appointment.bulkUpdate(updateRecords);
  return { ok: true, synced };
}

// ---------- run sync ----------
async function runSync(base44, settings, subaccountId) {
  let subs;
  if (subaccountId) {
    const one = await base44.asServiceRole.entities.Subaccount.get(subaccountId);
    subs = [one];
  } else {
    subs = await base44.asServiceRole.entities.Subaccount.filter({ active: true }, "-created_date", 500);
  }
  const diagSeen = { calls: {}, appts: {} };
  const results = [];
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    let status = "success";
    let error = null;
    try {
      const callsR = await syncCalls(base44, sub, settings, diagSeen);
      const apptsR = await syncAppointments(base44, sub, settings, diagSeen);
      if (!callsR.ok || !apptsR.ok) {
        status = "failed";
        error = [callsR.error, apptsR.error].filter(Boolean).join(" | ");
        const mk = currentPreviousMonthKey();
        await base44.asServiceRole.entities.GHLAlert.create({
          subaccount_id: sub.id, subaccount_name: sub.name, month_key: mk,
          month: monthLabel(mk), year: parseMonthKey(mk).year,
          issue_type: "sync_failed", severity: "critical",
          description: `Sync failed: ${error}${callsR.safeUrl ? ` | URL: ${callsR.safeUrl}` : ""}${apptsR.safeUrl ? ` | URL: ${apptsR.safeUrl}` : ""}`,
          resolved: false, created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      status = "failed";
      error = e.message;
    }
    try {
      await base44.asServiceRole.entities.Subaccount.update(sub.id, {
        last_synced_at: new Date().toISOString(),
        last_sync_status: status, last_sync_error: error || null,
      });
    } catch {}
    results.push({ subaccount_id: sub.id, name: sub.name, status, calls: 0, appts: 0, error });
    if (i < subs.length - 1) await new Promise((r) => setTimeout(r, 200));
  }
  await base44.asServiceRole.entities.GHLMonitorSettings.update(settings.id, {
    diagnostics_call_statuses: mergeDiagnostics(settings.diagnostics_call_statuses, diagSeen.calls),
    diagnostics_appt_statuses: mergeDiagnostics(settings.diagnostics_appt_statuses, diagSeen.appts),
    updated_at: new Date().toISOString(),
  });
  return { results, diagnostics: diagSeen };
}

// ---------- compute monthly report ----------
async function computeReport(base44, settings, sub, monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  const missedStatuses = JSON.parse(settings.missed_call_statuses || '["no-answer","busy","voicemail"]');
  const calls = await base44.asServiceRole.entities.Call.filter({ subaccount_id: sub.id }, "-date_added", 5000);
  const monthCalls = calls.filter((c) => inMonth(c.date_added, year, month));
  const missed = monthCalls.filter((c) => c.direction === "inbound" && missedStatuses.includes(c.call_status));
  const breakdown = {};
  for (const c of missed) breakdown[c.call_status] = (breakdown[c.call_status] || 0) + 1;
  const appts = await base44.asServiceRole.entities.Appointment.filter({ subaccount_id: sub.id }, "-start_time", 5000);
  const monthAppts = appts.filter((a) => inMonth(a.start_time, year, month));
  const apptCounts = {};
  for (const a of monthAppts) {
    const s = a.appointment_status || "unknown";
    apptCounts[s] = (apptCounts[s] || 0) + 1;
  }
  const totalAppts = monthAppts.length;
  const priorKey = previousMonthKey(monthKey);
  const priorRecs = await base44.asServiceRole.entities.MonthlyReport.filter({ subaccount_id: sub.id, month_key: priorKey }, "-created_date", 1);
  const prior = priorRecs[0] || null;
  const payload = {
    subaccount_id: sub.id, subaccount_name: sub.name, month: monthLabel(monthKey), year, month_key: monthKey,
    form_submissions: null, appointment_status_counts: JSON.stringify(apptCounts), total_appointments: totalAppts,
    unread_conversations: null, calls_missed: missed.length, calls_missed_breakdown: JSON.stringify(breakdown),
    integration_status: "not_available", integration_issues: "[]",
    sync_status: sub.last_sync_status === "failed" ? "failed" : "success",
    sync_errors: sub.last_sync_error || null, pulled_at: new Date().toISOString(),
  };
  const existing = await base44.asServiceRole.entities.MonthlyReport.filter({ subaccount_id: sub.id, month_key: monthKey }, "-created_date", 1);
  let report;
  if (existing[0]) report = await base44.asServiceRole.entities.MonthlyReport.update(existing[0].id, payload);
  else report = await base44.asServiceRole.entities.MonthlyReport.create(payload);
  return { report, prior, missed, breakdown, apptCounts, totalAppts };
}

// ---------- generate alerts ----------
async function generateAlerts(base44, settings, sub, ctx, monthKey) {
  const { report, prior, missed, breakdown, apptCounts, totalAppts } = ctx;
  const mk = monthKey;
  const label = monthLabel(mk);
  const priorKey = previousMonthKey(mk);
  const priorLabel = monthLabel(priorKey);
  await base44.asServiceRole.entities.GHLAlert.deleteMany({ subaccount_id: sub.id, month_key: mk, resolved: false });
  const make = (issue_type, severity, description) => base44.asServiceRole.entities.GHLAlert.create({
    subaccount_id: sub.id, subaccount_name: sub.name, month_key: mk, month: label, year: parseMonthKey(mk).year,
    issue_type, severity, description, resolved: false, created_at: new Date().toISOString(),
  });
  if (missed.length > settings.threshold_missed_calls) {
    const breakdownStr = Object.entries(breakdown).map(([s, c]) => `${s} ${c}`).join(", ");
    const priorMissed = prior ? prior.calls_missed : null;
    let desc = `${missed.length} inbound missed calls in ${label} (${breakdownStr}), threshold ${settings.threshold_missed_calls}`;
    if (priorMissed != null) {
      const pct = priorMissed > 0 ? Math.round((missed.length - priorMissed) / priorMissed * 100) : 100;
      desc += `, up from ${priorMissed} in ${priorLabel} (${pct >= 0 ? "+" : ""}${pct}%)`;
    }
    desc += ".";
    const sev = (priorMissed != null && priorMissed > 0 && missed.length >= priorMissed * 2) || missed.length >= settings.threshold_missed_calls * 2 ? "critical" : "warning";
    await make("missed_calls", sev, desc);
  }
  const cancelled = apptCounts["cancelled"] || 0;
  const cancelledPct = totalAppts ? Math.round((cancelled / totalAppts) * 100) : 0;
  let priorCancelled = 0, priorTotal = 0, priorCancelledPct = null;
  if (prior) {
    try { priorCancelled = (JSON.parse(prior.appointment_status_counts || "{}")["cancelled"]) || 0; } catch { priorCancelled = 0; }
    priorTotal = prior.total_appointments || 0;
    priorCancelledPct = priorTotal ? Math.round((priorCancelled / priorTotal) * 100) : 0;
  }
  if (totalAppts > 0 && cancelledPct > settings.threshold_cancelled_pct && (priorCancelledPct === null || cancelledPct > priorCancelledPct)) {
    let desc = `${cancelled} of ${totalAppts} appointments cancelled in ${label} (${cancelledPct}%)`;
    if (priorCancelledPct !== null) desc += `, up from ${priorCancelledPct}% in ${priorLabel}`;
    desc += ".";
    const sev = cancelledPct >= 50 ? "critical" : "warning";
    await make("cancelled_appointments", sev, desc);
  }
  const noshow = apptCounts["noshow"] || 0;
  const noshowPct = totalAppts ? Math.round((noshow / totalAppts) * 100) : 0;
  if (totalAppts > 0 && noshow > 0 && noshowPct > settings.threshold_noshow_pct) {
    let priorNoshow = 0, priorNoshowPct = null;
    if (prior) {
      try { priorNoshow = (JSON.parse(prior.appointment_status_counts || "{}")["noshow"]) || 0; } catch { priorNoshow = 0; }
      priorNoshowPct = priorTotal ? Math.round((priorNoshow / priorTotal) * 100) : 0;
    }
    let desc = `${noshow} of ${totalAppts} appointments no-showed in ${label} (${noshowPct}%)`;
    if (priorNoshowPct !== null) desc += `, up from ${priorNoshowPct}% in ${priorLabel}`;
    desc += ".";
    await make("noshow_appointments", "warning", desc);
  }
}

// ---------- slack notification ----------
async function sendSlack(base44, settings, reports, alerts, monthKey) {
  const webhook = settings.slack_webhook_url;
  const label = monthYearLabel(monthKey);
  if (!webhook) return { sent: false, error: "No Slack webhook configured" };
  const alertsBySub = {};
  for (const a of alerts) (alertsBySub[a.subaccount_id] = alertsBySub[a.subaccount_id] || []).push(a);
  const sevRank = { critical: 0, warning: 1, info: 2 };
  let red = 0, yellow = 0, green = 0;
  const syncFailed = [];
  for (const r of reports) {
    const sa = alertsBySub[r.subaccount_id] || [];
    if (sa.some((a) => a.issue_type === "sync_failed")) syncFailed.push(r);
    if (sa.some((a) => a.severity === "critical")) red++;
    else if (sa.some((a) => a.severity === "warning")) yellow++;
    else green++;
  }
  const blocks = [];
  blocks.push({ type: "header", text: { type: "plain_text", text: `GHL Monthly Report — ${label}` } });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `:red_circle: ${red} red  :large_yellow_circle: ${yellow} yellow  :large_green_circle: ${green} green` }] });
  blocks.push({ type: "divider" });
  const sorted = reports
    .filter((r) => (alertsBySub[r.subaccount_id] || []).length > 0)
    .sort((a, b) => {
      const sa = alertsBySub[a.subaccount_id] || [], sb = alertsBySub[b.subaccount_id] || [];
      const ra = Math.min(...sa.map((x) => sevRank[x.severity] != null ? sevRank[x.severity] : 9));
      const rb = Math.min(...sb.map((x) => sevRank[x.severity] != null ? sevRank[x.severity] : 9));
      return ra - rb;
    });
  for (const r of sorted) {
    const sa = (alertsBySub[r.subaccount_id] || []).slice().sort((a, b) => (sevRank[a.severity] != null ? sevRank[a.severity] : 9) - (sevRank[b.severity] != null ? sevRank[b.severity] : 9));
    const lines = sa.map((a) => `• ${a.description}`);
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${r.subaccount_name}*\n${lines.join("\n")}` } });
  }
  if (settings.include_no_alerts && green > 0) {
    const noAlertNames = reports.filter((r) => (alertsBySub[r.subaccount_id] || []).length === 0).map((r) => r.subaccount_name);
    if (noAlertNames.length) blocks.push({ type: "section", text: { type: "mrkdwn", text: `*No alerts:* ${noAlertNames.join(", ")}` } });
  }
  if (syncFailed.length) {
    blocks.push({ type: "divider" });
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `:warning: *Sync failed (${syncFailed.length})*\n${syncFailed.map((r) => `• ${r.subaccount_name}`).join("\n")}` } });
  }
  blocks.push({ type: "divider" });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `<https://wtmphome.base44.app/GHLMonitor|Open Dashboard> · <https://wtmphome.base44.app/GHLMonitor|Open Alerts>` }] });
  const post = async (blk) => {
    const res = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks: blk }) });
    const text = await res.text();
    return { ok: text.trim() === "ok", status: res.status, text };
  };
  const chunks = [];
  for (let i = 0; i < blocks.length; i += 45) chunks.push(blocks.slice(i, i + 45));
  let attempts = 0, lastError = null, success = false;
  while (attempts < 3 && !success) {
    attempts++;
    let failed = null;
    for (const chunk of chunks) {
      const r = await post(chunk);
      if (!r.ok) { failed = r; break; }
    }
    if (failed) { lastError = `${failed.status} ${failed.text}`; await new Promise((r) => setTimeout(r, 1000)); }
    else success = true;
  }
  const status = success ? "success" : "failed";
  await base44.asServiceRole.entities.NotificationLog.create({
    month_key: monthKey, sent_at: new Date().toISOString(), status, attempts, response: success ? "ok" : (lastError || "error"),
  });
  await base44.asServiceRole.entities.GHLMonitorSettings.update(settings.id, {
    last_notification_status: status, last_notification_at: new Date().toISOString(),
  });
  if (!success) {
    await base44.asServiceRole.entities.GHLAlert.create({
      subaccount_id: null, subaccount_name: "(system)", month_key: monthKey, month: monthLabel(monthKey), year: parseMonthKey(monthKey).year,
      issue_type: "notification_failed", severity: "critical",
      description: `Slack notification failed after ${attempts} attempts: ${lastError}`, resolved: false, created_at: new Date().toISOString(),
    });
  }
  return { sent: success, attempts, error: lastError };
}

// ---------- run report ----------
async function runReport(base44, settings, monthKey, sendSlackFlag, subaccountId) {
  const mk = monthKey || currentPreviousMonthKey();
  let subs;
  if (subaccountId) {
    const one = await base44.asServiceRole.entities.Subaccount.get(subaccountId);
    subs = [one];
  } else {
    subs = await base44.asServiceRole.entities.Subaccount.filter({ active: true }, "-created_date", 500);
  }
  const reports = [];
  for (const sub of subs) {
    const ctx = await computeReport(base44, settings, sub, mk);
    await generateAlerts(base44, settings, sub, ctx, mk);
    reports.push(ctx.report);
  }
  const alerts = await base44.asServiceRole.entities.GHLAlert.filter({ month_key: mk, resolved: false }, "-created_date", 500);
  let slack = null;
  if (sendSlackFlag) slack = await sendSlack(base44, settings, reports, alerts, mk);
  return { month_key: mk, reports: reports.length, alerts: alerts.length, slack };
}

// ---------- handler ----------
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { mode = "sync", subaccount_id, month_key, send_slack = false } = body;
    const settings = await getSettings(base44);
    if (mode === "sync") {
      const res = await runSync(base44, settings, subaccount_id);
      return Response.json({ mode, ...res });
    }
    if (mode === "report") {
      const res = await runReport(base44, settings, month_key, send_slack, subaccount_id);
      return Response.json({ mode, ...res });
    }
    if (mode === "run_now") {
      const sync = await runSync(base44, settings, subaccount_id);
      const report = await runReport(base44, settings, month_key, false, subaccount_id);
      return Response.json({ mode, sync, report });
    }
    if (mode === "test_notification") {
      const mk = month_key || currentPreviousMonthKey();
      const reports = await base44.asServiceRole.entities.MonthlyReport.filter({ month_key: mk }, "-created_date", 500);
      const alerts = await base44.asServiceRole.entities.GHLAlert.filter({ month_key: mk, resolved: false }, "-created_date", 500);
      const slack = await sendSlack(base44, settings, reports, alerts, mk);
      return Response.json({ mode, slack });
    }
    return Response.json({ error: "Unknown mode" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}