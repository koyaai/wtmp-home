import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { questionnaire: q, client_context: cc } = await req.json();
    if (!q?.city || !q?.product_type) {
      return Response.json({ error: 'city and product_type are required' }, { status: 400 });
    }

    const clientContext = cc ? `
<client_business_context>
Business Name: ${cc.name}
Location: ${cc.location || ''}
Website: ${cc.website || ''}
Active Services: ${(cc.services || []).join(', ') || ''}
Program Tier: ${cc.program || ''}
Internal Notes: ${cc.notes || ''}
</client_business_context>
Use the above context to ensure the generated content aligns with this client's brand, service area, and positioning.
` : '';

    const prompt = `You are an expert SEO copywriter specializing in home improvement and outdoor installation businesses. Generate a professional project page / case study for a completed awning or shade installation project.

<project_details>
Location: ${q.city}, ${q.state || ''}
Project Type: ${q.residential_or_commercial || 'commercial'} — ${q.property_type || ''}
Client Goal / Problem: ${q.client_goal || ''}
Product Installed: ${q.product_type}
Material: ${q.material || ''}
Color / Finish: ${q.color || ''}
Special Features: ${q.special_features || ''}
Size / Dimensions: ${q.dimensions || ''}
Brand / Product Line: ${q.brand || ''}
Problem Solved: ${q.problem_solved || q.client_goal || ''}
Before & After Story: ${q.before_after || ''}
Benefits After Installation: ${q.benefits || ''}
Project Cost: ${q.project_cost || ''}
Company Name: ${q.company_name || ''}
Service Areas: ${q.service_areas || q.city}
Contact / Scheduling URL: ${q.contact_url || ''}
</project_details>

${clientContext}

<writing_rules>
1. NEVER use: "high quality", "best in class", "world class", "top-notch", "state-of-the-art", "second to none"
2. Write in a confident, professional but warm tone — like an experienced contractor talking to a homeowner
3. Use second person ("you", "your space") in the CTA section
4. Every claim must be concrete and specific — tie benefits to actual project details
5. Naturally incorporate the city name for local SEO throughout the content
6. Do NOT invent brand names, certifications, or specs that are not provided
7. Use ## for main section headers, ### for feature sub-sections within the product section
8. Use bullet points with **bold labels** for the features list (like the example below)
9. Length: 400–550 words total body content
</writing_rules>

<page_structure>
Generate this exact structure:

1. **page_title** — Compelling, SEO-friendly title (pattern: "[Outcome]: [Product] Installation in [City], [State]" — e.g. "Maximizing Employee Comfort: Retractable Awning Installation in Placentia, CA")

2. **meta_description** — 150 chars max, includes city, product keyword

3. **intro_paragraph** — 2–3 sentences. Hook with the client's problem/goal, set the scene, hint at the solution. Do NOT mention the solution details yet — build anticipation.

4. **solution_section** — Titled "## A [Descriptive Adjective] [Product Type] Solution for [Goal/Context]"
   - 1–2 sentences introducing why this specific product was recommended and what it achieves beyond just coverage.

5. **features_list** — Titled "### Smart Features Designed for [Use Case]" (e.g. "Daily Use", "Year-Round Comfort")
   - Bullet list with **bold feature name** followed by a colon and 1–2 sentence description. Only include features that were actually provided in the project details. Features to cover based on what's provided: material/fabric, LED lighting (if applicable), adjustable pitch/slope (if applicable), motorized operation (if applicable), cassette housing (if applicable), dimensions/sizing. Do NOT invent features not mentioned.

6. **results_section** — Titled "## Project Highlights: [Short Outcome Phrase]"
   - 2 paragraphs. First: what was installed and immediate transformation. Second: the lasting benefits and client reaction. Include the project cost as a bolded line at the end: **Project Cost:** **USD [amount]** (skip if not provided)

7. **before_after_section** — Titled "## Before & After: [Short Descriptive Phrase]"
   - 2–3 sentences describing the transformation in vivid, tangible terms. Paint a picture of what the space looked like before vs. after.

8. **cta_section** — Titled "## Bring [Benefit] to Your Space" (e.g. "Bring Comfort and Quality to Your Space")
   - 2–3 sentences. Reference the company name, product type, city/service area, and include a clear CTA pointing to the contact URL. End with an action-oriented closing line.

9. **slug_suggestion** — URL slug suggestion (pattern: [city-state]-[product-type]-[brief-descriptor], all lowercase, hyphens, no special chars — e.g. "placentia-ca-retractable-awning-employee-shade")
</page_structure>

Return JSON only — no markdown wrapper, no extra text:
{
  "page_title": "...",
  "meta_description": "...",
  "intro_paragraph": "...",
  "solution_section": "...",
  "features_list": "...",
  "results_section": "...",
  "before_after_section": "...",
  "cta_section": "...",
  "slug_suggestion": "..."
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          page_title: { type: 'string' },
          meta_description: { type: 'string' },
          intro_paragraph: { type: 'string' },
          solution_section: { type: 'string' },
          features_list: { type: 'string' },
          results_section: { type: 'string' },
          before_after_section: { type: 'string' },
          cta_section: { type: 'string' },
          slug_suggestion: { type: 'string' },
        },
        required: ['page_title', 'intro_paragraph', 'solution_section', 'features_list', 'results_section', 'cta_section']
      }
    });

    return Response.json({ page: result?.response ?? result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});