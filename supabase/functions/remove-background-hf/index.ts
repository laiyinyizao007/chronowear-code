import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HF_TOKEN) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN is not configured');
    }

    console.log('Starting background removal with Hugging Face API...');

    // Get image URL from request
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    console.log('Fetching image from:', imageUrl);
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    console.log(`Image loaded: ${(imageBlob.size / 1024).toFixed(1)}KB`);

    // Call Hugging Face Inference API with RMBG-1.4 model
    console.log('Calling Hugging Face RMBG-1.4 model...');
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
        },
        method: "POST",
        body: imageBlob,
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('HF API error:', errorText);
      throw new Error(`Hugging Face API error: ${hfResponse.status} - ${errorText}`);
    }

    // Get the result as blob
    const resultBlob = await hfResponse.blob();
    console.log(`Background removed successfully: ${(resultBlob.size / 1024).toFixed(1)}KB`);

    // Convert to base64 for easy frontend usage
    const arrayBuffer = await resultBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/png;base64,${base64}`;

    return new Response(
      JSON.stringify({ imageUrl: dataUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in remove-background-hf:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});