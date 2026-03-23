import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            gbp_profile_id,
            client_name,
            month,
            season,
            priority_service,
            posts_per_week,
            gbp_profile_data
        } = await req.json();

        const profileContext = `
        Client Name: ${client_name}
        Primary City: ${gbp_profile_data.primary_city}
        Secondary Cities: ${gbp_profile_data.secondary_cities?.join(', ') || 'None'}
        Service Radius: ${gbp_profile_data.service_radius || 'N/A'}
        Has Showroom: ${gbp_profile_data.has_showroom ? 'Yes' : 'No'}
        Showroom Address: ${gbp_profile_data.showroom_address || 'N/A'}
        Appointment Required: ${gbp_profile_data.appointment_required ? 'Yes' : 'No'}
        Core Services: ${gbp_profile_data.core_services.join(', ')}
        Secondary Services: ${gbp_profile_data.secondary_services?.join(', ') || 'None'}
        Primary Service Keywords: ${gbp_profile_data.primary_service_keywords?.join(', ') || 'None'}
        Secondary Service Keywords: ${gbp_profile_data.secondary_service_keywords?.join(', ') || 'None'}
        Products Offered: ${gbp_profile_data.products_offered?.join(', ') || 'None'}
        Target Customer Types: ${gbp_profile_data.target_customer_types?.join(', ') || 'None'}
        Years in Business: ${gbp_profile_data.years_in_business || 'N/A'}
        Average Rating: ${gbp_profile_data.average_rating || 'N/A'}
        Review Count: ${gbp_profile_data.review_count || 'N/A'}
        Warranty Details: ${gbp_profile_data.warranty_details || 'N/A'}
        Certifications: ${gbp_profile_data.certifications?.join(', ') || 'None'}
        Brands Carried: ${gbp_profile_data.brands_carried?.join(', ') || 'None'}
        Main Offer: ${gbp_profile_data.main_offer || 'N/A'}
        Recurring Promotions: ${gbp_profile_data.recurring_promotions || 'N/A'}
        Free Consultation: ${gbp_profile_data.free_consultation ? 'Yes' : 'No'}
        Free Measurement: ${gbp_profile_data.free_measurement ? 'Yes' : 'No'}
        Financing Available: ${gbp_profile_data.financing_available ? 'Yes' : 'No'}
        Seasonal Peak Months: ${gbp_profile_data.seasonal_peak_months?.join(', ') || 'None'}
        Notes for Local Positioning: ${gbp_profile_data.notes_for_local_positioning || 'N/A'}
        `;

        const prompt = `You are an expert in local SEO and Google Business Profile (GBP) management for window treatment businesses. Generate a detailed, strategic GBP content calendar for a client.

        === CLIENT & CALENDAR DETAILS ===
        ${profileContext}
        Month: ${month}
        Season: ${season}
        Posts Per Week: ${posts_per_week}
        ${priority_service ? `Priority Service Focus: ${priority_service}` : ''}

        === CALENDAR REQUIREMENTS ===
        1. Structure: Provide a schedule for each week of the month. Each week contains an array of days with posts.
        2. For each post include: date (YYYY-MM-DD), day_of_week (0=Sun, 6=Sat), is_holiday (boolean), type (Offer/What's New/Event/Product), call_to_action, keywords (2-3 local SEO keywords), description_idea.
        3. Incorporate relevant local holidays for the given month and primary city naturally.
        4. All posts must align with the client's services, offers, target audience, and local SEO strategy.
        5. Ensure a good mix of GBP post types throughout the month.
        6. Distribute posts evenly across weeks according to Posts Per Week.

        Output only JSON, no conversational text.`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    gbp_profile_id: { type: "string" },
                    client_name: { type: "string" },
                    month: { type: "string" },
                    season: { type: "string" },
                    priority_service: { type: "string" },
                    posts_per_week: { type: "number" },
                    calendar_data: {
                        type: "object",
                        properties: {
                            weeks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        week_number: { type: "number" },
                                        days: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    date: { type: "string" },
                                                    day_of_week: { type: "number" },
                                                    is_holiday: { type: "boolean" },
                                                    posts: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                type: { type: "string" },
                                                                call_to_action: { type: "string" },
                                                                keywords: { type: "array", items: { type: "string" } },
                                                                description_idea: { type: "string" }
                                                            },
                                                            required: ["type", "call_to_action", "keywords", "description_idea"]
                                                        }
                                                    }
                                                },
                                                required: ["date", "day_of_week", "is_holiday", "posts"]
                                            }
                                        }
                                    },
                                    required: ["week_number", "days"]
                                }
                            }
                        },
                        required: ["weeks"]
                    }
                },
                required: ["gbp_profile_id", "client_name", "month", "season", "posts_per_week", "calendar_data"]
            }
        });

        return Response.json(response.data, { status: 200 });

    } catch (error) {
        console.error('Error generating GBP calendar:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});