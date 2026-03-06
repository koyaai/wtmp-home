import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SYSTEM_PROMPT = `You are an advanced content quality analyst and content generation engine. You evaluate, generate, and improve written content using a 12-dimension entropy-based content quality framework.

Your purpose is to ensure all content is: high value, expert-level, specific, credible, locally relevant (when applicable), information-rich, and non-generic. Avoid generic marketing language and templated phrasing.

## 12-DIMENSION FRAMEWORK

Score each dimension 1–10:

1. **Lexical Diversity** – Vocabulary variety, precise terminology, natural variation. Low: repetitive/common marketing words. High: varied, precise language.
2. **Syntactic Burstiness** – Sentence structure variety. Low: robotic rhythm, all-short sentences. High: mix of lengths, natural flow.
3. **Semantic Drift** – Topic depth & contextual expansion. Low: narrow focus. High: explores related concepts, demonstrates subject understanding.
4. **Information Gain** – New/useful information provided. Low: generic descriptions. High: unique insights, practical knowledge, deeper context.
5. **Cliché Density** – Inverse score for generic phrases ("best in town", "quality service", "trusted professionals", "state-of-the-art"). High score = minimal clichés.
6. **Idiomatic Regionalism** – Local context beyond just city name (local conditions, climate, geography, neighborhood references). High: rich local specificity.
7. **Proper Noun Density** – Named entities: organizations, certifications, equipment brands, neighborhoods, materials, standards. High: meaningful proper nouns.
8. **Technical Precision** – Specificity of technical info. Low: vague phrases like "advanced techniques". High: detailed standards, processes, measurable details.
9. **Emotional Variance** – Tonal variation: educational, advisory, practical, narrative mix. Low: purely promotional. High: varied tones.
10. **Nuance Preservation** – Credibility and realism. Low: exaggerated claims. High: balanced, realistic, thoughtful statements.
11. **First-Party Evidence** – Real-world examples: case studies, before/after, results, anecdotes. High: concrete examples demonstrating expertise.
12. **Entity Coherence** – Clear brand/org identity: services, credentials, associations, service area. High: strong entity identity signals.

## ENTROPY SCORE (0–100)
Overall measure of content originality. 0–40: generic/templated. 41–70: moderate uniqueness. 71–100: original, specific, expert.

Always respond with valid JSON only. No markdown, no extra text.`;

const DIMENSIONS = [
  "lexical_diversity",
  "syntactic_burstiness", 
  "semantic_drift",
  "information_gain",
  "cliche_density",
  "idiomatic_regionalism",
  "proper_noun_density",
  "technical_precision",
  "emotional_variance",
  "nuance_preservation",
  "first_party_evidence",
  "entity_coherence"
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { mode, content, topic, context_notes, client_name, content_type } = body;

        let userPrompt = '';

        if (mode === 'analyze') {
            userPrompt = `## ANALYZE THIS CONTENT

Client: ${client_name || 'Unknown'}
Content Type: ${content_type || 'General'}
${context_notes ? `Context: ${context_notes}` : ''}

Content to analyze:
"""
${content}
"""

Analyze using the 12-dimension framework. Return JSON in this exact structure:
{
  "entropy_score": <number 0-100>,
  "dimension_scores": {
    "lexical_diversity": { "score": <1-10>, "explanation": "<brief>" },
    "syntactic_burstiness": { "score": <1-10>, "explanation": "<brief>" },
    "semantic_drift": { "score": <1-10>, "explanation": "<brief>" },
    "information_gain": { "score": <1-10>, "explanation": "<brief>" },
    "cliche_density": { "score": <1-10>, "explanation": "<brief>" },
    "idiomatic_regionalism": { "score": <1-10>, "explanation": "<brief>" },
    "proper_noun_density": { "score": <1-10>, "explanation": "<brief>" },
    "technical_precision": { "score": <1-10>, "explanation": "<brief>" },
    "emotional_variance": { "score": <1-10>, "explanation": "<brief>" },
    "nuance_preservation": { "score": <1-10>, "explanation": "<brief>" },
    "first_party_evidence": { "score": <1-10>, "explanation": "<brief>" },
    "entity_coherence": { "score": <1-10>, "explanation": "<brief>" }
  },
  "top_problems": ["<problem 1>", "<problem 2>", "<problem 3>"],
  "rewrite_strategy": "<paragraph explaining how to improve this content>"
}`;

        } else if (mode === 'generate') {
            userPrompt = `## GENERATE CONTENT

Client: ${client_name || 'Unknown'}
Content Type: ${content_type || 'General'}
Topic: ${topic}
${context_notes ? `Additional Context: ${context_notes}` : ''}

Generate high-quality content using the 12-dimension framework as guiding principles. The content must:
- Avoid generic marketing copy
- Include meaningful specificity
- Demonstrate expertise
- Use varied sentence structures
- Include proper nouns where relevant
- Score 7+ on every dimension and 70+ entropy

Then internally validate and return JSON:
{
  "final_content": "<the full generated content>",
  "entropy_score": <number 70-100>,
  "dimension_scores": {
    "lexical_diversity": { "score": <1-10>, "explanation": "<brief>" },
    "syntactic_burstiness": { "score": <1-10>, "explanation": "<brief>" },
    "semantic_drift": { "score": <1-10>, "explanation": "<brief>" },
    "information_gain": { "score": <1-10>, "explanation": "<brief>" },
    "cliche_density": { "score": <1-10>, "explanation": "<brief>" },
    "idiomatic_regionalism": { "score": <1-10>, "explanation": "<brief>" },
    "proper_noun_density": { "score": <1-10>, "explanation": "<brief>" },
    "technical_precision": { "score": <1-10>, "explanation": "<brief>" },
    "emotional_variance": { "score": <1-10>, "explanation": "<brief>" },
    "nuance_preservation": { "score": <1-10>, "explanation": "<brief>" },
    "first_party_evidence": { "score": <1-10>, "explanation": "<brief>" },
    "entity_coherence": { "score": <1-10>, "explanation": "<brief>" }
  }
}`;

        } else if (mode === 'rewrite') {
            userPrompt = `## REWRITE CONTENT

Client: ${client_name || 'Unknown'}
Content Type: ${content_type || 'General'}
${context_notes ? `Context: ${context_notes}` : ''}

Original content:
"""
${content}
"""

1. First evaluate the original content
2. Identify weaknesses
3. Rewrite to: eliminate clichés, add technical precision, expand semantic depth, add contextual insights, improve sentence variation, strengthen entity signals, increase informational value

Return JSON:
{
  "original_entropy_score": <number>,
  "original_dimension_scores": {
    "lexical_diversity": { "score": <1-10>, "explanation": "<brief>" },
    "syntactic_burstiness": { "score": <1-10>, "explanation": "<brief>" },
    "semantic_drift": { "score": <1-10>, "explanation": "<brief>" },
    "information_gain": { "score": <1-10>, "explanation": "<brief>" },
    "cliche_density": { "score": <1-10>, "explanation": "<brief>" },
    "idiomatic_regionalism": { "score": <1-10>, "explanation": "<brief>" },
    "proper_noun_density": { "score": <1-10>, "explanation": "<brief>" },
    "technical_precision": { "score": <1-10>, "explanation": "<brief>" },
    "emotional_variance": { "score": <1-10>, "explanation": "<brief>" },
    "nuance_preservation": { "score": <1-10>, "explanation": "<brief>" },
    "first_party_evidence": { "score": <1-10>, "explanation": "<brief>" },
    "entity_coherence": { "score": <1-10>, "explanation": "<brief>" }
  },
  "top_problems": ["<problem 1>", "<problem 2>", "<problem 3>"],
  "final_content": "<the full rewritten content>",
  "new_entropy_score": <number>,
  "new_dimension_scores": {
    "lexical_diversity": { "score": <1-10>, "explanation": "<brief>" },
    "syntactic_burstiness": { "score": <1-10>, "explanation": "<brief>" },
    "semantic_drift": { "score": <1-10>, "explanation": "<brief>" },
    "information_gain": { "score": <1-10>, "explanation": "<brief>" },
    "cliche_density": { "score": <1-10>, "explanation": "<brief>" },
    "idiomatic_regionalism": { "score": <1-10>, "explanation": "<brief>" },
    "proper_noun_density": { "score": <1-10>, "explanation": "<brief>" },
    "technical_precision": { "score": <1-10>, "explanation": "<brief>" },
    "emotional_variance": { "score": <1-10>, "explanation": "<brief>" },
    "nuance_preservation": { "score": <1-10>, "explanation": "<brief>" },
    "first_party_evidence": { "score": <1-10>, "explanation": "<brief>" },
    "entity_coherence": { "score": <1-10>, "explanation": "<brief>" }
  }
}`;
        } else {
            return Response.json({ error: 'Invalid mode. Use: analyze, generate, rewrite' }, { status: 400 });
        }

        const res = await base44.integrations.Core.InvokeLLM({
            prompt: userPrompt,
            response_json_schema: {
                type: "object",
                properties: {},
                additionalProperties: true
            }
        });

        return Response.json(res);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});