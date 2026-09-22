export const QUESTIONNAIRE_SECTIONS = [
  {
    key: "client_snapshot",
    label: "Client Snapshot",
    fields: [
      { key: "nickname", label: "Nickname / Preferred Name" },
      { key: "birthday", label: "Birthday" },
      { key: "family", label: "Family" },
      { key: "wife", label: "Wife" },
      { key: "family_in_business", label: "Family involved in business" },
      { key: "pets", label: "Pets" },
      { key: "hobbies_interests", label: "Hobbies & Interests" },
      { key: "fun_facts", label: "Fun Facts" },
      { key: "outside_of_work", label: "Outside of Work" },
    ],
  },
  {
    key: "communication_profile",
    label: "Communication Profile",
    fields: [
      { key: "preferred_contact_method", label: "Preferred Contact Method" },
      { key: "best_time_to_contact", label: "Best Time to Contact" },
      { key: "response_style", label: "Response Style" },
      { key: "communication_style", label: "Communication Style" },
      { key: "meeting_style", label: "Meeting Style" },
    ],
  },
  {
    key: "working_relationship",
    label: "Working Relationship Guide",
    fields: [
      { key: "what_they_appreciate", label: "What They Appreciate" },
      { key: "what_frustrates_them", label: "What Frustrates Them" },
      { key: "things_to_avoid", label: "Things To Avoid" },
      { key: "best_way_to_build_rapport", label: "Best Way To Build Rapport" },
    ],
  },
  {
    key: "personality_insights",
    label: "Personality Insights",
    fields: [
      { key: "personality_summary", label: "Personality Summary" },
      { key: "relationship_tips", label: "Relationship Tips" },
      { key: "three_words", label: "If We Had To Describe Them In 3 Words" },
      { key: "energy_type", label: "Energy Type" },
    ],
  },
  {
    key: "csm_notes",
    label: "CSM Notes",
    fields: [
      { key: "recent_wins", label: "Recent Wins" },
      { key: "life_updates", label: "Life Updates" },
      { key: "things_future_csms_should_know", label: "Things Future CSMs Should Know" },
    ],
  },
];

export const TOTAL_FIELDS = QUESTIONNAIRE_SECTIONS.reduce((n, s) => n + s.fields.length, 0);

export const AI_SHEET_SCHEMA = {
  type: "object",
  properties: {
    three_words: { type: "array", items: { type: "string" } },
    energy_type: { type: "array", items: { type: "string" } },
    how_to_approach: { type: "array", items: { type: "string" } },
    do_appreciate: { type: "array", items: { type: "string" } },
    frustrates_them: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    pinned_things_to_know: { type: "array", items: { type: "string" } },
    recent_wins: { type: "array", items: { type: "string" } },
    life_updates: { type: "array", items: { type: "string" } },
    personality_summary: { type: "string" },
  },
};

export function emptyQuestionnaire() {
  const q = {};
  QUESTIONNAIRE_SECTIONS.forEach((s) => { q[s.key] = {}; });
  return q;
}

export function countFilledFields(questionnaire) {
  let n = 0;
  QUESTIONNAIRE_SECTIONS.forEach((s) => {
    s.fields.forEach((f) => {
      const v = questionnaire?.[s.key]?.[f.key];
      if (v && String(v).trim()) n += 1;
    });
  });
  return n;
}

export function buildSheetPrompt(contact, questionnaire) {
  const lines = [];
  QUESTIONNAIRE_SECTIONS.forEach((s) => {
    lines.push(`\n[${s.label}]`);
    s.fields.forEach((f) => {
      const v = questionnaire?.[s.key]?.[f.key];
      lines.push(`${f.label}: ${v && String(v).trim() ? String(v).trim() : "(not provided)"}`);
    });
  });
  return `You are structuring a "Quick Client Prep" one-pager for a client contact from questionnaire answers, so a new CSM can instantly understand who they are and how to communicate with them.

Contact name: ${contact.full_name}${contact.preferred_name ? ` (preferred name: ${contact.preferred_name})` : ""}

Questionnaire answers:
${lines.join("\n")}

Produce a structured Quick Client Prep sheet:
- three_words: up to 3 single words describing them (from the "3 words" answer; if empty, infer from the summary).
- energy_type: 1-3 short traits capturing their energy (from "Energy Type"; split on commas).
- how_to_approach: concise bullets on how to approach/work with them (from "Best Way To Build Rapport" and "Relationship Tips").
- do_appreciate: bullets of what they appreciate (from "What They Appreciate").
- frustrates_them: bullets of what frustrates them (from "What Frustrates Them").
- avoid: bullets of things to avoid (from "Things To Avoid").
- pinned_things_to_know: bullets a future CSM must know (from "Things Future CSMs Should Know", "Fun Facts", "Outside of Work").
- recent_wins: bullets (from "Recent Wins").
- life_updates: bullets (from "Life Updates").
- personality_summary: 2-3 sentence professional persona summary (from "Personality Summary"; if empty, synthesize from the answers).

Rules: keep wording faithful to the answers; lightly clean for clarity and brevity. Split comma/newline lists into separate bullets. Max ~6 bullets per list. Never invent facts not supported by the answers.`;
}