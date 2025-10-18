import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { temperature, weatherDescription, currentWeather } = await req.json();
    
    console.log('Saving fashion trends for user:', user.id, { temperature, weatherDescription });

    const today = new Date().toISOString().split('T')[0];

    // Check if trends already exist for today
    const { data: existingTrends } = await supabase
      .from('trends')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today);

    if (existingTrends && existingTrends.length >= 5) {
      console.log('Trends already exist for today, returning existing');
      const { data: trends } = await supabase
        .from('trends')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(5);

      return new Response(JSON.stringify({ trends }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's garments
    const { data: garments } = await supabase
      .from('garments')
      .select('id, type, color, material, brand, image_url')
      .eq('user_id', user.id);

    // Build garment context
    const garmentContext = garments && garments.length > 0
      ? `User's closet contains:\n${garments.map((g: any) => 
          `- ${g.type} by ${g.brand || 'Unknown'}, ${g.color}`
        ).join('\n')}`
      : 'User has minimal items in closet.';

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

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
3. A description (2-3 sentences about the overall vibe)
4. A hairstyle suggestion that complements the outfit
5. 4-6 items including: tops, bottoms, shoes, accessories, outerwear (as appropriate)

Return your response in JSON format:
{
  "trends": [
    {
      "title": "Trend name",
      "summary": "Brief description of the style and trend",
      "description": "Detailed description of the outfit vibe and styling",
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
- ALWAYS include one item with type "Hairstyle" in the items array
- For hairstyle items, use descriptive names like "Messy Low Bun", "Sleek High Ponytail", "Beach Waves", etc.
- The hairstyle field should contain the same value as the hairstyle item's name
- Provide both summary (1 sentence) and description (2-3 sentences) for each outfit`;

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

    let parsedTrends;
    try {
      parsedTrends = JSON.parse(trendsText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Invalid AI response format');
    }

    console.log('Generated fashion trends successfully, saving to database...');

    // Save trends to database
    const trendsToSave = [];
    for (const trend of parsedTrends.trends) {
      trendsToSave.push({
        user_id: user.id,
        date: today,
        title: trend.title,
        description: trend.description || trend.summary,
        summary: trend.summary,
        hairstyle: trend.hairstyle,
        items: trend.items,
        weather: currentWeather,
        image_url: null // Will be generated separately
      });
    }

    const { data: savedTrends, error: saveError } = await supabase
      .from('trends')
      .insert(trendsToSave)
      .select();

    if (saveError) {
      console.error('Failed to save trends to database:', saveError);
      throw saveError;
    }

    console.log('Successfully saved', savedTrends.length, 'trends to database');

    return new Response(JSON.stringify({ trends: savedTrends }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in save-fashion-trends function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
