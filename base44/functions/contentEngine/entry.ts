import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DIMENSION_SCORES_SCHEMA = `{
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
  }`;

const GENERIC_PHRASE_SCHEMA = `"generic_phrase_detection": {
    "detected_phrases": [
      { "phrase": "<exact phrase>", "sentence": "<full sentence containing it>", "reason": "<why it weakens the content>" }
    ],
    "total_detected": <number>,
    "scoring_impact": "<brief description of how these phrases affected the entropy and dimension scores>"
  }`;

const CLAIM_VERIFIABILITY_SCHEMA = `"claim_verifiability": {
    "detected_claims": [
      {
        "claim": "<full statement from content>",
        "claim_type": "Absolute Claim|Statistical Claim|Authority Claim|Process Claim",
        "issue": "<why this claim is weak, vague, exaggerated, or unverifiable>",
        "suggested_improvement": "<stronger alternative with specific details, measurable info, entities, or experience signals>"
      }
    ],
    "total_detected": <number>,
    "scoring_impact": "<brief description of how these claims affected nuance_preservation, technical_precision, first_party_evidence, entity_coherence scores>"
  }`;

const FRAMEWORK_INSTRUCTIONS = `
## STEP 0 — GENERIC PHRASE DETECTION PASS (run FIRST, before any scoring)
Before evaluating or scoring content, scan the entire text for generic, templated, or low-information marketing language in these categories:

1. Marketing Clichés: "best in town", "trusted professionals", "quality service", "highly trained technicians", "industry-leading", "state-of-the-art", "top-notch service", "competitive pricing", "satisfaction guaranteed", "we take pride in", "your trusted partner", "unmatched quality", "reliable solutions", "exceptional service"
2. Vague Descriptive Language: "advanced technology", "cutting-edge methods", "innovative solutions", "customized services", "tailored approach", "modern equipment", "superior results", "professional-grade tools", "high-quality materials"
3. Generic Service Descriptions: "we provide professional services", "we are committed to excellence", "our team is dedicated to customer satisfaction", "we deliver outstanding results", "we work hard to exceed expectations"

For each detected phrase record: the phrase, the full sentence it appears in, and a reason why it reduces informational value.

SCORING IMPACT RULE: Each detected generic phrase applies a penalty. 1–2 phrases: minor penalty to cliche_density. 3–5 phrases: moderate penalty to cliche_density, lexical_diversity, information_gain, and entropy_score. 6+ phrases: strong penalty across all four — content with this many clichés must be considered low entropy regardless of other qualities.

When rewriting or generating, replace every detected generic phrase with: specific technical explanations, practical insights, measurable details, or real-world examples.

## STEP 1 — CLAIM VERIFIABILITY & EVIDENCE PASS (run SECOND, before scoring)
Scan the content for statements that make claims without sufficient evidence, specificity, or credibility signals. Detect claims in these four categories:

1. **Absolute Claims** — assert superiority, perfection, or certainty without evidence: "best in town", "number one provider", "most advanced method", "guaranteed results", "unmatched quality", "leading company", "top solution". These are unverifiable and reduce credibility.

2. **Statistical Claims** — include numbers/data but lack context or source: "99% stain removal rate", "trusted by thousands of customers", "over 20 years of experience", "serving hundreds of homeowners". Should include clarifying details or context.

3. **Authority Claims** — imply expertise but lack specific credentials or identifiable entities: "industry experts", "professional technicians", "certified specialists", "highly trained team", "experienced professionals". Should reference specific certifications, organizations, tools, or training standards. Example fix: "certified technicians" → "IICRC-certified carpet cleaning technicians trained in hot water extraction and fiber-safe cleaning methods."

4. **Process Claims** — describe a process but remain vague: "advanced cleaning techniques", "modern equipment", "cutting-edge methods", "innovative solutions". Should include specific technical detail. Example fix: "We use advanced cleaning methods." → "We use truck-mounted hot water extraction systems that inject heated water into carpet fibers and extract embedded dust, allergens, and residue."

SCORING IMPACT RULE: Each unverifiable claim applies a penalty to: nuance_preservation, technical_precision, first_party_evidence, entity_coherence. 1–2 claims: minor penalty. 3–5 claims: moderate penalty. 6+ claims: strong penalty — content with this many unsupported claims must receive lower credibility scores.

When rewriting or generating, replace weak claims with: specific explanations, measurable details, identifiable entities, real processes, and experience-based insights. Avoid exaggerated language unless clearly supported by context or evidence.

## 12-DIMENSION FRAMEWORK
Score each dimension 1–10:
1. Lexical Diversity – Vocabulary variety, precise terminology.
2. Syntactic Burstiness – Sentence structure variety.
3. Semantic Drift – Topic depth & contextual expansion.
4. Information Gain – New/useful information provided.
5. Cliché Density – Inverse score; high = minimal clichés.
6. Idiomatic Regionalism – Local context beyond just city name.
7. Proper Noun Density – Named entities: brands, certifications, suburbs, materials.
8. Technical Precision – Specificity of technical info, standards, measurements.
9. Emotional Variance – Tonal variety: educational, advisory, narrative.
10. Nuance Preservation – Credibility, balanced realistic claims.
11. First-Party Evidence – Real-world examples, results, project anecdotes.
12. Entity Coherence – Clear brand identity, service area, credentials.

## FOUR ADVANCED CAPABILITIES (apply automatically where relevant)

### Feature 1 — Competitor Information Gain Analyzer
When competitor data is provided, identify:
- competitor_coverage: main topics competitors commonly discuss
- competitor_weakness_patterns: where competitor content is repetitive, generic, overly promotional, or lacks depth
- information_gain_opportunities: specific content additions that would make content more valuable (deeper explanations, practical advice, technical insights, regional considerations, problem scenarios, expert commentary, frequently misunderstood topics)

### Feature 2 — Experience Signal Generator
When generating or rewriting, incorporate experience signals:
- Real-world scenarios with named locations, products, measurements
- Project examples with specific outcomes
- Problem-solving situations with tools/materials named
- Measurable results and lessons learned
Transform generic statements into experience-informed insights.
Example: "We use professional equipment" → "In a recent [City] job, [specific issue] was resolved using [named equipment] operating at [specific parameter]."
Experience signals boost: first_party_evidence, technical_precision, proper_noun_density, nuance_preservation.

### Feature 3 — Entropy Heatmap
When analyzing content, evaluate paragraph-by-paragraph:
- Label each paragraph: "high" (🟢), "moderate" (🟡), or "low" (🔴)
- For moderate/low paragraphs, provide a short "issue" and "improvement" suggestion
Return as entropy_heatmap array.

### Feature 4 — Local Authority Builder
When location context is available, enhance content with:
- Environmental and climate conditions
- Regional materials or building styles
- Local seasonal patterns and challenges
- Geography-specific problems
Only apply when meaningful. Do not force location mentions that add no value.

## PRODUCT & BRAND ACCURACY RULE (CRITICAL)
NEVER invent, fabricate, or assume product names, brand names, model numbers, certifications, or specifications that are not explicitly provided in the client context or content.
- Only mention real, verifiable products and brands that you have high confidence exist.
- If a product detail or brand is not provided and you are uncertain whether it exists, use a generic but descriptive reference instead (e.g., "nylon-blend broadloom carpet" rather than inventing a brand name).
- If certifications or standards are mentioned (e.g., "IICRC-certified"), only include them if they are real industry standards you can confirm exist.
- When in doubt, omit the specific name and describe the type/category of product instead.
- This rule applies to: product models, brand names, chemical formulas, certification bodies, equipment models, software names.

## ENTROPY SCORE (0–100)
0–40: generic/templated | 41–70: moderate | 71–100: original, expert

Always respond with valid JSON only. No markdown, no extra text.`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { mode, content, topic, context_notes, competitor_content, location, client_name, content_type } = body;

        const clientContext = `Client: ${client_name || 'Unknown'}
Content Type: ${content_type || 'General'}
${location ? `Location/Service Area: ${location}` : ''}
${context_notes ? `Context: ${context_notes}` : ''}
${competitor_content ? `Competitor Content / SERP Data:\n"""\n${competitor_content}\n"""` : ''}`;

        let userPrompt = '';

        if (mode === 'analyze') {
            userPrompt = `## ANALYZE THIS CONTENT

${clientContext}

Content to analyze:
"""
${content}
"""

${FRAMEWORK_INSTRUCTIONS}

Analyze using the full 12-dimension framework plus all four advanced capabilities.

Return JSON:
{
  ${GENERIC_PHRASE_SCHEMA},
  ${CLAIM_VERIFIABILITY_SCHEMA},
  "entropy_score": <number 0-100>,
  "dimension_scores": ${DIMENSION_SCORES_SCHEMA},
  "top_problems": ["<problem 1>", "<problem 2>", "<problem 3>"],
  "rewrite_strategy": "<paragraph explaining how to improve this content>",
  "entropy_heatmap": [
    { "paragraph": "<first ~50 chars of paragraph>", "level": "high|moderate|low", "issue": "<null if high, otherwise brief issue>", "improvement": "<null if high, otherwise brief suggestion>" }
  ],
  "competitor_analysis": ${competitor_content ? `{
    "competitor_coverage": ["<topic 1>", "<topic 2>"],
    "competitor_weakness_patterns": ["<weakness 1>", "<weakness 2>"],
    "information_gain_opportunities": ["<opportunity 1>", "<opportunity 2>", "<opportunity 3>"]
  }` : 'null'},
  "local_authority_suggestions": ${location ? `["<suggestion 1>", "<suggestion 2>"]` : 'null'}
}`;

        } else if (mode === 'generate') {
            userPrompt = `## GENERATE CONTENT

${clientContext}

Topic: ${topic}

${FRAMEWORK_INSTRUCTIONS}

Generate high-quality content applying all four advanced capabilities:
- Embed experience signals naturally (specific projects, named tools, measurable outcomes)
- Apply local authority enhancements if location is provided (climate, regional challenges, geography)
- Use competitor information gain opportunities if competitor data is provided
- Avoid generic marketing copy. Score 7+ on every dimension and 70+ entropy.
- TARGET LENGTH: 600–700 words for the generated content body. Do not go shorter.
${content_type === 'Blog Post' ? `
BLOG POST REQUIREMENTS:
- Open with a 2–3 sentence summary paragraph (labeled "Overview" or as a natural intro paragraph) that tells the reader exactly what the blog covers and why it matters. This goes BEFORE the main body.
- Include a "Frequently Asked Questions" section near the bottom with EXACTLY 3–5 specific, high-quality questions (no more than 5).
- Questions must cover: practical concerns, local context, pricing, technical details, or comparisons.
- Format: Q: [question] / A: [detailed answer]
- End with a strong, specific Call to Action (CTA) paragraph after the FAQ section. The CTA must reference the client/business name and include a clear next step (e.g., "Call us today", "Book a free measure and quote", "Get in touch"). Make it action-oriented and relevant to the content.
- CONTENT VARIETY — use these formatting elements where they genuinely improve clarity and readability:
  • Bullet point lists: use for steps, features, options, or comparisons (3+ items).
  • Numbered lists: use for sequential processes or ranked recommendations.
  • Key Takeaways box: include a short "Key Takeaways" section (3–5 bullet points) summarizing the most important points — place it after the intro summary or at the end before the FAQ.
  • Comparison tables: use markdown table format (| Col | Col |) when comparing products, options, materials, price ranges, or pros/cons — only when a table genuinely adds value.
  • Vary paragraph length — mix short punchy paragraphs with more detailed explanatory ones.
  • Do NOT force every element into every blog — use judgment based on topic. A how-to article suits numbered steps; a product comparison suits a table; a tips article suits bullet points.
` : ''}
Return JSON:
{
  ${GENERIC_PHRASE_SCHEMA},
  ${CLAIM_VERIFIABILITY_SCHEMA},
  "final_content": "<the full generated content>",
  "entropy_score": <number 70-100>,
  "dimension_scores": ${DIMENSION_SCORES_SCHEMA},
  "experience_signals_used": ["<signal 1>", "<signal 2>"],
  "local_authority_elements": ${location ? `["<element 1>", "<element 2>"]` : 'null'},
  "competitor_analysis": ${competitor_content ? `{
    "competitor_coverage": ["<topic 1>"],
    "competitor_weakness_patterns": ["<weakness 1>"],
    "information_gain_opportunities": ["<opportunity 1>", "<opportunity 2>"]
  }` : 'null'}
}`;

        } else if (mode === 'rewrite') {
            userPrompt = `## REWRITE CONTENT

${clientContext}

Original content:
"""
${content}
"""

${FRAMEWORK_INSTRUCTIONS}

Steps:
1. Evaluate the original content
2. Identify weaknesses using all 12 dimensions + entropy heatmap
3. Rewrite applying all four advanced capabilities:
   - Inject experience signals (real scenarios, named tools, measurable outcomes) — but LIMIT to a MAXIMUM of 1–2 experience signal references per page. Do NOT cite the business name or a real-life example in every paragraph. Spread them sparingly and only where they add the most value.
   - Add local authority context if location is provided
   - Use information gain opportunities identified from competitors or gaps
   - Eliminate clichés, add technical precision, improve sentence variation, strengthen entity signals

CRITICAL REWRITE RULES:
A. TEMPLATE PRESERVATION — The original content has a defined page structure (sections, headings, and order). You MUST preserve ALL existing sections and their order. Do NOT skip, merge, or reorder sections. If the original has 6 sections, the rewrite must have 6 sections with the same headings. Only improve the copy within each section.
B. FORMATTING — Actively use structured formatting where it genuinely improves readability:
   - Bullet point lists (- item) for: features, benefits, options, process steps (3+ items)
   - Numbered lists for: sequential processes, ranked tips
   - Markdown tables (| Col | Col |) for: product comparisons, option comparisons, pros/cons — only when a table genuinely adds value
   - Mix short punchy paragraphs with more detailed explanatory ones
   - Do NOT force formatting into every section — use judgment
C. EXPERIENCE SIGNALS — Maximum 1–2 real-life examples in the entire rewritten page. Do NOT insert a business name citation or example every 1–2 paragraphs.

Return JSON:
{
  ${GENERIC_PHRASE_SCHEMA},
  ${CLAIM_VERIFIABILITY_SCHEMA},
  "original_entropy_score": <number>,
  "original_dimension_scores": ${DIMENSION_SCORES_SCHEMA},
  "top_problems": ["<problem 1>", "<problem 2>", "<problem 3>"],
  "entropy_heatmap": [
    { "paragraph": "<first ~50 chars>", "level": "high|moderate|low", "issue": "<null if high>", "improvement": "<null if high>" }
  ],
  "final_content": "<the full rewritten content>",
  "new_entropy_score": <number>,
  "new_dimension_scores": ${DIMENSION_SCORES_SCHEMA},
  "experience_signals_used": ["<signal 1>", "<signal 2>"],
  "local_authority_elements": ${location ? `["<element 1>", "<element 2>"]` : 'null'},
  "competitor_analysis": ${competitor_content ? `{
    "competitor_coverage": ["<topic 1>"],
    "competitor_weakness_patterns": ["<weakness 1>"],
    "information_gain_opportunities": ["<opportunity 1>", "<opportunity 2>"]
  }` : 'null'}
}`;
        } else if (mode === 'apply_recommendations') {
            const { generic_phrases, claims, top_problems, rewrite_strategy } = body;
            userPrompt = `## APPLY RECOMMENDATIONS TO CONTENT

${clientContext}

Original content:
"""
${content}
"""

The following issues were detected by the framework. Apply ALL of them to produce improved content:

${generic_phrases?.length ? `### Generic Phrases to Replace:
${generic_phrases.map(p => `- "${p.phrase}" — ${p.reason}`).join('\n')}` : ''}

${claims?.length ? `### Unverifiable Claims to Fix:
${claims.map(c => `- [${c.claim_type}] "${c.claim}" → ${c.suggested_improvement}`).join('\n')}` : ''}

${top_problems?.length ? `### Top Problems to Address:
${top_problems.map(p => `- ${p}`).join('\n')}` : ''}

${rewrite_strategy ? `### Rewrite Strategy:\n${rewrite_strategy}` : ''}

${FRAMEWORK_INSTRUCTIONS}

Instructions:
- Apply every fix listed above. Replace every generic phrase with specific, technical, measurable alternatives.
- Fix every unverifiable claim using the suggested improvements.
- TEMPLATE PRESERVATION: Preserve the EXACT original content structure — all sections, headings, and their order must remain intact. Only improve the copy within each section. Do NOT skip, merge, or reorder any sections.
- Do NOT add new sections or drastically expand the content unless the rewrite strategy requires it.
${content_type === 'Blog Post' ? `- Ensure the blog has: (1) an Overview/intro summary at the start, (2) max 5 FAQs, (3) a CTA paragraph at the end referencing the client/business.` : ''}
- FORMATTING: Use bullet points, numbered lists, or markdown tables where they genuinely improve readability (features, steps, comparisons). Do not leave everything as plain paragraphs if lists would serve the reader better.
- EXPERIENCE SIGNALS: Limit real-life business examples to a maximum of 1–2 per page. Do NOT reference the business name or a specific example in every paragraph.
- Score 7+ on all dimensions and 70+ entropy.

Return JSON:
{
  ${GENERIC_PHRASE_SCHEMA},
  ${CLAIM_VERIFIABILITY_SCHEMA},
  "final_content": "<the full improved content>",
  "entropy_score": <number 0-100>,
  "dimension_scores": ${DIMENSION_SCORES_SCHEMA},
  "improvements_applied": ["<brief description of each change made>"]
}`;

        } else {
            return Response.json({ error: 'Invalid mode. Use: analyze, generate, rewrite, apply_recommendations' }, { status: 400 });
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