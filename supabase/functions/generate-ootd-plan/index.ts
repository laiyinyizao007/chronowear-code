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
    const { garments, weatherForecast, planningMode, wishlistItems } = await req.json();
    
    console.log('Generating OOTD plan for mode:', planningMode);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build available items list based on planning mode
    let availableItems = '';
    if (planningMode === 'closet-only') {
      availableItems = `Available items (from user's closet ONLY):\n${garments.map((g: any) => 
        `- ID: ${g.id}, Type: ${g.type}, Brand: ${g.brand || 'Unknown'}, Color: ${g.color}, Material: ${g.material || 'N/A'}`
      ).join('\n')}`;
    } else if (planningMode === 'with-wishlist') {
      availableItems = `Available items:\nFrom Closet:\n${garments.map((g: any) => 
        `- ID: ${g.id}, Type: ${g.type}, Brand: ${g.brand || 'Unknown'}, Color: ${g.color}, fromCloset: true`
      ).join('\n')}\n\nFrom Wishlist:\n${(wishlistItems || []).map((w: any) => 
        `- Type: ${w.type}, Brand: ${w.brand}, Color: ${w.color}, fromCloset: false, fromWishlist: true`
      ).join('\n')}`;
    } else {
      // any-items mode
      availableItems = `User's closet items (prefer these):\n${garments.map((g: any) => 
        `- ID: ${g.id}, Type: ${g.type}, Brand: ${g.brand || 'Unknown'}, Color: ${g.color}`
      ).join('\n')}\n\nYou can also suggest ANY real market items from brands like Zara, H&M, Uniqlo, Nike, etc.`;
    }

    const systemPrompt = `You are an expert wardrobe planner and fashion stylist. Your task is to create a multi-day outfit plan that maximizes variety while following these STRICT RULES:

CRITICAL RULES:
1. NO ITEM REPETITION: Each garment/item can only be used ONCE across all days
2. Plan as many days as possible until you run out of unique combinations
3. Each day must have a COMPLETE outfit (top, bottom, shoes, and accessories)
4. Track which items have been used to ensure no duplicates
5. Stop planning when you cannot create a complete outfit without repeating items

Weather consideration:
- Adjust clothing weight and layers based on temperature
- Include weather-appropriate accessories (umbrellas for rain, sunglasses for sunny days)
- Consider UV protection for high UV index days`;

    const userPrompt = `Create a multi-day OOTD plan with NO ITEM REPETITION.

${availableItems}

Weather forecast for the next 7 days:
${weatherForecast.map((day: any, idx: number) => 
  `Day ${idx + 1}: ${day.temp}°F, ${day.weather}, UV Index: ${day.uvIndex || 'N/A'}`
).join('\n')}

Planning mode: ${planningMode}
${planningMode === 'closet-only' ? 'IMPORTANT: Only use items from the closet list. Set fromCloset=true for all items.' : ''}
${planningMode === 'with-wishlist' ? 'Use both closet and wishlist items. Mark fromCloset and fromWishlist accordingly.' : ''}
${planningMode === 'any-items' ? 'Prefer closet items but can suggest any real market items. Mark fromCloset appropriately.' : ''}

Return your response in JSON format:
{
  "plan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "weather": "Weather description",
      "outfit": {
        "title": "Outfit style name",
        "items": [
          {
            "type": "Top/Bottom/Shoes/Bag/Accessories/Outerwear",
            "name": "Item name",
            "brand": "Brand name",
            "color": "Color",
            "garmentId": "UUID (only if fromCloset=true)",
            "fromCloset": true/false,
            "fromWishlist": true/false (only if applicable)
          }
        ],
        "hairstyle": "Hairstyle suggestion",
        "notes": "Why this outfit works for the weather"
      }
    }
  ],
  "totalDays": number,
  "remainingItems": ["List of unused items if any"]
}

IMPORTANT: 
- Plan as many days as possible until items run out
- Track used items carefully to prevent duplicates
- Each day must have at least: 1 top, 1 bottom, 1 shoes
- Stop when you can't make a complete outfit without repetition`;

    console.log('Calling Gemini API for OOTD planning');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response received');
    
    let planText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!planText) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = planText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      planText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      planText = jsonMatch[1];
    }

    // Parse and validate the JSON response
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(planText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Invalid AI response format');
    }

    console.log(`Generated OOTD plan for ${parsedPlan.totalDays} days`);

    return new Response(JSON.stringify(parsedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-ootd-plan function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
