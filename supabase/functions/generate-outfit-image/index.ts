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
    const { items, weather, hairstyle, userPhotoUrl } = await req.json();
    
    console.log('Generating outfit image with user photo:', userPhotoUrl);
    console.log('Items:', items);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    // If user photo is provided, use image editing to dress the user
    if (userPhotoUrl) {
      const editPrompt = `Dress this person in the following outfit: ${itemDescriptions}. ${hairstyle ? `Hairstyle: ${hairstyle.name || hairstyle}. ` : ''}${weatherContext}. Keep the person's face and body features unchanged. Professional fashion photography style, studio lighting, clean white background.`;
      
      console.log('Edit prompt:', editPrompt);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: editPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: userPhotoUrl
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        throw new Error(`Lovable AI error: ${response.status}`);
      }

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        throw new Error('No image generated');
      }

      console.log('Image edited successfully with user photo');

      return new Response(
        JSON.stringify({ imageUrl: generatedImageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Generate new image without user photo
    const generatePrompt = `Full body portrait of a fashion model wearing: ${itemDescriptions}. ${hairstyle ? `Hairstyle: ${hairstyle.name || hairstyle}. ` : ''}${weatherContext}. Professional fashion photography, studio lighting, clean white background, isolated person, centered composition, high quality.`;
    
    console.log('Generate prompt:', generatePrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: generatePrompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error('No image generated');
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({ imageUrl: generatedImageUrl }),
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