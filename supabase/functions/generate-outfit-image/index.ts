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
    const { items, weather, hairstyle } = await req.json();
    
    console.log('Generating outfit image for items:', items);

    // Build descriptive prompt from outfit items
    const itemDescriptions = items
      .filter((item: any) => item.type !== 'Hairstyle')
      .map((item: any) => `${item.color || ''} ${item.type} ${item.brand ? `by ${item.brand}` : ''}`.trim())
      .join(', ');

    const weatherContext = weather 
      ? `in ${weather.weatherDescription} weather, ${weather.temperature}°F`
      : '';

    const prompt = `Fashion photography, full body shot of person wearing ${itemDescriptions}, ${hairstyle || 'styled hair'}, ${weatherContext}, professional studio lighting, clean background, high quality, 8k`;

    console.log('Image generation prompt:', prompt);

    // 使用Pollinations.ai - 完全免费，无需API密钥
    // 右侧卡片是 w-2/3，aspect-[3/4] (宽:高 = 3:4)
    // 使用768x1024的尺寸来匹配3:4比例，确保图片填充整个frame
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&model=flux&nologo=true&enhance=true&seed=${Date.now()}`;

    console.log('Image generated with Pollinations.ai');

    return new Response(
      JSON.stringify({ imageUrl }),
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