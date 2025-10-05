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

    const userPrompt = `Please recommend an outfit for today's weather conditions:
- Temperature: ${temperature}°F
- Weather: ${weatherDescription}
- UV Index: ${uvIndex} (${uvIndex < 3 ? 'Low' : uvIndex < 6 ? 'Moderate' : uvIndex < 8 ? 'High' : 'Very High'})

${garmentInventory}

${garments && garments.length > 0 
  ? 'Based on the available garments, suggest a complete outfit combination. If the closet is missing key items for this weather, mention what should be added.'
  : 'Suggest what types of garments would be ideal for this weather (user can add them to their closet later).'}

Include:
1. Complete outfit suggestion (top, bottom, outerwear if needed, accessories)
2. Brief explanation why this outfit works for the weather
3. UV protection advice if UV index is moderate or higher
4. Any additional tips (e.g., layering advice, fabric suggestions)

Keep the response friendly, concise, and practical (around 150-200 words).`;

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
    const recommendation = data.choices[0].message.content;

    console.log('Generated recommendation');

    return new Response(JSON.stringify({ recommendation }), {
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
