import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Build garment inventory with IDs for matching
    const garmentInventory = garments && garments.length > 0
      ? `Available garments in closet:\n${garments.map((g: any) => 
          `- ID: ${g.id}, Type: ${g.type}, Brand: ${g.brand || 'Unknown'}, Color: ${g.color}${g.material ? `, Material: ${g.material}` : ''}`
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

    // Determine if umbrella/parasol is needed
    const isRainy = weatherDescription.toLowerCase().includes('rain') || 
                    weatherDescription.toLowerCase().includes('drizzle') || 
                    weatherDescription.toLowerCase().includes('shower');
    const needsUmbrella = isRainy;
    const needsParasol = !isRainy && uvIndex >= 6;
    
    let umbrellaRequirement = '';
    if (needsUmbrella) {
      umbrellaRequirement = '\n\nIMPORTANT WEATHER REQUIREMENT: It is raining today. You MUST include a rain umbrella as an accessory in every outfit recommendation. Suggest stylish umbrellas from brands like Blunt, Totes, or Fulton.';
    } else if (needsParasol) {
      umbrellaRequirement = '\n\nIMPORTANT UV PROTECTION REQUIREMENT: UV index is high today. You MUST include a sun umbrella/parasol as an accessory in every outfit recommendation for sun protection. Suggest stylish parasols or UV-blocking umbrellas from brands like Coolibar, UV-Blocker, or stylish sun umbrellas.';
    }

    const userPrompt = `Please recommend 3-5 different complete outfit combinations for today's weather conditions:
- Temperature: ${temperature}°F
- Weather: ${weatherDescription}
- UV Index: ${uvIndex} (${uvIndex < 3 ? 'Low' : uvIndex < 6 ? 'Moderate' : uvIndex < 8 ? 'High' : 'Very High'})

${garmentInventory}

${garments && garments.length > 0 
  ? 'Based on the available garments, suggest different outfit combinations using items from the closet when possible. Set "fromCloset" to true ONLY for items that exactly match a garment ID from the list above (match by type AND brand). If the closet is missing key items for this weather, suggest new items with "fromCloset" set to false.'
  : 'Suggest different outfit combinations that would be ideal for this weather (user can add them to their closet later). Create diverse looks suitable for different occasions. All items should have "fromCloset" set to false.'}

IMPORTANT: For each item, you MUST provide a real brand and specific model/product name that can be searched online.${umbrellaRequirement}

Return your response in JSON format with this structure:
{
  "outfits": [
    {
      "title": "Style name (e.g., Casual Chic, Smart Office, Weekend Sporty)",
      "summary": "Brief 1-2 sentence explanation why this outfit works for the weather",
      "hairstyle": {
        "name": "Hairstyle name (e.g., Low Bun, Beach Waves, Sleek Ponytail)",
        "description": "Why this hairstyle complements the outfit and weather"
      },
      "items": [
        {
          "type": "top/bottom/shoes/outerwear/accessory",
          "name": "Item name",
          "brand": "Real brand name (e.g., Uniqlo, Zara, H&M, Nike)",
          "model": "Specific product name or style name",
          "color": "Color of the item",
          "material": "Material (optional)",
          "description": "Why this item works",
          "fromCloset": true/false,
          "garmentId": "UUID from closet (only if fromCloset is true)"
        }
      ],
      "tips": ["1-2 styling or weather protection tips"]
    }
  ]
}

Generate 3-5 complete outfit combinations, each with 4-6 items. Make each outfit distinct in style and vibe. Include a suitable hairstyle recommendation for each outfit.
CRITICAL: 
1. Use real, searchable brand names and product names for every item. For example:
   - "Uniqlo Supima Cotton T-Shirt"
   - "Levi's 501 Original Jeans"
   - "Nike Air Force 1 Sneakers"
   - "Zara Oversized Blazer"
2. Set "fromCloset" to true ONLY when the item matches a garment from the closet list (same type AND brand)
3. Include the "garmentId" field ONLY when "fromCloset" is true
4. Suggest a hairstyle that complements the outfit's style and is weather-appropriate (e.g., updos for windy weather, protective styles for rain)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    let recommendation = data.choices[0].message.content;

    if (!recommendation) {
      throw new Error('No content in OpenAI response');
    }

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