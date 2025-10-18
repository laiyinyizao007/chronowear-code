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
    const { brand, model, type, material, color } = await req.json();

    console.log('Searching product info for:', { brand, model, type, material, color });

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use AI to estimate product information
    const prompt = `You are a fashion expert. Given the following garment information:
Brand: ${brand || 'Unknown'}
Model: ${model || 'Generic'}
Type: ${type || 'Clothing'}
Material: ${material || 'Unknown'}
Color: ${color || 'Unknown'}

Provide realistic product information including:
1. Estimated retail price (in USD as a number, just the amount without $ symbol)
2. Style description
3. Key features (array of 3-4 items)
4. Availability status

Be realistic with pricing based on the brand reputation and product type.

Return ONLY valid JSON in this exact format:
{
  "official_price": 129.99,
  "price": "$129.99",
  "style": "Classic and versatile style",
  "features": ["Premium quality", "Comfortable fit", "Durable construction"],
  "availability": "Available online"
}`;

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a fashion pricing expert. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    console.log('AI response:', aiContent);

    let productInfo;
    try {
      productInfo = JSON.parse(aiContent);
    } catch (e) {
      console.warn('Failed to parse AI response, using fallback');
      productInfo = {
        official_price: 129.99,
        price: "$129.99",
        style: "Classic and versatile style",
        features: ["Premium quality", "Comfortable fit", "Durable construction"],
        availability: "Available online"
      };
    }

    // Get product image from Unsplash
    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    let productImageUrl = '';

    if (unsplashAccessKey) {
      const searchQuery = `${brand} ${model} fashion`.trim();
      console.log('Using Unsplash API with query:', searchQuery);
      
      try {
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=portrait`,
          {
            headers: {
              'Authorization': `Client-ID ${unsplashAccessKey}`
            }
          }
        );

        if (unsplashResponse.ok) {
          const data = await unsplashResponse.json();
          if (data.results && data.results.length > 0) {
            productImageUrl = data.results[0].urls.regular;
            console.log('Found image from Unsplash API:', productImageUrl);
          }
        }
      } catch (error) {
        console.error('Error calling Unsplash API:', error);
      }
    }

    // Fallback to Unsplash Source if API failed or no key
    if (!productImageUrl) {
      const searchTerms = `${brand} ${model}`.trim().replace(/\s+/g, '-').toLowerCase();
      productImageUrl = `https://source.unsplash.com/400x600/?fashion,${searchTerms}`;
      console.log('Using Unsplash Source fallback:', productImageUrl);
    }

    // Add image URL and other provided info
    productInfo.imageUrl = productImageUrl;
    productInfo.material = material;
    productInfo.color = color;

    console.log('Final product info:', productInfo);

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
