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

    // 专门为去背人物设计的提示词
    const prompt = `full body portrait of a fashion model wearing ${itemDescriptions}, ${hairstyle || 'styled hair'}, ${weatherContext}, pure white background, isolated person, no background, professional fashion photography, studio lighting, clean cutout, PNG style, centered composition, high quality`;

    console.log('Image generation prompt:', prompt);

    // 使用Pollinations.ai - 完全免费，无需API密钥
    // 添加noBackground参数和更高质量设置来生成去背图片
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&model=flux&nologo=true&enhance=true&noBackground=true&private=true&seed=${Date.now()}`;

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