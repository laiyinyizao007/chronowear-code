import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { temperature, weatherDescription, uvIndex, garments } = await req.json();
    
    console.log('Generating outfit recommendation for:', { temperature, weatherDescription, uvIndex });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build garment inventory description
    const garmentInventory = garments && garments.length > 0
      ? `Available garments in closet:\n${garments.map((g: any) => 
          `- ${g.type}: ${g.color}${g.material ? ` (${g.material})` : ''}${g.brand ? ` by ${g.brand}` : ''}`
        ).join('\n')}`
      : 'User has no garments in their closet yet.';

    const systemPrompt = `You are a professional fashion stylist and wardrobe consultant. Your role is to provide personalized outfit recommendations based on weather conditions and UV exposure.

When recommending outfits, consider:
- Temperature comfort and layering
- Weather protection (rain, snow, wind)
- UV protection when UV index is high
- Seasonal appropriateness
- Style and fashion sense

Provide practical, stylish recommendations that keep the user comfortable and protected.`;

    const userPrompt = `Please recommend 3-5 different complete outfit combinations for today's weather conditions:
- Temperature: ${temperature}°F
- Weather: ${weatherDescription}
- UV Index: ${uvIndex} (${uvIndex < 3 ? 'Low' : uvIndex < 6 ? 'Moderate' : uvIndex < 8 ? 'High' : 'Very High'})

${garmentInventory}

${garments && garments.length > 0 
  ? 'Based on the available garments, suggest different outfit combinations. If the closet is missing key items for this weather, mention what should be added. Try to create diverse looks (casual, smart casual, sporty, etc.) from the available items.'
  : 'Suggest different outfit combinations that would be ideal for this weather (user can add them to their closet later). Create diverse looks suitable for different occasions.'}

IMPORTANT: For each item, you MUST provide a real brand and specific model/product name that can be searched online.

Return your response in JSON format with this structure:
{
  "outfits": [
    {
      "title": "Style name (e.g., Casual Chic, Smart Office, Weekend Sporty)",
      "summary": "Brief 1-2 sentence explanation why this outfit works for the weather",
      "items": [
        {
          "type": "top/bottom/shoes/outerwear/accessory",
          "name": "Item name",
          "brand": "Real brand name (e.g., Uniqlo, Zara, H&M, Nike)",
          "model": "Specific product name or style name",
          "description": "Why this item works",
          "fromCloset": true/false
        }
      ],
      "tips": ["1-2 styling or weather protection tips"]
    }
  ]
}

Generate 3-5 complete outfit combinations, each with 4-6 items. Make each outfit distinct in style and vibe. 
CRITICAL: Use real, searchable brand names and product names for every item. For example:
- "Uniqlo Supima Cotton T-Shirt"
- "Levi's 501 Original Jeans"
- "Nike Air Force 1 Sneakers"
- "Zara Oversized Blazer"`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    let recommendation = data.choices[0].message.content;

    // Extract JSON from markdown code blocks if present
    const jsonMatch = recommendation.match(/```json\s*([\s\S]*?)\s*```/) || 
                      recommendation.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      recommendation = jsonMatch[1];
    }

    // Parse and validate the JSON response
    let parsedRecommendation;
    try {
      parsedRecommendation = JSON.parse(recommendation);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Invalid AI response format');
    }

    console.log('Generated recommendation');

    return new Response(JSON.stringify(parsedRecommendation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-outfit-recommendation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
