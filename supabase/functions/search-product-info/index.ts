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
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!SERPAPI_KEY || !LOVABLE_API_KEY) {
      throw new Error('API keys not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Searching product info for:', brand, model);

    // Step 1: Search for product using Google Shopping
    const searchQuery = `${brand} ${model}`;
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}`;
    
    console.log('Calling Google Shopping API...');
    const serpResponse = await fetch(serpApiUrl);
    
    let productImageUrl = '';
    let productPrice = '';
    let productAvailability = '';
    
    if (serpResponse.ok) {
      const serpData = await serpResponse.json();
      console.log('Google Shopping results:', JSON.stringify(serpData).substring(0, 500));
      
      // Extract first product result
      const shoppingResults = serpData.shopping_results || [];
      if (shoppingResults.length > 0) {
        const firstResult = shoppingResults[0];
        productImageUrl = firstResult.thumbnail || '';
        productPrice = firstResult.price || '';
        productAvailability = firstResult.delivery ? 'In Stock' : 'Check Availability';
        
        console.log('Found product image:', productImageUrl);
        console.log('Product price:', productPrice);
      }
    }

    // Step 2: Use AI to generate additional product details
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Generate detailed product information for "${brand} ${model}". Return ONLY valid JSON:
{
  "style": "concise style description (1-2 sentences)",
  "material": "material type",
  "color": "primary color",
  "features": ["feature 1", "feature 2", "feature 3"]
}

Be factual and avoid making up specific details if unsure.`
          }
        ],
        temperature: 0.3,
      }),
    });

    let aiDetails = {
      style: "Classic style",
      material: "Quality materials", 
      color: "Standard",
      features: ["Premium quality", "Comfortable fit", "Durable construction"]
    };

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiDetails = { ...aiDetails, ...JSON.parse(jsonMatch[0]) };
          }
        } catch (e) {
          console.error('Failed to parse AI details:', e);
        }
      }
    }

    // Step 3: Download and rehost the product image if available
    if (productImageUrl && productImageUrl.startsWith('http')) {
      try {
        console.log('Downloading product image from:', productImageUrl);
        const imageResponse = await fetch(productImageUrl, { redirect: 'follow' as RequestRedirect });
        
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          const arrayBuffer = await imageResponse.arrayBuffer();
          const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const path = `${safe(brand)}/${safe(model)}-${Date.now()}.${ext}`;
          
          const uint8 = new Uint8Array(arrayBuffer);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, uint8, {
              contentType,
              upsert: false
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(path);
            
            productImageUrl = publicUrl;
            console.log('Image rehosted successfully:', publicUrl);
          }
        }
      } catch (imageError) {
        console.error('Error downloading/uploading image:', imageError);
      }
    }

    // Fallback image if no valid image found
    if (!productImageUrl || !productImageUrl.startsWith('http')) {
      console.log('Using fallback image');
      productImageUrl = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80`;
    }

    const productInfo = {
      imageUrl: productImageUrl,
      price: productPrice || "$129",
      style: aiDetails.style,
      material: aiDetails.material,
      color: aiDetails.color,
      availability: productAvailability || "Check Availability",
      features: aiDetails.features
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
