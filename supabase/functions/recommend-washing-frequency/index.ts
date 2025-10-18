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
    const { material, type } = await req.json();
    
    console.log('Recommending washing frequency for:', { material, type });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = `You are a garment care expert. Your role is to provide accurate washing frequency recommendations and detailed care instructions based on garment materials and types.

Consider factors such as:
- Material durability and care requirements
- Typical usage patterns for the garment type
- Best practices for fabric maintenance
- Balance between hygiene and fabric longevity
- Specific care needs (washing temperature, drying methods, ironing, dry cleaning, etc.)

Provide practical, specific recommendations that help preserve the garment's quality.`;

    const userPrompt = `Please provide comprehensive care recommendations for a garment with the following characteristics:
- Material: ${material || 'unknown'}
- Type: ${type || 'unknown'}

Based on the material and garment type:

1. Recommend the most appropriate washing frequency from these categories:
   - "After each wear" - for items worn close to skin, workout clothes, underwear
   - "After 2-3 wears" - for casual shirts, blouses, lightweight tops
   - "After 3-5 wears" - for jeans, pants, casual dresses
   - "Weekly" - for sweaters, cardigans, light jackets
   - "Bi-weekly" - for heavy sweaters, coats, structured blazers
   - "Monthly" - for outerwear, formal suits, winter coats
   - "As needed" - for accessories, bags, special occasion items

2. Provide detailed care instructions including:
   - Washing temperature and method (machine/hand wash)
   - Drying recommendations
   - Ironing instructions if applicable
   - Any special care notes (dry clean only, avoid bleach, etc.)
   - Storage tips

Return your response in JSON format:
{
  "frequency": "one of the washing frequency options above",
  "reason": "Brief 1-2 sentence explanation of why this frequency is recommended",
  "care_instructions": "Detailed care instructions covering washing, drying, ironing, and any special considerations (3-5 sentences)"
}`;

    const prompt = `${systemPrompt}

${userPrompt}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Gemini API error');
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    let recommendation = content;

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
      // Fallback recommendation
      parsedRecommendation = {
        frequency: "After 2-3 wears",
        reason: "General recommendation for most garments",
        care_instructions: "Machine wash cold with similar colors. Tumble dry low or hang to dry. Iron on low heat if needed."
      };
    }

    console.log('Generated care recommendation:', parsedRecommendation);

    return new Response(JSON.stringify(parsedRecommendation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in recommend-washing-frequency function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});