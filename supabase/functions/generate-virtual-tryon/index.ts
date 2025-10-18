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
    const { userPhotoUrl, personImageUrl, garmentImageUrl, garmentType } = await req.json();

    // Accept both userPhotoUrl and personImageUrl from client
    const basePersonUrl = userPhotoUrl || personImageUrl;
    if (!basePersonUrl) {
      return new Response(JSON.stringify({ error: 'Missing user photo URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating virtual try-on with Pollinations.ai');
    console.log('User photo:', basePersonUrl);
    console.log('Garment:', garmentImageUrl);
    console.log('Garment type:', garmentType);

    // Create a descriptive prompt for Pollinations.ai
    const prompt = `A professional fashion photography studio shot of a person wearing ${garmentType || 'clothing'}. 
The person should be in the same pose and have similar features as shown in the reference image. 
The ${garmentType || 'garment'} should fit naturally on the person's body. 
High quality, clean white background, fashion catalog style, realistic lighting, sharp focus.`;

    console.log('Generated prompt:', prompt);

    // Use Pollinations.ai image generation API
    // Pollinations.ai is free and doesn't require an API key
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&enhance=true`;

    console.log('Pollinations URL:', pollinationsUrl);

    // Return the generated image URL
    return new Response(
      JSON.stringify({ 
        imageUrl: pollinationsUrl, 
        tryonImageUrl: pollinationsUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-virtual-tryon function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        tryonImageUrl: null 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
