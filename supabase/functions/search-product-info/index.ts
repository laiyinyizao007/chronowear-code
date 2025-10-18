import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple price estimation based on brand and type
const estimatePrice = (brand: string, type: string): number => {
  const brandLower = brand?.toLowerCase() || '';
  const typeLower = type?.toLowerCase() || '';
  
  // Premium brands
  if (['gucci', 'prada', 'louis vuitton', 'chanel', 'dior', 'hermès'].some(b => brandLower.includes(b))) {
    return typeLower.includes('coat') || typeLower.includes('jacket') ? 2500 : 800;
  }
  
  // High-end brands
  if (['canada goose', 'moncler', 'burberry', 'ralph lauren'].some(b => brandLower.includes(b))) {
    return typeLower.includes('coat') || typeLower.includes('jacket') ? 1200 : 400;
  }
  
  // Mid-range brands
  if (['zara', 'h&m', 'uniqlo', 'gap', 'cos'].some(b => brandLower.includes(b))) {
    return typeLower.includes('coat') || typeLower.includes('jacket') ? 150 : 50;
  }
  
  // Default pricing by type
  if (typeLower.includes('coat') || typeLower.includes('jacket')) return 200;
  if (typeLower.includes('dress')) return 80;
  if (typeLower.includes('shirt') || typeLower.includes('top')) return 40;
  if (typeLower.includes('pants') || typeLower.includes('jeans')) return 60;
  if (typeLower.includes('shoes')) return 100;
  
  return 50; // Default
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, model, type, material, color } = await req.json();

    console.log('Searching product info for:', { brand, model, type, material, color });

    // Estimate price based on brand and type
    const estimatedPrice = estimatePrice(brand || 'Generic', type || 'Clothing');
    
    const productInfo: any = {
      official_price: estimatedPrice,
      price: `$${estimatedPrice.toFixed(2)}`,
      style: "Classic and versatile style",
      features: ["Quality construction", "Comfortable fit", "Durable materials"],
      availability: "Available online",
      material: material,
      color: color
    };

    // Get product image from Unsplash
    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    let productImageUrl = '';

    // Build search query using type and color for better results
    const searchQuery = [type, color, brand, 'fashion', 'clothing']
      .filter(Boolean)
      .join(' ')
      .trim();
    
    console.log('Searching Unsplash with query:', searchQuery);

    if (unsplashAccessKey) {
      try {
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=3&orientation=portrait`,
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
          console.error('Unsplash API error:', unsplashResponse.status);
        }
      } catch (error) {
        console.error('Error calling Unsplash API:', error);
      }
    }

    // Fallback to Unsplash Source if API failed or no key
    if (!productImageUrl) {
      const fallbackTerms = [type, color].filter(Boolean).join(',').replace(/\s+/g, '-').toLowerCase();
      productImageUrl = `https://source.unsplash.com/400x600/?${fallbackTerms || 'fashion'}`;
      console.log('Using Unsplash Source fallback:', productImageUrl);
    }

    // Add image URL
    productInfo.imageUrl = productImageUrl;

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
