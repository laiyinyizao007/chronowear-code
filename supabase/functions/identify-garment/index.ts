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
    const { imageUrl, getMoreResults } = await req.json();
    console.log('Received request with imageUrl:', imageUrl, 'getMoreResults:', getMoreResults);
    
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
    return await analyzeGarmentImage(imageUrl, getMoreResults || false, GEMINI_API_KEY, corsHeaders);
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
async function analyzeGarmentImage(imageUrl: string, getMoreResults: boolean, apiKey: string, corsHeaders: Record<string, string>) {
  console.log('Using Gemini Vision API to analyze garment image');
  console.log('Image URL:', imageUrl, 'Get more results:', getMoreResults);
  
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
    
    // Convert to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(imageBuffer);
    const chunkSize = 8192;
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Image = btoa(binaryString);
    console.log('Image converted to base64, size:', base64Image.length, 'bytes');
    
    // Different prompts based on whether getting more or initial results
    const prompt = getMoreResults ? 
      `Analyze this clothing/outfit image and provide EXACTLY 3 ALTERNATIVE product identifications that are DIFFERENT from previous results.

Focus on:
- Less common but plausible brand interpretations
- Alternative style descriptions  
- Similar items from mid-tier or affordable brands

CRITICAL: You MUST provide EXACTLY 3 different garment identifications.

For EACH of the 3 items, provide:
1. Brand name (suggest alternative brands or use "Generic" if uncertain)
2. Model/product name or style description  
3. Type (Top, Bottom, Shoes, Bag, Accessory, or Outerwear)
4. Dominant color
5. Material type

Return ONLY this exact JSON format with EXACTLY 3 items:
{
  "garments": [
    {
      "brand": "Brand Name 1",
      "model": "Model/Style Name 1",
      "type": "Bottom",
      "color": "Color Name",
      "material": "Material Type"
    },
    {
      "brand": "Brand Name 2",
      "model": "Model/Style Name 2",
      "type": "Bottom",
      "color": "Color Name",
      "material": "Material Type"
    },
    {
      "brand": "Brand Name 3",
      "model": "Model/Style Name 3",
      "type": "Bottom",
      "color": "Color Name",
      "material": "Material Type"
    }
  ]
}` :
      `Analyze this clothing/outfit image carefully and identify EXACTLY 3 MOST LIKELY products.

CRITICAL: You MUST provide EXACTLY 3 different product identifications, ranked from most likely to least likely.

For EACH of the 3 matches, provide:
1. Brand name (make educated guesses based on logos, patterns, or style - be creative but realistic)
2. Specific model/product name or style description
3. Type (must be one of: Top, Bottom, Shoes, Bag, Accessory, Outerwear)
4. Dominant color
5. Material type (cotton, denim, leather, synthetic, polyester, etc.)

Guidelines:
- First item: Most likely brand and model based on visible details
- Second item: Alternative plausible brand interpretation
- Third item: Another reasonable option or generic brand alternative
- Use fashion knowledge to identify brands from visual cues
- Be specific with model names when possible

Return ONLY this exact JSON format with EXACTLY 3 items (no other text):
{
  "garments": [
    {
      "brand": "Most Likely Brand",
      "model": "Most Likely Model",
      "type": "Bottom",
      "color": "Color Name",
      "material": "Material Type"
    },
    {
      "brand": "Alternative Brand",
      "model": "Alternative Model",
      "type": "Bottom",
      "color": "Color Name",
      "material": "Material Type"
    },
    {
      "brand": "Third Option Brand",
      "model": "Third Option Model",
      "type": "Bottom",
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