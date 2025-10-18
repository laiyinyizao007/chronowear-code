import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, weather, hairstyle, userPhotoUrl, userId } = await req.json();
    
    console.log('Generating outfit image with user photo:', userPhotoUrl);
    console.log('Items:', items);

    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);

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

    // Generate outfit image using Hugging Face
    const generatePrompt = `Full body portrait of a fashion model wearing: ${itemDescriptions}. ${hairstyle ? `Hairstyle: ${hairstyle.name || hairstyle}. ` : ''}${weatherContext}. Professional fashion photography, studio lighting, clean white background, isolated person, centered composition, high quality.`;
    
    console.log('Generate prompt:', generatePrompt);

    const image = await hf.textToImage({
      inputs: generatePrompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    // Convert image to ArrayBuffer
    const arrayBuffer = await image.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `${userId || 'guest'}/${Date.now()}-outfit.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ootd-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ootd-photos')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully to:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
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