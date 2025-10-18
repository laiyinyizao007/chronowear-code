import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    console.log('Searching product info for:', brand, model);

    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    let productImageUrl = '';

    if (unsplashAccessKey) {
      // Use official Unsplash API when key is available
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
        } else {
          console.error('Unsplash API error:', await unsplashResponse.text());
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

    const productInfo = {
      imageUrl: productImageUrl,
      price: "$129",
      style: "Classic and versatile style",
      material: "Premium quality materials",
      color: "Standard",
      availability: "Available online",
      features: ["Premium quality", "Comfortable fit", "Durable construction"]
    };

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
