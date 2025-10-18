import { supabase } from "@/integrations/supabase/client";
import { Outfit, WeatherData, OutfitItem } from "@/types";

/**
 * Search product information including image
 */
export const searchProductInfo = async (
  brand: string,
  model: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-product-info', {
      body: { brand, model }
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
 * Enrich outfit items with images from user's closet
 */
export const enrichItemsWithImages = async (
  items: OutfitItem[],
  garments: any[]
): Promise<OutfitItem[]> => {
  return items.map((item) => {
    const matchingGarment = garments.find(
      (g) =>
        g.type?.toLowerCase() === item.type?.toLowerCase() &&
        g.color?.toLowerCase() === item.color?.toLowerCase()
    );

    return {
      ...item,
      imageUrl: matchingGarment?.image_url || item.imageUrl,
      fromCloset: !!matchingGarment,
    };
  });
};

/**
 * Enrich outfit items with product images from online search
 */
export const enrichItemsWithProductImages = async (
  items: OutfitItem[],
  garments: any[]
): Promise<OutfitItem[]> => {
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      // If item is from closet, use garment image
      if (item.fromCloset && item.imageUrl) {
        return item;
      }
      
      // For items with brand and model, search for product image
      if (!item.fromCloset && item.brand && item.model) {
        const productData = await searchProductInfo(item.brand, item.model);
        
        return {
          ...item,
          imageUrl: productData?.imageUrl || item.imageUrl
        };
      }
      
      return item;
    })
  );
  
  return enrichedItems;
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
 * Save today's pick to database
 */
export const saveTodaysPick = async (
  userId: string,
  date: string,
  outfit: Outfit,
  weather: WeatherData
): Promise<any> => {
  const { data, error } = await supabase
    .from("todays_picks")
    .insert([{
      user_id: userId,
      date,
      title: outfit.title,
      summary: outfit.summary,
      hairstyle: outfit.hairstyle,
      items: outfit.items as any,
      weather: weather as any,
    }])
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
