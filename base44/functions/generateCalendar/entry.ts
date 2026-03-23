import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            brand_profile_id,
            brand_name,
            month,
            season,
            priority_product,
            campaign_goal,
            posts_per_week,
            format_preferences,
            brand_analysis,
            location,
            products_offered,
            price_tier,
            target_audience
        } = await req.json();

        const brandContext = `
        Brand Name: ${brand_name}
        Location: ${location}
        Products Offered: ${(products_offered || []).join(', ')}
        Price Tier: ${price_tier}
        Target Audience: ${(target_audience || []).join(', ')}
        ${brand_analysis?.brand_voice?.length > 0 ? `Brand Voice: ${brand_analysis.brand_voice.join(', ')}` : ''}
        ${brand_analysis?.tone_attributes?.length > 0 ? `Tone Attributes: ${brand_analysis.tone_attributes.join(', ')}` : ''}
        ${brand_analysis?.unique_selling_propositions?.length > 0 ? `Unique Selling Propositions: ${brand_analysis.unique_selling_propositions.join(', ')}` : ''}
        ${brand_analysis?.key_messaging?.length > 0 ? `Key Messaging: ${brand_analysis.key_messaging.join(', ')}` : ''}
        ${brand_analysis?.avoid_terms?.length > 0 ? `Terms to Avoid: ${brand_analysis.avoid_terms.join(', ')}` : ''}
        `;

        const prompt = `You are an expert social media strategist and content creator specializing in window treatment businesses. Generate a detailed, strategic social media content calendar for a client.

        === CLIENT & CAMPAIGN DETAILS ===
        ${brandContext}
        Month: ${month}
        Season: ${season}
        Campaign Goal: ${campaign_goal}
        Posts Per Week: ${posts_per_week}
        ${priority_product ? `Priority Product Focus: ${priority_product}` : ''}
        Preferred Content Formats: ${format_preferences?.length > 0 ? format_preferences.join(', ') : 'Any relevant format'}

        === REQUIREMENTS ===
        - Provide a schedule for each week of the month with days and posts arrays.
        - For each post include: title, caption_idea, format, primary_platform, keywords (2-3), hashtags (3-5).
        - Incorporate relevant holidays naturally.
        - All posts must align with campaign goal and brand context.
        - Ensure variety in formats and platforms.
        - Distribute posts evenly across weeks per the posts_per_week value.

        === OUTPUT FORMAT ===
        Return ONLY a JSON object matching the schema below. Assume current year for dates.
        {
            "brand_profile_id": "${brand_profile_id}",
            "brand_name": "${brand_name}",
            "month": "${month}",
            "season": "${season}",
            "priority_product": "${priority_product || ''}",
            "campaign_goal": "${campaign_goal}",
            "posts_per_week": ${posts_per_week},
            "format_preferences": ${JSON.stringify(format_preferences || [])},
            "calendar_data": {
                "weeks": [
                    {
                        "week_number": 1,
                        "days": [
                            {
                                "date": "YYYY-MM-DD",
                                "day_of_week": 0,
                                "is_holiday": false,
                                "posts": [
                                    {
                                        "title": "Post Title",
                                        "caption_idea": "Caption idea.",
                                        "format": "Image Post",
                                        "primary_platform": "Instagram",
                                        "keywords": ["keyword1", "keyword2"],
                                        "hashtags": ["#hashtag1", "#hashtag2"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            "brand_voice_score": 85
        }`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    brand_profile_id: { type: "string" },
                    brand_name: { type: "string" },
                    month: { type: "string" },
                    season: { type: "string" },
                    priority_product: { type: "string" },
                    campaign_goal: { type: "string" },
                    posts_per_week: { type: "number" },
                    format_preferences: { type: "array", items: { type: "string" } },
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
                                                                title: { type: "string" },
                                                                caption_idea: { type: "string" },
                                                                format: { type: "string" },
                                                                primary_platform: { type: "string" },
                                                                keywords: { type: "array", items: { type: "string" } },
                                                                hashtags: { type: "array", items: { type: "string" } }
                                                            },
                                                            required: ["title", "caption_idea", "format", "primary_platform", "keywords", "hashtags"]
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
                    },
                    brand_voice_score: { type: "number" }
                },
                required: ["brand_profile_id", "brand_name", "month", "season", "campaign_goal", "posts_per_week", "format_preferences", "calendar_data"]
            }
        });

        return Response.json(response);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});