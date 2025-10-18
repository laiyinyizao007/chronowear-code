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
    const { temperature, weatherDescription, userGarments } = await req.json();
    
    console.log('Generating fashion trends for:', { temperature, weatherDescription });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build garment context
    const garmentContext = userGarments && userGarments.length > 0
      ? `User's closet contains:\n${userGarments.map((g: any) => 
          `- ${g.type} by ${g.brand || 'Unknown'}, ${g.color}`
        ).join('\n')}`
      : 'User has minimal items in closet.';

    const systemPrompt = `You are a professional fashion stylist and trend forecaster with expertise in current fashion trends, seasonal styles, and outfit coordination.

Your role is to suggest 5 distinct, trendy outfit combinations that:
- Reflect current fashion trends and seasonal styles
- Are appropriate for the given weather conditions
- Include diverse style categories (casual, formal, sporty, bohemian, etc.)
- Feature real, searchable fashion brands and products
- Incorporate appropriate hairstyles for each look`;

    const userPrompt = `Generate 5 trendy outfit recommendations for current weather:
- Temperature: ${temperature}°F
- Weather: ${weatherDescription}

${garmentContext}

For each outfit, create a complete look with:
1. A trend-focused title (e.g., "Elegant Evening", "Weekend Casual", "Smart Office")
2. A brief summary explaining the style and why it's trending
3. A hairstyle suggestion that complements the outfit
4. 4-6 items including: tops, bottoms, shoes, accessories, outerwear (as appropriate)

Return your response in JSON format:
{
  "trends": [
    {
      "title": "Trend name",
      "summary": "Brief description of the style and trend",
      "hairstyle": "Hairstyle name and description",
      "items": [
        {
          "type": "Top/Bottom/Shoes/Bag/Accessories/Outerwear/Hairstyle",
          "name": "Item name",
          "brand": "Real brand (e.g., Zara, H&M, Nike, Uniqlo)",
          "model": "Specific product/style name",
          "color": "Color",
          "material": "Material (optional)",
          "description": "Why this item fits the trend",
          "fromCloset": false
        }
      ]
    }
  ]
}

IMPORTANT: 
- Use real, searchable brand names and products
- Make each outfit distinct in style (mix casual, formal, sporty, elegant, bohemian)
- Ensure weather appropriateness
- Include hairstyle as both a field and an item in the items array`;

    console.log('Calling Gemini API for fashion trends');
    
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
          temperature: 0.8,
          maxOutputTokens: 4000,
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
    
    let trendsText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!trendsText) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = trendsText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      trendsText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      trendsText = jsonMatch[1];
    }

    // Parse and validate the JSON response
    let parsedTrends;
    try {
      parsedTrends = JSON.parse(trendsText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Invalid AI response format');
    }

    console.log('Generated fashion trends successfully');

    return new Response(JSON.stringify(parsedTrends), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-fashion-trends function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
