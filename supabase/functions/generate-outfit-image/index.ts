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
    const { items, weather, hairstyle, userPhotoUrl } = await req.json();
    
    console.log('Generating outfit image');
    console.log('Items:', items);
    console.log('User photo URL:', userPhotoUrl);

    const HUGGING_FACE_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HUGGING_FACE_TOKEN) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN not configured');
    }

    const hf = new HfInference(HUGGING_FACE_TOKEN);

    // Build outfit description from items
    const itemDescriptions = items
      .filter((item: any) => item.type !== 'Hairstyle')
      .map((item: any) => {
        const parts = [];
        if (item.brand) parts.push(item.brand);
        if (item.model) parts.push(item.model);
        if (item.color) parts.push(item.color);
        if (item.type) parts.push(item.type);
        return parts.join(' ');
      })
      .join(', ');

    const weatherContext = weather 
      ? `suitable for ${weather.weatherDescription} weather at ${weather.temperature}°C`
      : '';

    // Generate prompt for outfit image
    const prompt = `Full body portrait of a fashion model wearing: ${itemDescriptions}. ${hairstyle ? `Hairstyle: ${hairstyle.name || hairstyle}. ` : ''}${weatherContext}. Professional fashion photography, studio lighting, clean white background, isolated person, centered composition, high quality, realistic.`;
    
    console.log('Generating image with Hugging Face API');
    console.log('Prompt:', prompt);

    // Generate image using Hugging Face FLUX model
    const image = await hf.textToImage({
      inputs: prompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    // Convert blob to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageDataUrl = `data:image/png;base64,${base64}`;

    console.log('Image generated successfully with Hugging Face');

    return new Response(
      JSON.stringify({ imageUrl: imageDataUrl }),
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