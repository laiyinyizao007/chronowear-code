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
    const { imageUrl } = await req.json();
    console.log('Received request with imageUrl:', imageUrl);
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured', garments: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Gemini Vision analysis for:', imageUrl);
    
    // Use Gemini Vision API directly to analyze the garment image
    return await analyzeGarmentImage(imageUrl, GEMINI_API_KEY, corsHeaders);
  } catch (error) {
    console.error('Error in identify-garment main handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, garments: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Main function to analyze garment image using Gemini Vision API
async function analyzeGarmentImage(imageUrl: string, apiKey: string, corsHeaders: Record<string, string>) {
  console.log('Using Gemini Vision API to analyze garment image');
  console.log('Image URL:', imageUrl);
  
  try {
    // Fetch and convert image to base64
    console.log('Fetching image from URL...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    console.log('Image fetched successfully, content-type:', imageResponse.headers.get('content-type'));
    
    console.log('Converting image to base64...');
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    console.log('Image converted to base64, size:', base64Image.length, 'bytes');
    
    // Enhanced prompt for better garment identification
    const prompt = `Analyze this clothing/outfit image carefully and identify ALL visible garments and accessories.

For EACH distinct item you can see (even if partially visible), provide:
1. Brand name (if recognizable from logos, patterns, or style - make educated guesses based on fashion knowledge)
2. Specific model/product name or style description
3. Type (must be one of: Top, Bottom, Shoes, Bag, Accessory, Outerwear)
4. Dominant color
5. Material type (cotton, denim, leather, synthetic, etc.)

IMPORTANT:
- Identify EVERY separate item visible
- For brand, use your knowledge of fashion brands and their signature styles
- If brand is unknown, use "Generic" or make an educated guess based on style
- Be specific with model names (e.g., "Stan Smith", "501 Original Fit")
- Include accessories like bags, watches, belts, hats

Return ONLY this exact JSON format (no other text):
{
  "garments": [
    {
      "brand": "Brand Name",
      "model": "Model/Style Name",
      "type": "Top|Bottom|Shoes|Bag|Accessory|Outerwear",
      "color": "Color Name",
      "material": "Material Type"
    }
  ]
}`;

    console.log('Calling Gemini Vision API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: imageBlob.type,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Vision API error:', response.status, errorText);
      throw new Error(`Gemini Vision API error: ${response.status} - ${errorText}`);
    }
    
    console.log('Gemini API response received successfully');

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini Vision response:', content);

    let results: any;
    try {
      // Try to parse as JSON directly first
      results = JSON.parse(content);
    } catch (e) {
      // If that fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No valid JSON found in response:', content);
        results = { garments: [] };
      }
    }
    
    // Ensure results has garments array
    if (!results.garments || !Array.isArray(results.garments)) {
      console.warn('Invalid results format, returning empty garments');
      results = { garments: [] };
    }
    
    console.log(`Successfully identified ${results.garments.length} garments`);
    
    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyzeGarmentImage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
    console.error('Detailed error:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        garments: [] 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}