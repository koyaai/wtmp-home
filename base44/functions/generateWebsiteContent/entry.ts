import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildPageList(q) {
  const pages = [
    { key: 'home', name: 'Home Page' },
    { key: 'about', name: 'About Us Page' },
    { key: 'products', name: 'Products Overview Page' },
    { key: 'services', name: 'Services Overview Page' },
    { key: 'service_areas', name: 'Service Areas Page' },
    { key: 'gallery', name: 'Gallery Page' },
    { key: 'projects', name: 'Our Projects Page' },
    { key: 'testimonials', name: 'What Our Clients Say Page' },
    { key: 'faq', name: 'FAQ Page' },
  ];
  if (q.new_construction) pages.push({ key: 'new_construction', name: 'New Home Construction Page' });
  if (q.motorization) pages.push({ key: 'motorization', name: 'Motorized Window Treatments Page' });

  const hasBlind = q.wood_blinds || q.faux_wood_blinds || q.vertical_blinds;
  if (hasBlind) {
    pages.push({ key: 'blinds', name: 'Blinds Overview Page' });
    if (q.wood_blinds) pages.push({ key: 'wood_blinds', name: 'Wood Blinds Page' });
    if (q.faux_wood_blinds) pages.push({ key: 'faux_wood_blinds', name: 'Faux Wood Blinds Page' });
    if (q.vertical_blinds) pages.push({ key: 'vertical_blinds', name: 'Vertical Blinds Page' });
  }
  const hasShade = q.roller_shades || q.roman_shades || q.woven_wood_shades || q.honeycomb_shades;
  if (hasShade) {
    pages.push({ key: 'shades', name: 'Shades Overview Page' });
    if (q.roller_shades) pages.push({ key: 'roller_shades', name: 'Roller Shades Page' });
    if (q.roman_shades) pages.push({ key: 'roman_shades', name: 'Roman Shades Page' });
    if (q.woven_wood_shades) pages.push({ key: 'woven_wood_shades', name: 'Woven Wood Shades Page' });
    if (q.honeycomb_shades) pages.push({ key: 'honeycomb_shades', name: 'Honeycomb/Cellular Shades Page' });
  }
  const hasShutter = q.plantation_shutters || q.wood_shutters || q.composite_shutters || q.vinyl_shutters;
  if (hasShutter) {
    pages.push({ key: 'shutters', name: 'Shutters Overview Page' });
    if (q.plantation_shutters) pages.push({ key: 'plantation_shutters', name: 'Plantation Shutters Page' });
    if (q.wood_shutters) pages.push({ key: 'wood_shutters', name: 'Wood Shutters Page' });
    if (q.composite_shutters) pages.push({ key: 'composite_shutters', name: 'Composite Shutters Page' });
    if (q.vinyl_shutters) pages.push({ key: 'vinyl_shutters', name: 'Vinyl Shutters Page' });
  }
  if (q.draperies) pages.push({ key: 'draperies', name: 'Custom Draperies Page' });
  return pages;
}

function buildPrompt(q) {
  const pages = buildPageList(q);
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

  return `You are an expert SEO copywriter for window treatment businesses. Generate professional, locally-specific website copy for ALL ${pages.length} pages listed. Each full page: 400–600 words body content. Gallery: short blurbs only.

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
CRITICAL – apply to EVERY page:
1. NEVER use: "high quality", "best in class", "world class", "top-notch", "state-of-the-art"
2. ALWAYS tie every product/service benefit to local climate or lifestyle (use the climate description)
3. ALWAYS mention the specific cities served naturally in body text
4. Use second person: "you", "your home" throughout
5. Every claim must be concrete and specific – no vague superlatives
6. Use ## for main section headers, ### for sub-sections
7. End every full page with a CTA section that includes "${cta}"
8. After the hero intro paragraph on every full page (NOT Gallery), place the exact text: [GLOBAL TRUST SECTION]
   This is a placeholder for a 3-column trust block the web team will insert.
9. Length: 400–600 words body content for full pages; 50–100 words per blurb for Gallery
</writing_rules>

<proven_opening_lines>
- "Light moves differently in [City]. The ocean reflects it. The mountains filter it." (shades)
- "Your windows deserve more than a temporary covering." (premium shutters/blinds)  
- "Building a new home in [City] is an opportunity to design every detail with intention." (new construction)
- "Control light, privacy, and comfort with the touch of a button." (motorization)
- "Bring [texture] and [benefit] into your home with [product] from [Business]." (specific products)
- "Refresh your space with custom [product] from [Business]. Designed to complement island interiors..." (shades/blinds)
Trust phrase: "thoughtfully selected, precisely measured, and professionally installed"
Process phrase: "From your first call to final installation..."
</proven_opening_lines>

<page_instructions>

HOME (key: home):
H1: "Custom Window Treatments in ${q.city}"
1. Hero intro (2-4 sentences: business name, what they offer, local lifestyle angle)
2. [GLOBAL TRUST SECTION]
3. ## Why ${q.city} Residents Choose Custom Window Treatments — local climate pain points, then 4-5 benefit bullets
4. ## Our Window Treatment Collections — brief intro + ### subsection per category: ${products}
5. ## Our Services — 2 sentence intro + brief desc of each service
6. ## Ready to Transform Your ${q.city} Home? — CTA

ABOUT (key: about):
H1: "About ${q.business_name}${q.tagline ? ': ' + q.tagline : ''}"
1. Hero: ${q.years_in_business ? q.years_in_business + ' helping' : 'Helping'} ${q.city} homeowners...
2. [GLOBAL TRUST SECTION]
3. ## ${q.city}'s Trusted Window Treatment Company — reputation, products overview, local knowledge
4. ## Our Process — ### In-Home Consultation → ### Design & Selection → ### Precise Measuring → ### Professional Installation → ### Lasting Support
5. ## Our Commitment to ${q.city} Homeowners — values, community, long-term relationships
6. CTA

PRODUCTS OVERVIEW (key: products):
H1: "Custom Window Treatments in ${q.city}, ${q.state}"
1. Intro: everything they design and install
2. [GLOBAL TRUST SECTION]
3. ## Why Choose Window Treatments for Your ${q.city} Spaces — local pain points (UV, heat, humidity, glare), then 4-5 benefit bullets
4. ## Our Window Treatment Collections — ### per category with 2-3 sentences each
5. CTA

SERVICES OVERVIEW (key: services):
H1: "Custom Window Treatment Services in ${q.city}, ${q.state}"
1. Intro: services designed around how you live in ${q.city}
2. [GLOBAL TRUST SECTION]
3. ## Smarter Solutions for Modern ${q.city} Homes — problem: large windows, management challenges; bullet list of how services solve it
4. ## [Service name] section for EACH service (consultation, installation, new construction if applicable, motorization if applicable, redesign if applicable)
5. ## What to Expect — step-by-step process
6. CTA

SERVICE AREAS (key: service_areas):
H1: "Our Service Areas"
1. Intro: serving ${q.cities_served || q.city}
2. [GLOBAL TRUST SECTION]
3. ## A Local Legacy You Can Trust — local roots, years of service, understanding local homes
4. ## [City Name] section for EACH city/area in cities served — 2-3 sentences per city
5. CTA

GALLERY (key: gallery) — SHORT BLURBS ONLY, no [GLOBAL TRUST SECTION]:
Four labeled short pieces:
- ### Gallery Intro (3-4 sentences about what the gallery shows, the variety of window treatment styles, and local home aesthetics in ${q.city})
- ### Gallery CTA (2-3 sentences inviting homeowners to imagine their own spaces and book a consultation)
- ### By Room Intro (2-3 sentences about how window treatments transform different rooms: living rooms, bedrooms, kitchens, home offices)
- ### Style Guide Intro (2-3 sentences about how the gallery showcases different styles from light-filtering to blackout, casual to elegant)

PROJECTS (key: projects) — SHORT BLURBS ONLY, no [GLOBAL TRUST SECTION]:
Five labeled short pieces:
- ### Projects Intro (3-4 sentences about the craftsmanship and care that goes into each ${q.business_name} installation, real homes in ${q.city} and surrounding areas)
- ### Projects Featured (3-4 sentences describing a sample featured project: the client's challenge, the solution chosen, and the outcome — make it vivid and specific to ${q.city} homes)
- ### Projects Process (2-3 sentences about the journey from consultation to final install, every detail handled by the team)
- ### Projects Materials (2-3 sentences about the quality of materials sourced from ${q.brands_carried || 'leading manufacturers'})
- ### Projects CTA (2-3 sentences encouraging visitors to start their own project with a free consultation)

NEW CONSTRUCTION (key: new_construction, if selected):
H1: "New Home Construction Window Treatments in ${q.city}"
1. Intro: building opportunity + partnership with homeowners/builders/designers
2. [GLOBAL TRUST SECTION]
3. ## Thoughtful Planning from the Start — why plan during construction, benefits: flexibility, clean lines, motorization integration
4. ## Benefits of Planning Early — bullet list
5. ## Who We Work With — ### Homeowners / ### Builders / ### Interior Designers
6. ## Our New Construction Process
7. CTA

MOTORIZATION (key: motorization, if selected):
H1: "Motorized Window Treatments in ${q.city}"
1. Intro: control with touch of button + local relevance
2. [GLOBAL TRUST SECTION]
3. ## Modern Control for ${q.city} Living — local architecture: large windows, sliding doors, open plans, bright sun
4. ## Why Choose Motorization — bullet benefits: convenience, hard-to-reach windows, smart home, energy, UV protection
5. ## Compatible Products — which of their products can be motorized
6. ## Integration Options — remote, app, smart home systems
7. CTA

PRODUCT CATEGORY PAGES (blinds, shades, shutters, draperies):
H1: "Custom [Category] in ${q.city}, ${q.state}"
PURPOSE: This is a CATEGORY OVERVIEW page. It introduces the category as a whole. Do NOT repeat the deep product-level detail covered on individual product pages. Think of it as a curated menu that helps homeowners understand which specific product within this category is right for them.
1. Compelling hook about this category's general strengths + local climate relevance
2. [GLOBAL TRUST SECTION]
3. ## Why [Category] Work So Well in ${q.city} Homes — category-level climate/lifestyle reasons (UV exposure, humidity, light management, privacy needs, architectural style)
4. ## Our [Category] Collection — ### sub-section per specific product type within this category offered by this client. Each sub-section: 2-3 sentences giving a high-level description of that specific product and who it's best for. Use the product's proper name (e.g. "Roller Shades", "Roman Shades"). Mention ${q.brands_carried || 'leading manufacturers'}. Do NOT repeat the full features list — save that for the individual product page.
5. ## How to Choose the Right [Category] — 3-4 practical tips to help a homeowner narrow down which specific option suits their room, lifestyle, and budget
6. ## What to Expect — process specific to this category
7. CTA

INDIVIDUAL PRODUCT PAGES (wood_blinds, faux_wood_blinds, vertical_blinds, roller_shades, roman_shades, woven_wood_shades, honeycomb_shades, plantation_shutters, wood_shutters, composite_shutters, vinyl_shutters):
H1 pattern: "[Descriptor] [Specific Product] in ${q.city}[, ${q.state}]"
Examples: "Timeless Wood Blinds in [City]", "Custom Roller Shades in [City]", "Durable Vinyl Shutters in [City], [State]"
1. Compelling hook unique to THIS specific product + local angle (e.g. reference the exact climate, architecture, or lifestyle reason this product suits ${q.city} homeowners)
2. [GLOBAL TRUST SECTION]
3. ## [Specific Product] for ${q.city} Homes — go deep on WHY this exact product (not the category) suits the local climate, light conditions, and lifestyle
4. ## Features & Options — be very specific to this product only:
   - Wood Blinds → hardwood species options, stain/paint colors, slat widths (1", 2", 2.5"), tilt mechanisms, lift options
   - Faux Wood Blinds → PVC/composite composition, moisture & warp resistance, paintable/woodgrain options, slat widths
   - Vertical Blinds → vane materials (fabric, vinyl, PVC), vane widths, track systems, sliding door applications
   - Roller Shades → fabric types (sheer/light-filtering/room-darkening/blackout), opacity percentages, hem bar styles, fascia options
   - Roman Shades → fold styles (flat, hobbled, relaxed, waterfall), fabric options, lining choices (unlined/privacy/blackout)
   - Woven Wood Shades → natural materials (bamboo, jute, reeds, grasses, rattan), weave densities, privacy liner options
   - Honeycomb/Cellular Shades → single/double/triple cell options, cell size (3/8", 1/2", 3/4"), opacity, top-down/bottom-up
   - Plantation Shutters → louver sizes (2.5", 3.5", 4.5"), frame styles (L-frame, Z-frame, café style), tilt bar options
   - Wood Shutters → hardwood species, stain/paint finishes, louver and frame options, custom sizing
   - Composite Shutters → moisture-resistant materials, interior painting/staining, coastal humidity performance
   - Vinyl Shutters → full PVC construction, moisture/fade/salt-air resistance, louver sizes, ideal for high-humidity rooms
5. ## What to Expect — the installation process specific to this product type (how it's measured, fitted, installed)
6. CTA

TESTIMONIALS (key: testimonials) — SHORT BLURBS ONLY, no [GLOBAL TRUST SECTION]:
Write 6 realistic, specific, varied client testimonials for ${q.business_name} in ${q.city}. Each must:
- Sound like a real homeowner (use first names only, different each time)
- Reference a specific product from: ${products}
- Mention a specific benefit experienced (light control, privacy, durability, easy cleaning, design match, etc.)
- Be 2-4 sentences long
- Feel authentic and conversational, NOT generic or salesy

Also write:
- ### Testimonials Intro (2-3 sentences inviting visitors to hear from real ${q.city} homeowners)
- ### Testimonials CTA (2-3 sentences encouraging the next step — schedule a consultation)

FAQ (key: faq) — SHORT BLURBS ONLY, no [GLOBAL TRUST SECTION]:
Write 10 realistic FAQ entries for a window treatment business in ${q.city}. Each entry:
- ### [Question] as the heading
- 2-4 sentence answer that is specific, helpful, and references local context or their specific products where relevant
Cover a mix of: product selection, measuring & installation process, care & cleaning, pricing expectations, lead times, motorization, child safety, warranty, what to expect at an in-home consultation, and custom vs. ready-made.
Also write:
- ### FAQ Intro (2-3 sentences welcoming visitors to the FAQ section)
- ### FAQ CTA (2-3 sentences at the end pointing to the free consultation for anything not answered)
</page_instructions>

Pages to generate (${pages.length} total): ${pages.map(p => `"${p.key}"`).join(', ')}

Return each page with page_key, page_name, h1, meta_description (150 chars max, includes ${q.city} and product keyword), and content (full markdown body).`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { questionnaire } = await req.json();
    if (!questionnaire?.business_name || !questionnaire?.city) {
      return Response.json({ error: 'business_name and city are required' }, { status: 400 });
    }

    const pages = buildPageList(questionnaire);
    const prompt = buildPrompt(questionnaire);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5',
      response_json_schema: {
        type: 'object',
        properties: {
          pages: {
            type: 'array',
            items: {
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
          }
        },
        required: ['pages']
      }
    });

    return Response.json({ pages: result.pages, total: result.pages?.length || 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});