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

    // Use Unsplash API as free alternative
    const searchQuery = `${brand} ${model} fashion clothing`;
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&client_id=your_access_key`;
    
    let productImageUrl = '';
    
    try {
      // Try Unsplash first
      const unsplashResponse = await fetch(unsplashUrl);
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json();
        if (unsplashData.results?.[0]?.urls?.regular) {
          productImageUrl = unsplashData.results[0].urls.regular;
          console.log('Found image from Unsplash:', productImageUrl);
        }
      }
    } catch (error) {
      console.error('Unsplash search failed:', error);
    }

    // Fallback to generic fashion image if no image found
    if (!productImageUrl) {
      console.log('Using fallback image');
      productImageUrl = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`;
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
