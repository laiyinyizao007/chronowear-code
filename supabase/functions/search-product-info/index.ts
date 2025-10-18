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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Searching product info for:', brand, model);

    // 使用免费的Unsplash API作为备选方案
    let productImageUrl = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`;
    
    // 尝试从Unsplash搜索相关图片
    try {
      const unsplashQuery = encodeURIComponent(`${brand} ${model} fashion clothing`);
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${unsplashQuery}&per_page=1&client_id=demo`;
      
      const unsplashResponse = await fetch(unsplashUrl);
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json();
        if (unsplashData.results?.[0]?.urls?.regular) {
          productImageUrl = unsplashData.results[0].urls.regular;
          console.log('Found Unsplash image:', productImageUrl);
        }
      }
    } catch (e) {
      console.log('Unsplash search failed, using fallback');
    }

    // 基础产品信息（无AI生成）
    const productInfo = {
      imageUrl: productImageUrl,
      price: "$129",
      style: `${brand} ${model}`,
      material: "Premium materials",
      color: "Standard",
      availability: "Check Availability",
      features: ["Quality construction", "Comfortable fit", "Versatile style"]
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
