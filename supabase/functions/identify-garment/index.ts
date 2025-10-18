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
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!SERPAPI_KEY || !GEMINI_API_KEY) {
      throw new Error('API keys not configured');
    }

    console.log('Starting Google reverse image search for:', imageUrl);

    // Step 1: Use SerpAPI to perform Google reverse image search
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${SERPAPI_KEY}`;
    
    console.log('Calling SerpAPI...');
    const serpResponse = await fetch(serpApiUrl);
    
    if (!serpResponse.ok) {
      const errorText = await serpResponse.text();
      console.error('SerpAPI error:', serpResponse.status, errorText);
      throw new Error(`SerpAPI error: ${serpResponse.status}`);
    }

    const serpData = await serpResponse.json();
    console.log('SerpAPI results:', JSON.stringify(serpData).substring(0, 500));

    // Extract visual matches and related products from Google Lens results
    const visualMatches = serpData.visual_matches || [];
    const relatedProducts = serpData.knowledge_graph?.related_results || [];
    
    // Combine results for AI analysis
    const searchResults = [...visualMatches.slice(0, 10), ...relatedProducts.slice(0, 5)];
    
    if (searchResults.length === 0) {
      console.log('No results from SerpAPI, falling back to direct AI analysis');
      return await directAIAnalysis(imageUrl, GEMINI_API_KEY, corsHeaders);
    }

    // Step 2: Use Gemini to analyze the Google search results
    console.log('Analyzing search results with Gemini...');
    const prompt = `Based on these Google reverse image search results, identify ALL visible clothing items and accessories in the outfit.

Search Results:
${JSON.stringify(searchResults, null, 2)}

For EACH distinct item visible (tops, bottoms, shoes, bags, accessories, outerwear), identify:
1. The most likely brand and exact model/product name
2. Type of item
3. Color and material if identifiable

Return ONLY valid JSON in this exact format:
{
  "garments": [
    {
      "brand": "exact brand name",
      "model": "exact model/product name", 
      "type": "Top/Bottom/Shoes/Bag/Accessory/Outerwear",
      "color": "color name",
      "material": "material type"
    }
  ]
}

Include a separate entry for each distinct item. Be specific with brand and model names based on the search results.`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    console.log('Gemini analysis result:', content);

    let results;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        results = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in identify-garment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback function for direct AI analysis when Google search fails
async function directAIAnalysis(imageUrl: string, apiKey: string, corsHeaders: Record<string, string>) {
  console.log('Using direct Gemini vision analysis as fallback');
  
  // Convert image URL to base64 if needed
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: 'Analyze this outfit photo and identify ALL visible clothing items and accessories. For each item, identify the most likely brand and model. Return ONLY valid JSON: {"garments": [{"brand": "string", "model": "string", "type": "Top/Bottom/Shoes/Bag/Accessory/Outerwear", "color": "string", "material": "string"}]}'
          },
          {
            inline_data: {
              mime_type: imageBlob.type,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2048,
      }
    }),
  });

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const results = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  
  return new Response(
    JSON.stringify(results),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}