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
    const { brand, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Searching product info for:', brand, model);

    // Generate product image using AI
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality product photo of ${brand} ${model} on a clean white background, professional e-commerce style photography`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    let imageUrl = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`; // fallback
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (generatedImage) {
        imageUrl = generatedImage;
        console.log('Generated product image successfully');
      }
    }

    // Get product information
    const infoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `Provide detailed product information for ${brand} ${model}. Return ONLY valid JSON in this exact format: {"price": "$XX", "style": "description", "material": "material type", "color": "primary color", "availability": "In Stock"}`
          }
        ],
        temperature: 0.7,
      }),
    });

    let productInfo = {
      imageUrl,
      price: "$129",
      style: "Modern casual style",
      material: "Cotton blend",
      color: "Various",
      availability: "In Stock"
    };

    if (infoResponse.ok) {
      const data = await infoResponse.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        console.log('AI info response:', content);
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedInfo = JSON.parse(jsonMatch[0]);
            productInfo = { ...productInfo, ...parsedInfo, imageUrl };
          }
        } catch (parseError) {
          console.error('Failed to parse product info:', parseError);
        }
      }
    }

    return new Response(
      JSON.stringify(productInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-product-info:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
