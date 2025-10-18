import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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
    
    console.log('Generating outfit image for items:', items);
    
    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!hfToken) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN is not configured');
    }

    // Build descriptive prompt from outfit items
    const itemDescriptions = items
      .filter((item: any) => item.type !== 'Hairstyle')
      .map((item: any) => `${item.color || ''} ${item.type} ${item.brand ? `by ${item.brand}` : ''}`.trim())
      .join(', ');

    const weatherContext = weather 
      ? `in ${weather.weatherDescription} weather, ${weather.temperature}°F`
      : '';

    const prompt = `Fashion photography, full body shot of person wearing ${itemDescriptions}, ${hairstyle || 'styled hair'}, ${weatherContext}, professional studio lighting, clean background, high quality, 8k`;

    console.log('Image generation prompt:', prompt);

    const hf = new HfInference(hfToken);

    const image = await hf.textToImage({
      inputs: prompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    // Convert to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageUrl = `data:image/png;base64,${base64}`;

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-outfit-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        imageUrl: null 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});