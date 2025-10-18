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

    // Use Unsplash Source for direct image URLs without API key
    // This provides random fashion-related images based on search terms
    const searchTerms = `${brand} ${model}`.trim().replace(/\s+/g, '-').toLowerCase();
    let productImageUrl = `https://source.unsplash.com/400x600/?fashion,${searchTerms}`;
    
    console.log('Using Unsplash Source URL:', productImageUrl);

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
