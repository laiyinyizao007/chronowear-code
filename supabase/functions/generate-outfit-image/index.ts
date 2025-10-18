import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

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
    
    console.log('Generating outfit image with user photo:', userPhotoUrl);
    console.log('Items:', items);

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

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

    // If user photo is provided, use IDM-VTON for virtual try-on
    if (userPhotoUrl && items.length > 0) {
      // Get the first garment image (top/outerwear preferred)
      const garmentItem = items.find((item: any) => 
        item.type === 'top' || item.type === 'outerwear'
      ) || items[0];

      if (!garmentItem?.imageUrl) {
        throw new Error('No garment image found for virtual try-on');
      }

      const garmentDescription = `${garmentItem.brand || ''} ${garmentItem.model || ''} ${garmentItem.color || ''}`.trim();
      
      console.log('Using IDM-VTON with:', {
        userPhoto: userPhotoUrl,
        garmentImage: garmentItem.imageUrl,
        description: garmentDescription
      });

      const output = await replicate.run(
        "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        {
          input: {
            human_img: userPhotoUrl,
            garm_img: garmentItem.imageUrl,
            garment_des: garmentDescription,
            is_checked: true,
            is_checked_crop: false,
            denoise_steps: 30,
            seed: 42
          }
        }
      );

      console.log('IDM-VTON output:', output);

      // The output is typically a URL or array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl) {
        throw new Error('No image generated from IDM-VTON');
      }

      console.log('Virtual try-on completed successfully');

      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Generate outfit collage without user photo
    const generatePrompt = `Full body portrait of a fashion model wearing: ${itemDescriptions}. ${hairstyle ? `Hairstyle: ${hairstyle.name || hairstyle}. ` : ''}${weatherContext}. Professional fashion photography, studio lighting, clean white background, isolated person, centered composition, high quality.`;
    
    console.log('Fallback: generating without user photo');

    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: generatePrompt,
          go_fast: true,
          megapixels: "1",
          num_outputs: 1,
          aspect_ratio: "9:16",
          output_format: "webp",
          output_quality: 80,
          num_inference_steps: 4
        }
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    console.log('Fallback image generated successfully');

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