import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function buildPrompt(q, pageKey, pageName) {
  const products = [
    q.wood_blinds && 'Wood Blinds', q.faux_wood_blinds && 'Faux Wood Blinds', q.vertical_blinds && 'Vertical Blinds',
    q.roller_shades && 'Roller Shades', q.roman_shades && 'Roman Shades', q.woven_wood_shades && 'Woven Wood Shades', q.honeycomb_shades && 'Honeycomb/Cellular Shades',
    q.plantation_shutters && 'Plantation Shutters', q.wood_shutters && 'Wood Shutters', q.composite_shutters && 'Composite Shutters', q.vinyl_shutters && 'Vinyl Shutters',
    q.draperies && 'Custom Draperies', q.motorization && 'Motorized Window Treatments',
  ].filter(Boolean).join(', ');

  const services = [
    q.in_home_consultation && 'Complimentary In-Home Consultation',
    q.measuring_installation && 'Custom Measuring & Professional Installation',
    q.new_construction && 'New Home Construction Planning',
    q.redesign && 'Redesign & Refresh',
    q.motorization && 'Motorization & Smart Home Integration',
  ].filter(Boolean).join(', ');

  const usps = (q.usps || []).filter(u => u).map((u, i) => `${i + 1}. ${u}`).join('\n') || 'Professional installation, Custom solutions, Local expertise';
  const cta = q.primary_cta || 'Schedule a complimentary in-home consultation';

  const pageInstructions = {
    home: `H1: "Custom Window Treatments in ${q.city}"\n1. Hero intro (2-4 sentences: business name, what they offer, local lifestyle angle)\n2. [GLOBAL TRUST SECTION]\n3. ## Why ${q.city} Residents Choose Custom Window Treatments — local climate pain points, then 4-5 benefit bullets\n4. ## Our Window Treatment Collections — brief intro + ### subsection per category: ${products}\n5. ## Our Services — 2 sentence intro + brief desc of each service\n6. ## Ready to Transform Your ${q.city} Home? — CTA`,
    about: `H1: "About ${q.business_name}${q.tagline ? ': ' + q.tagline : ''}"\n1. Hero: ${q.years_in_business ? q.years_in_business + ' helping' : 'Helping'} ${q.city} homeowners...\n2. [GLOBAL TRUST SECTION]\n3. ## ${q.city}'s Trusted Window Treatment Company\n4. ## Our Process — ### In-Home Consultation → ### Design & Selection → ### Precise Measuring → ### Professional Installation → ### Lasting Support\n5. ## Our Commitment to ${q.city} Homeowners\n6. CTA`,
    products: `H1: "Custom Window Treatments in ${q.city}, ${q.state}"\n1. Intro: everything they design and install\n2. [GLOBAL TRUST SECTION]\n3. ## Why Choose Window Treatments for Your ${q.city} Spaces\n4. ## Our Window Treatment Collections — ### per category with 2-3 sentences each\n5. CTA`,
    services: `H1: "Custom Window Treatment Services in ${q.city}, ${q.state}"\n1. Intro: services designed around how you live in ${q.city}\n2. [GLOBAL TRUST SECTION]\n3. ## Smarter Solutions for Modern ${q.city} Homes\n4. ## [Service name] section for EACH service\n5. ## What to Expect — step-by-step process\n6. CTA`,
    service_areas: `H1: "Our Service Areas"\n1. Intro: serving ${q.cities_served || q.city}\n2. [GLOBAL TRUST SECTION]\n3. ## A Local Legacy You Can Trust\n4. ## [City Name] section for EACH city/area in cities served\n5. CTA`,
    gallery: `SHORT BLURBS ONLY — no [GLOBAL TRUST SECTION]:\n- ### Gallery Intro (3-4 sentences)\n- ### Gallery CTA (2-3 sentences)\n- ### Projects Intro (3-4 sentences)\n- ### Projects CTA (2-3 sentences)`,
    new_construction: `H1: "New Home Construction Window Treatments in ${q.city}"\n1. Intro: building opportunity + partnership\n2. [GLOBAL TRUST SECTION]\n3. ## Thoughtful Planning from the Start\n4. ## Benefits of Planning Early — bullet list\n5. ## Who We Work With — ### Homeowners / ### Builders / ### Interior Designers\n6. ## Our New Construction Process\n7. CTA`,
    motorization: `H1: "Motorized Window Treatments in ${q.city}"\n1. Intro: control with touch of button + local relevance\n2. [GLOBAL TRUST SECTION]\n3. ## Modern Control for ${q.city} Living\n4. ## Why Choose Motorization — bullet benefits\n5. ## Compatible Products\n6. ## Integration Options\n7. CTA`,
    blinds: `H1: "Custom Blinds in ${q.city}, ${q.state}"\nProduct category page for blinds collection. Include: hook, [GLOBAL TRUST SECTION], why blinds work in ${q.city} climate, ### sub-section per blind type offered (${[q.wood_blinds && 'Wood Blinds', q.faux_wood_blinds && 'Faux Wood Blinds', q.vertical_blinds && 'Vertical Blinds'].filter(Boolean).join(', ')}), process, CTA`,
    shades: `H1: "Custom Shades in ${q.city}, ${q.state}"\nProduct category page for shades collection. Include: hook, [GLOBAL TRUST SECTION], why shades work in ${q.city} climate, ### sub-section per shade type offered (${[q.roller_shades && 'Roller Shades', q.roman_shades && 'Roman Shades', q.woven_wood_shades && 'Woven Wood Shades', q.honeycomb_shades && 'Honeycomb/Cellular Shades'].filter(Boolean).join(', ')}), process, CTA`,
    shutters: `H1: "Custom Shutters in ${q.city}, ${q.state}"\nProduct category page for shutters collection. Include: hook, [GLOBAL TRUST SECTION], why shutters work in ${q.city} climate, ### sub-section per shutter type offered (${[q.plantation_shutters && 'Plantation Shutters', q.wood_shutters && 'Wood Shutters', q.composite_shutters && 'Composite Shutters', q.vinyl_shutters && 'Vinyl Shutters'].filter(Boolean).join(', ')}), process, CTA`,
    draperies: `H1: "Custom Draperies in ${q.city}, ${q.state}"\nProduct page for custom draperies. Include: hook, [GLOBAL TRUST SECTION], why draperies work in ${q.city} homes, features & fabric options, process, CTA`,
    wood_blinds: `H1: "Timeless Wood Blinds in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why wood blinds for ${q.city} climate, features (hardwood slats, stains, slat widths), process, CTA`,
    faux_wood_blinds: `H1: "Custom Faux Wood Blinds in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why faux wood for ${q.city} climate, features (PVC, moisture resistance), process, CTA`,
    vertical_blinds: `H1: "Vertical Blinds in ${q.city}, ${q.state}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why vertical blinds for ${q.city} spaces, features (vane materials, track systems), process, CTA`,
    roller_shades: `H1: "Custom Roller Shades in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why roller shades for ${q.city}, features (fabric opacity options), process, CTA`,
    roman_shades: `H1: "Custom Roman Shades in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why roman shades for ${q.city}, features (fold styles, fabrics), process, CTA`,
    woven_wood_shades: `H1: "Natural Woven Wood Shades in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why woven wood for ${q.city}, features (bamboo, reeds, grasses), process, CTA`,
    honeycomb_shades: `H1: "Honeycomb Cellular Shades in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why honeycomb shades for ${q.city} climate (insulation), features (single/double/triple cell), process, CTA`,
    plantation_shutters: `H1: "Plantation Shutters in ${q.city}, ${q.state}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why plantation shutters for ${q.city}, features (hardwood, louver options), process, CTA`,
    wood_shutters: `H1: "Custom Wood Shutters in ${q.city}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why wood shutters for ${q.city}, features (hardwood, louver options), process, CTA`,
    composite_shutters: `H1: "Composite Shutters in ${q.city}, ${q.state}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why composite shutters for ${q.city} climate, features (moisture-resistant materials), process, CTA`,
    vinyl_shutters: `H1: "Durable Vinyl Shutters in ${q.city}, ${q.state}"\nIndividual product page. Include: hook, [GLOBAL TRUST SECTION], why vinyl shutters for ${q.city} climate, features (PVC, coast resistance), process, CTA`,
  };

  const pageInstruction = pageInstructions[pageKey] || `Full page for: ${pageName}. Include hook, [GLOBAL TRUST SECTION], relevant sections, CTA.`;

  return `You are an expert SEO copywriter for window treatment businesses. Generate professional website copy for ONE page: "${pageName}" (key: ${pageKey}).

<client>
Business Name: ${q.business_name}
City: ${q.city}
State: ${q.state || ''}
Cities Served: ${q.cities_served || q.city}
Years in Business: ${q.years_in_business || 'established'}
Tagline: ${q.tagline || ''}
Primary CTA: ${cta}
Climate/Environment: ${q.climate_description || 'residential market'}
Brands Carried: ${q.brands_carried || 'leading manufacturers'}
Products Offered: ${products}
Services Offered: ${services}
Key USPs:
${usps}
Additional Info: ${q.additional_info || 'none'}
</client>

<writing_rules>
1. NEVER use: "high quality", "best in class", "world class", "top-notch", "state-of-the-art"
2. Tie product/service benefits to local climate or lifestyle — but LIMIT the city name to appearing naturally 1–2 times per section maximum. Do NOT repeat the city in every sentence or subheading.
3. Mention cities served in body text once or twice per page — not in every paragraph.
4. Use second person: "you", "your home" throughout
5. Every claim must be concrete and specific — no vague superlatives
6. Use ## for main section headers, ### for sub-sections
7. SUBHEADING VARIETY — vary the structure and tone of subheadings across each page. Do NOT repeat the pattern "[City] + noun" more than once per page. Mix question-style ("Which Option Fits Your Space?"), benefit-led ("Protection That Works Year-Round"), action-led ("Choose Your Style"), and descriptive headings naturally.
8. DO NOT use em-dashes (—) anywhere in the content. Use commas, colons, periods, or rewrite the sentence instead.
9. End every full page with a CTA section that includes "${cta}" — write a compelling, specific 3–4 sentence CTA that: names a clear next step, explains what happens when they reach out (e.g. "we'll visit your home, take precise measurements, and walk you through every option"), and ends with urgency or warmth. Avoid generic "contact us today" language.
10. After the hero intro paragraph on every full page (NOT Gallery), place the exact text: [GLOBAL TRUST SECTION]
11. Length: 400–600 words body content for full pages; 50–100 words per blurb for Gallery
12. PLAIN LANGUAGE — avoid unnecessarily complex or decorative vocabulary. Write conversationally. If a simpler word works, use it.
</writing_rules>

<page_instructions>
${pageInstruction}
</page_instructions>

Return the page with: page_key (= "${pageKey}"), page_name (= "${pageName}"), h1, meta_description (150 chars max, includes ${q.city} and product keyword), and content (full markdown body).`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { questionnaire, page_key, page_name } = await req.json();
    if (!questionnaire?.business_name || !questionnaire?.city || !page_key || !page_name) {
      return Response.json({ error: 'questionnaire, page_key, and page_name are required' }, { status: 400 });
    }

    const prompt = buildPrompt(questionnaire, page_key, page_name);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5',
      response_json_schema: {
        type: 'object',
        properties: {
          page_key: { type: 'string' },
          page_name: { type: 'string' },
          h1: { type: 'string' },
          meta_description: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['page_key', 'page_name', 'h1', 'content']
      }
    });

    return Response.json({ page: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});