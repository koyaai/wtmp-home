import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CHUNK_SIZE = 8000; // characters per chunk

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function extractFromChunk(base44, text, chunkIndex, totalChunks) {
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an expert CSM analyst for a digital marketing agency. Analyze the following ${totalChunks > 1 ? `PART ${chunkIndex + 1} OF ${totalChunks} of a ` : ""}client meeting transcript or email and extract structured insights.

Your goal is to produce a summary thorough enough that a teammate who was NOT in the meeting can fully understand what happened — what was discussed, what was decided, what context matters, and how the client felt throughout.

Return a JSON with exactly these keys:
- "summary": A detailed narrative summary of this section. Do NOT be succinct. Cover, in flowing prose:
  * The topics discussed, in the order they came up.
  * Any decisions made, agreements reached, or changes requested.
  * Important context, background, or numbers mentioned (budgets, timelines, metrics, dates).
  * The client's tone, mood, and sentiment — enthusiasm, frustration, urgency, confidence, hesitation — and what triggered it.
  * Anything notable that a future reader would need to know to understand where the account stands.
  Aim for several substantive paragraphs if the content warrants it. Omit nothing important simply for brevity.
- "todos": An array of specific action items the agency team needs to do. Start each with a verb.
- "requests": An array of things the client has explicitly asked for or wants.
- "red_flags": An array of warning signs, risks, dissatisfaction signals, or critical issues.

If a category has nothing, return an empty array.

TEXT:
"""
${text}
"""`,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        todos: { type: "array", items: { type: "string" } },
        requests: { type: "array", items: { type: "string" } },
        red_flags: { type: "array", items: { type: "string" } }
      }
    }
  });
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    let source_text = body.source_text || '';

    // If a file URL was provided, fetch the file content directly
    if (body.file_url) {
      const fileRes = await fetch(body.file_url);
      source_text = await fileRes.text();
    }

    const chunks = chunkText(source_text.trim(), CHUNK_SIZE);

    if (chunks.length === 1) {
      // Single chunk — process directly
      const result = await extractFromChunk(base44, chunks[0], 0, 1);
      return Response.json(result);
    }

    // Multiple chunks — process in parallel then merge
    const results = await Promise.all(
      chunks.map((chunk, i) => extractFromChunk(base44, chunk, i, chunks.length))
    );

    // Merge: combine all arrays, deduplicate similar items, merge summaries
    const allTodos = [...new Set(results.flatMap(r => r.todos || []))];
    const allRequests = [...new Set(results.flatMap(r => r.requests || []))];
    const allRedFlags = [...new Set(results.flatMap(r => r.red_flags || []))];
    const summaryParts = results.map(r => r.summary).filter(Boolean).join(" ");

    // Ask LLM to produce a comprehensive merged summary
    const mergedSummary = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `The following are detailed summaries from different sections of a single long client meeting transcript. Write ONE comprehensive, cohesive narrative summary that reads as if it were written by someone who attended the whole meeting.

Do NOT be succinct. A teammate who was not in the meeting should be able to read this and fully understand:
- What was discussed, topic by topic, in a logical order.
- What decisions were made, what was agreed, and what changed.
- Key context, numbers, timelines, and commitments mentioned.
- How the client felt throughout the meeting — their tone, mood, confidence, frustrations, and what drove those emotions.
- The overall state of the account and relationship coming out of the meeting.

Weave the section summaries together into a flowing narrative (several paragraphs as needed). Preserve every important detail — do not trim for brevity.

SECTION SUMMARIES:
"""
${summaryParts}
"""`
    });

    return Response.json({
      summary: mergedSummary,
      todos: allTodos,
      requests: allRequests,
      red_flags: allRedFlags,
      chunks_processed: chunks.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});