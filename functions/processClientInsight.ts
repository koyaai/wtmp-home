import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { source_text } = await req.json();
    if (!source_text) return Response.json({ error: 'source_text is required' }, { status: 400 });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert client success manager assistant. Analyze the following meeting transcript or email and extract key information.

TEXT:
"""
${source_text}
"""

Extract:
1. A concise summary (2-4 sentences) of the key points
2. All action items / to-dos that need to be completed (by anyone)
3. All client requests (things the client is asking for)
4. Any red flags, risks, complaints, churn signals, or critical concerns

Be thorough and specific. If a category has nothing, return an empty array.`,
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});