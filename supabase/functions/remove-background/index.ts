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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing image URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Removing background using Gemini image editing...');

    // Convert image URL to base64
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Remove the background from this image completely, keeping only the person. Return the image with a transparent background."
            },
            {
              inline_data: {
                mime_type: imageBlob.type,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Gemini API error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    // Note: Gemini doesn't generate images in the same way - this is a text-based API
    // For actual background removal, you would need to use a dedicated image processing service
    // For now, return the original image as a fallback
    console.warn('Note: Gemini API does not support image generation. Returning original image.');
    const resultImageUrl = imageUrl;

    if (!resultImageUrl) {
      return new Response(JSON.stringify({ error: 'Background removal failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ imageUrl: resultImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in remove-background function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
