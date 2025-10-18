import { supabase } from "@/integrations/supabase/client";
import { WeatherData } from "@/types";

/**
 * Generate outfit image using AI
 */
export const generateOutfitImage = async (
  outfit: any,
  weather?: WeatherData
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "generate-outfit-image",
      {
        body: {
          items: outfit.items || [],
          weather: weather?.current,
          hairstyle: outfit.hairstyle,
        },
      }
    );

    if (error) throw error;
    return data?.imageUrl || null;
  } catch (error) {
    console.error("AI image generation unavailable:", error);
    // Fallback to first item image if available
    return outfit.items?.[0]?.imageUrl || null;
  }
};

/**
 * Update today's pick image in database
 */
export const updateTodaysPickImage = async (
  pickId: string,
  imageUrl: string
): Promise<void> => {
  await supabase
    .from("todays_picks")
    .update({ image_url: imageUrl })
    .eq("id", pickId);
};

/**
 * Get random fashion image
 */
export const getRandomFashionImage = (): string => {
  const images = [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80",
  ];
  return images[Math.floor(Math.random() * images.length)];
};
