import { supabase } from "@/integrations/supabase/client";
import { Outfit, WeatherData, OutfitItem } from "@/types";

/**
 * Search product information including image
 */
export const searchProductInfo = async (
  brand: string,
  model: string,
  type?: string,
  material?: string,
  color?: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-product-info', {
      body: { brand, model, type, material, color }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to search product info:', error);
    return null;
  }
};

/**
 * Generate outfit recommendation using AI
 */
export const generateOutfitRecommendation = async (
  weather: WeatherData,
  garments: any[]
): Promise<Outfit[]> => {
  const { data, error } = await supabase.functions.invoke(
    "generate-outfit-recommendation",
    {
      body: {
        temperature: weather.current.temperature,
        weatherDescription: weather.current.weatherDescription,
        uvIndex: weather.current.uvIndex,
        garments: garments || [],
      },
    }
  );

  if (error) throw error;
  return data.outfits || [];
};

/**
 * Enrich outfit items with images from user's closet or product search
 * Prioritizes closet items if they match by brand and model
 */
export const enrichItemsWithImages = async (
  items: OutfitItem[],
  garments: any[]
): Promise<OutfitItem[]> => {
  return Promise.all(
    items.map(async (item) => {
      // Only match by brand + model
      const matchingGarment = item.brand && item.model 
        ? garments.find((g) => 
            g.brand?.toLowerCase() === item.brand?.toLowerCase() &&
            g.model?.toLowerCase() === item.model?.toLowerCase()
          )
        : null;

      if (matchingGarment) {
        // Use complete information from closet
        return {
          ...item,
          imageUrl: matchingGarment.image_url,
          brand: matchingGarment.brand || item.brand,
          model: matchingGarment.model || item.model,
          color: matchingGarment.color || item.color,
          material: matchingGarment.material || item.material,
          type: matchingGarment.type || item.type,
          fromCloset: true,
        };
      }

      // If not in closet and has brand/model, search for product image
      if (item.brand && item.model) {
        const productData = await searchProductInfo(item.brand, item.model);
        return {
          ...item,
          imageUrl: productData?.imageUrl || item.imageUrl,
          fromCloset: false,
        };
      }

      return {
        ...item,
        fromCloset: false,
      };
    })
  );
};


/**
 * Create fallback outfit when AI is unavailable
 */
export const createFallbackOutfit = async (
  garments: any[]
): Promise<Outfit[]> => {
  const basicOutfits = [
    {
      title: "Casual Chic",
      summary:
        "Perfect casual outfit for today's weather with complete accessories",
      hairstyle: "Natural wavy hair",
      items: [
        {
          type: "Hairstyle",
          name: "Natural Waves",
          description: "Soft, natural wavy hairstyle",
          fromCloset: false,
        },
        {
          type: "Top",
          name: "White T-Shirt",
          brand: "Uniqlo",
          model: "Basic Tee",
          color: "White",
          material: "Cotton",
          fromCloset: false,
        },
        {
          type: "Bottom",
          name: "Blue Jeans",
          brand: "Levi's",
          model: "501",
          color: "Blue",
          material: "Denim",
          fromCloset: false,
        },
        {
          type: "Shoes",
          name: "White Sneakers",
          brand: "Adidas",
          model: "Stan Smith",
          color: "White",
          material: "Leather",
          fromCloset: false,
        },
        {
          type: "Bag",
          name: "Tote Bag",
          brand: "Canvas",
          model: "Classic",
          color: "Beige",
          material: "Canvas",
          fromCloset: false,
        },
        {
          type: "Accessories",
          name: "Watch",
          brand: "Casio",
          model: "Simple",
          color: "Silver",
          material: "Metal",
          fromCloset: false,
        },
      ],
    },
  ];

  const enrichedOutfits = await Promise.all(
    basicOutfits.map(async (outfit) => {
      const enrichedItems = await enrichItemsWithImages(
        outfit.items as OutfitItem[],
        garments || []
      );
      return { ...outfit, items: enrichedItems };
    })
  );

  return enrichedOutfits;
};

/**
 * Save today's pick to database (uses upsert to avoid duplicate key conflicts)
 */
export const saveTodaysPick = async (
  userId: string,
  date: string,
  outfit: Outfit,
  weather: WeatherData
): Promise<any> => {
  const { data, error } = await supabase
    .from("todays_picks")
    .upsert({
      user_id: userId,
      date,
      title: outfit.title,
      summary: outfit.summary,
      hairstyle: outfit.hairstyle,
      items: outfit.items as any,
      weather: weather as any,
    }, {
      onConflict: 'user_id,date',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete today's pick for a specific date
 */
export const deleteTodaysPick = async (
  userId: string,
  date: string
): Promise<void> => {
  await supabase
    .from("todays_picks")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
};
