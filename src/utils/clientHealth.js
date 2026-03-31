/**
 * Client Health Scoring Engine
 * Analyzes CSM updates, open red flags, and client status to derive health score.
 */

export const HEALTH = {
  HEALTHY: { label: "Healthy", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  AT_RISK: { label: "At Risk", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

/**
 * Compute health score for a single client.
 * @param {object} client
 * @param {Array} allUpdates - all CSMUpdate records
 * @param {Array} allInsights - all ClientInsight records
 * @returns {{ score: 'HEALTHY'|'AT_RISK'|'CRITICAL', reasons: string[] }}
 */
export function computeClientHealth(client, allUpdates, allInsights) {
  const reasons = [];
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const days14 = 14 * 24 * 60 * 60 * 1000;

  // Status-based signals
  if (client.status === "churned") {
    return { score: "CRITICAL", reasons: ["Client has churned"] };
  }
  if (client.status === "paused") {
    reasons.push("Service is paused");
  }

  // CSM Updates
  const clientUpdates = allUpdates.filter(u => u.client_id === client.id);
  const recentChurnRisk = clientUpdates.find(
    u => u.update_type === "churn_risk" && (now - new Date(u.created_date).getTime()) < days30
  );
  if (recentChurnRisk) reasons.push("Churn risk flagged by CSM");

  const recentIssue = clientUpdates.find(
    u => u.update_type === "issue" && (now - new Date(u.created_date).getTime()) < days14
  );
  if (recentIssue) reasons.push("Open issue in last 14 days");

  // Open red flags
  const clientInsights = allInsights.filter(i => i.client_id === client.id);
  const openRedFlags = clientInsights.reduce((count, ins) => {
    const flags = ins.red_flags || [];
    return count + flags.filter(f => {
      const item = typeof f === "string" ? { resolved: false } : f;
      return !item.resolved;
    }).length;
  }, 0);

  if (openRedFlags >= 2) reasons.push(`${openRedFlags} unresolved red flags`);
  else if (openRedFlags === 1) reasons.push("1 unresolved red flag");

  // Determine final score
  if (recentChurnRisk || openRedFlags >= 2 || client.status === "paused" && openRedFlags >= 1) {
    return { score: "CRITICAL", reasons };
  }
  if (reasons.length > 0) {
    return { score: "AT_RISK", reasons };
  }
  return { score: "HEALTHY", reasons: ["No active risk signals"] };
}

/**
 * Build a map of clientId → health result for all clients.
 */
export function buildHealthMap(clients, allUpdates, allInsights) {
  const map = {};
  for (const client of clients) {
    map[client.id] = computeClientHealth(client, allUpdates, allInsights);
  }
  return map;
}