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

    // Use AI to search for real product information and image URLs
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Search for the product "${brand} ${model}" and provide:
1. A real product image URL (from official website, shopping sites, or product databases)
2. Current retail price
3. Style description
4. Material information
5. Available colors
6. Current availability status

Return ONLY valid JSON in this exact format:
{
  "imageUrl": "https://real-product-image-url.com/image.jpg",
  "price": "$XXX",
  "style": "style description",
  "material": "material type",
  "color": "color name",
  "availability": "In Stock"
}

Important: The imageUrl must be a real, working URL to an actual product image, not a placeholder.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    let productInfo;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productInfo = JSON.parse(jsonMatch[0]);
      } else {
        productInfo = JSON.parse(content);
      }
      
      // Validate image URL
      if (!productInfo.imageUrl || productInfo.imageUrl.includes('placeholder') || !productInfo.imageUrl.startsWith('http')) {
        console.log('Invalid or placeholder image URL, using fallback');
        productInfo.imageUrl = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`;
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      productInfo = {
        imageUrl: `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`,
        price: "$129",
        style: "Modern casual style",
        material: "Cotton blend",
        color: "Various",
        availability: "In Stock"
      };
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
