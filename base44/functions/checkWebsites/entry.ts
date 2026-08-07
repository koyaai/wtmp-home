import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Runs on an hourly schedule. For each active Website it sends an HTTP GET
// (10s timeout), records a UptimeCheck, detects status changes vs the most
// recent prior check, and posts a Slack alert (reusing sendSlackMessage) on
// up<->down transitions.

function isUp(code, expected) {
  if (code == null) return false;
  if (expected) return code === expected;
  return code >= 200 && code < 300;
}

function formatManila(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const websites = await base44.asServiceRole.entities.Website.filter(
      { is_active: true },
      "-created_date",
      500
    );

    const results = [];

    for (const site of websites) {
      try {
        // Most recent prior check for this site (to detect status change)
        const prior = await base44.asServiceRole.entities.UptimeCheck.filter(
          { website_id: site.id },
          "-checked_at",
          1
        );
        const prevStatus = prior.length > 0 ? prior[0].status : null;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const start = Date.now();
        let code = null;
        let errorMessage = null;

        try {
          const res = await fetch(site.url, {
            method: "GET",
            signal: controller.signal,
            redirect: "follow",
          });
          code = res.status;
        } catch (e) {
          errorMessage = e.name === "AbortError" ? "Timeout (10s)" : e.message;
        } finally {
          clearTimeout(timeout);
        }

        const responseTime = Date.now() - start;
        const expected = site.expected_status_code || null;
        const status = isUp(code, expected) ? "up" : "down";

        await base44.asServiceRole.entities.UptimeCheck.create({
          website_id: site.id,
          checked_at: new Date().toISOString(),
          status,
          response_code: code,
          response_time_ms: responseTime,
          error_message: errorMessage || (status === "down" ? `HTTP ${code}` : null),
        });

        // Status change -> incident -> Slack alert to the client's channel
        const incident = prevStatus && prevStatus !== status;
        if (incident) {
          const direction = status === "down" ? "🔴 DOWN" : "🟢 RECOVERED";
          const detail =
            status === "down"
              ? errorMessage || `Responded ${code}`
              : `Back up (HTTP ${code})`;
          const text =
            `${direction} — ${site.name}\n` +
            `${site.url}\n` +
            `${formatManila(new Date())} (Manila)\n` +
            `${detail}`;
          try {
            await base44.asServiceRole.functions.invoke("sendSlackMessage", {
              client_id: site.client_id,
              text,
            });
          } catch (_e) {
            /* best-effort alert; don't block the run */
          }
        }

        results.push({
          site: site.name,
          status,
          code,
          response_time_ms: responseTime,
          incident,
        });
      } catch (err) {
        results.push({ site: site.name, error: err.message });
      }
    }

    return Response.json({ ok: true, checked: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}