import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { source_text } = await req.json();

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert CSM analyst for a digital marketing agency. Analyze the following client meeting transcript or email and extract structured insights.

Return a JSON with exactly these keys:
- "summary": A 2-3 sentence executive summary of the most important points.
- "todos": An array of specific action items the agency team needs to do. Start each with a verb (e.g., "Send updated report", "Schedule follow-up call").
- "requests": An array of things the client has explicitly asked for or wants. Quote or paraphrase their requests clearly.
- "red_flags": An array of warning signs, risks, dissatisfaction signals, churn risks, or critical issues that need attention. Be direct.

If a category has nothing, return an empty array.

TEXT:
"""
${source_text}
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

  return Response.json(result);
});