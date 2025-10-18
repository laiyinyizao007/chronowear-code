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
    const { userPhotoUrl, garmentImageUrl, garmentType } = await req.json();
    
    console.log('Generating virtual try-on:', { userPhotoUrl, garmentImageUrl, garmentType });
    
    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!hfToken) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN is not configured');
    }

    // Fetch the user photo
    const userPhotoResponse = await fetch(userPhotoUrl);
    const userPhotoBlob = await userPhotoResponse.blob();

    // Create a composite prompt for try-on
    const prompt = `Person wearing ${garmentType}, realistic virtual try-on, maintain face and body proportions, professional photography, high quality`;

    console.log('Virtual try-on prompt:', prompt);

    const hf = new HfInference(hfToken);

    // Use image-to-image with FLUX
    const result = await hf.textToImage({
      inputs: prompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    // Convert to base64
    const arrayBuffer = await result.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const tryonImageUrl = `data:image/png;base64,${base64}`;

    console.log('Virtual try-on generated successfully');

    return new Response(
      JSON.stringify({ tryonImageUrl }),
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