import { supabase } from "@/integrations/supabase/client";

interface IdentifiedGarment {
  brand: string;
  model: string;
  type: string;
  color: string;
  material: string;
}

/**
 * Identify garments from an image using AI
 * Uses Google Lens reverse image search + Gemini AI analysis
 */
export const identifyGarmentsFromImage = async (
  imageUrl: string,
  getMoreResults: boolean = false
): Promise<IdentifiedGarment[]> => {
  try {
    const { data, error } = await supabase.functions.invoke("identify-garment", {
      body: { imageUrl, getMoreResults },
    });

    if (error) throw error;

    if (data.garments && Array.isArray(data.garments)) {
      return data.garments;
    }
    return [];
  } catch (error: any) {
    console.error("Garment identification error:", error);
    return [];
  }
};

/**
 * Get washing frequency and care instructions recommendation
 */
export const getWashingRecommendation = async (
  material: string,
  type: string
): Promise<{ frequency: string | null; care_instructions: string | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "recommend-washing-frequency",
      {
        body: { material, type },
      }
    );

    if (error) throw error;

    return {
      frequency: data?.frequency || null,
      care_instructions: data?.care_instructions || null,
    };
  } catch (error) {
    console.error("Failed to get washing recommendation:", error);
    return {
      frequency: null,
      care_instructions: null,
    };
  }
};
