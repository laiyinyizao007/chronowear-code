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

    console.log('Starting background removal with Hugging Face Spaces...');

    // Get image URL from request
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    console.log('Fetching image from:', imageUrl);
    
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    console.log(`Image loaded: ${(imageBlob.size / 1024).toFixed(1)}KB`);

    // Convert blob to base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${imageBlob.type};base64,${base64Image}`;

    // Call Hugging Face Inference API for RMBG-2.0
    // Using the dedicated image-to-image endpoint
    console.log('Calling Hugging Face RMBG-2.0 Space...');
    
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/briaai/RMBG-2.0",
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: dataUrl,
        }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('HF API error:', hfResponse.status, errorText);
      
      // Check if model is loading
      if (hfResponse.status === 503) {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.includes('loading')) {
          const estimatedTime = errorData.estimated_time || 20;
          throw new Error(`模型正在加载中，预计需要${estimatedTime}秒，请稍后重试`);
        }
      }
      
      throw new Error(`Hugging Face API error: ${hfResponse.status} - ${errorText}`);
    }

    // Get the result as blob
    const resultBlob = await hfResponse.blob();
    console.log(`Background removed successfully: ${(resultBlob.size / 1024).toFixed(1)}KB`);

    // Convert result to base64
    const resultArrayBuffer = await resultBlob.arrayBuffer();
    const resultBase64 = btoa(String.fromCharCode(...new Uint8Array(resultArrayBuffer)));
    const resultDataUrl = `data:image/png;base64,${resultBase64}`;

    return new Response(
      JSON.stringify({ imageUrl: resultDataUrl }),
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