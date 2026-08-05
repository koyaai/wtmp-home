/**
 * Builds a Slack mention string from a client's CSM/CSA Slack User IDs.
 * Returns e.g. "<@U123> <@U456>", or empty string if neither ID is set.
 * @param {object} client - Client entity with optional csm_slack_id / csa_slack_id
 * @returns {string}
 */
export function buildMentions(client) {
  const ids = [client?.csm_slack_id, client?.csa_slack_id]
    .filter(Boolean)
    .map((id) => `<@${id}>`);
  return ids.length ? ids.join(" ") : "";
}