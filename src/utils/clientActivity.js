import { base44 } from "@/api/base44Client";

export const STALE_THRESHOLDS = { Outshine: 2, Rocketfuel: 2, Growth: 5, default: 5 };

export function getStaleThreshold(program) {
  return STALE_THRESHOLDS[program] ?? STALE_THRESHOLDS.default;
}

/**
 * Most recent activity timestamp (ms) for one record. Tracker edits write an
 * explicit last_tracker_activity, so to-do / red flag changes always count.
 */
function recordTimestamp(r) {
  const stamps = [r.created_date, r.updated_date, r.last_tracker_activity]
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .filter(Number.isFinite);
  return stamps.length ? Math.max(...stamps) : 0;
}

/**
 * Fetch the most recent activity timestamp for a single client
 * by querying ClientInsight, CSMUpdate, MeetingNote, and Onboarding in parallel.
 * Returns a Date or null.
 */
export async function getLastActivityDate(clientId) {
  const [insights, updates, meetingNotes, onboardings] = await Promise.all([
    base44.entities.ClientInsight.filter({ client_id: clientId }, "-updated_date", 1),
    base44.entities.CSMUpdate.filter({ client_id: clientId }, "-updated_date", 1),
    base44.entities.MeetingNote.filter({ client_id: clientId }, "-updated_date", 1),
    base44.entities.Onboarding.filter({ client_id: clientId }, "-updated_date", 1),
  ]);
  let latest = null;
  for (const records of [insights, updates, meetingNotes, onboardings]) {
    for (const r of records) {
      const ts = recordTimestamp(r);
      if (ts > (latest ?? 0)) latest = ts;
    }
  }
  return latest ? new Date(latest) : null;
}

/**
 * Build a map of clientId → Date (most recent activity) from pre-fetched record arrays.
 * More efficient than calling getLastActivityDate per client.
 */
export function buildLastActivityMap(clients, insights, updates, meetingNotes, onboardings) {
  const map = {};
  for (const client of clients) map[client.id] = null;
  for (const records of [insights, updates, meetingNotes, onboardings]) {
    for (const r of records) {
      const cid = r.client_id;
      if (!(cid in map)) continue;
      const ts = recordTimestamp(r);
      if (ts > (map[cid] ?? 0)) map[cid] = ts;
    }
  }
  for (const id in map) {
    map[id] = map[id] ? new Date(map[id]) : null;
  }
  return map;
}

export function isClientStale(client, lastActivityDate) {
  if (client?.status === "churned" || client?.status === "offboarded") return false;
  if (!lastActivityDate) return true;
  const daysSince = Math.floor((Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));
  return daysSince > getStaleThreshold(client.program);
}

export function getStaleDays(client, lastActivityDate) {
  if (!lastActivityDate) return null;
  return Math.floor((Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));
}