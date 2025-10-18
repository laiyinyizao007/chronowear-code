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
    const { items, weather, hairstyle } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build outfit description
    const itemDescriptions = items.map((item: any) => 
      `${item.color || ''} ${item.type || ''} ${item.brand ? `by ${item.brand}` : ''}`.trim()
    ).join(', ');

    const prompt = `Fashion editorial photo of a complete outfit laid flat on a clean white background. 
The outfit includes: ${itemDescriptions}. 
Style: ${hairstyle || 'modern'}, Weather: ${weather?.weatherDescription || 'pleasant'} at ${weather?.temperature || 70}°F.
Ultra high resolution, professional fashion photography, minimalist aesthetic, centered composition, soft natural lighting.`;

    console.log('Generating outfit image with prompt:', prompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Note: Gemini 2.0 Flash doesn't support image generation
    // This is a text-only model, so we'll return a placeholder
    // For actual image generation, you would need to use a different service
    console.log('Note: Gemini 2.0 Flash does not support image generation');
    console.log('Consider using OpenAI gpt-image-1 or other image generation services');

    return new Response(
      JSON.stringify({ 
        imageUrl: null,
        note: 'Image generation requires a different AI service. Gemini 2.0 Flash is text-only.',
        description: data.candidates?.[0]?.content?.parts?.[0]?.text
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating outfit image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});