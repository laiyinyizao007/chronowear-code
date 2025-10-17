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
    const { userPhotoUrl, outfitImages } = await req.json();
    
    console.log('Generating virtual try-on...');
    console.log('User photo:', userPhotoUrl);
    console.log('Outfit images count:', outfitImages?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Use AI to describe how to composite the outfit onto the user's body
    const prompt = `You are a fashion visualization expert. Given a full-body photo of a person and multiple garment images, describe how to realistically overlay these garments onto the person's body.

User photo: ${userPhotoUrl}
Garments: ${outfitImages.map((img: any, idx: number) => `${idx + 1}. ${img.type}: ${img.url}`).join('\n')}

Provide a detailed description of:
1. How each garment would fit on the person's body
2. Where each garment should be positioned (considering body proportions)
3. Any adjustments needed for realistic appearance
4. Color and lighting considerations to match the original photo

Keep the response concise and technical (100-150 words).`;

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
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: { url: userPhotoUrl }
              },
              ...outfitImages.map((img: any) => ({
                type: 'image_url',
                image_url: { url: img.url }
              }))
            ]
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;

    if (!description) {
      throw new Error('No description generated');
    }

    console.log('Generated description:', description.substring(0, 100));

    // For now, return the description and the original images
    // In a production version, you would use a specialized virtual try-on model
    return new Response(
      JSON.stringify({
        success: true,
        description,
        userPhotoUrl,
        outfitImages,
        note: "This is a preview feature. For best results, consider using a specialized virtual try-on service."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-virtual-tryon:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});