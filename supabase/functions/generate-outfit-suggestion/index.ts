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
    const { selectedItem, userGarments } = await req.json();
    console.log('Generating outfit suggestions for:', selectedItem);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Define categories based on the selected item
    const categories = ["top", "bottom", "shoes", "accessories", "hairstyle"];
    const selectedCategory = selectedItem.type.toLowerCase().includes("top") ? "top" :
                            selectedItem.type.toLowerCase().includes("pant") || selectedItem.type.toLowerCase().includes("skirt") ? "bottom" :
                            selectedItem.type.toLowerCase().includes("shoe") ? "shoes" :
                            selectedItem.type.toLowerCase().includes("accessories") ? "accessories" : "top";
    
    // Get categories to suggest (exclude the selected one)
    const categoriesToSuggest = categories.filter(c => c !== selectedCategory);

    const systemPrompt = `You are a professional fashion stylist AI. Your task is to suggest complementary clothing items to complete an outfit based on a user's selected piece.

For each category, suggest ONE specific item that would complement the selected piece. Include:
- category: The category name (top/bottom/shoes/accessories/hairstyle)
- name: A descriptive name of the item (e.g., "Classic White T-Shirt", "Dark Blue Slim Fit Jeans")
- brand: A real fashion brand that makes this type of item (optional but preferred)
- description: Brief style description

Focus on creating a cohesive, stylish outfit. Consider color coordination, style matching, and current fashion trends.

Return ONLY a valid JSON object with this structure:
{
  "recommendations": [
    {
      "category": "bottom",
      "name": "Dark Blue Slim Fit Jeans",
      "brand": "Levi's",
      "description": "Classic slim fit jeans in dark wash"
    }
  ]
}`;

    const userPrompt = `I've selected this item: ${selectedItem.type} by ${selectedItem.brand || "unknown brand"}, color: ${selectedItem.color || "unknown"}.

${userGarments && userGarments.length > 0 ? `
My closet contains these items (you can reference them but don't feel limited to them):
${userGarments.map((g: any) => `- ${g.type} by ${g.brand}, color: ${g.color}`).join('\n')}
` : ''}

Please suggest complementary items for these categories: ${categoriesToSuggest.join(", ")}.
Make the suggestions specific, stylish, and coordinated with the selected item.

Return the response as a JSON object.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("AI API error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON response (handle markdown code blocks)
    let parsed;
    if (content.includes("```json")) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      }
    } else if (content.includes("```")) {
      const jsonMatch = content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      }
    } else {
      parsed = JSON.parse(content);
    }

    console.log("Generated outfit suggestions:", parsed);

    return new Response(
      JSON.stringify(parsed),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error: any) {
    console.error("Error in generate-outfit-suggestion function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to generate outfit suggestions" 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});
