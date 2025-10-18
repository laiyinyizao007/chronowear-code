import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TodaysPick, Outfit, WeatherData } from "@/types";
import {
  generateOutfitRecommendation,
  saveTodaysPick,
  deleteTodaysPick,
  createFallbackOutfit,
  enrichItemsWithImages,
} from "@/services/outfitService";
import {
  generateOutfitImage,
  updateTodaysPickImage,
} from "@/services/imageService";
import { calculateDistance, getCurrentLocation } from "@/services/weatherService";

export const useTodaysPick = () => {
  const [todaysPick, setTodaysPick] = useState<TodaysPick | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  /**
   * Load today's pick from database or generate new one
   */
  const loadTodaysPick = async (
    weather: WeatherData,
    forceRefresh: boolean = false
  ): Promise<TodaysPick | null> => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // First check if today's pick exists
      const { data: existingPick } = await supabase
        .from("todays_picks")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      // If exists and not force refresh, check if we can use cache
      if (existingPick && !forceRefresh) {
        const currentLocation = await getCurrentLocation();
        const savedWeather = existingPick.weather as any;
        
        const needsRefresh =
          !savedWeather?.latitude ||
          !savedWeather?.longitude ||
          calculateDistance(
            savedWeather.latitude,
            savedWeather.longitude,
            currentLocation.latitude,
            currentLocation.longitude
          ) > 10;

        if (!needsRefresh) {
          // Use cached pick - no need to regenerate
          const pick = existingPick as any as TodaysPick;
          setTodaysPick(pick);
          setOutfit({
            title: existingPick.title,
            summary: existingPick.summary,
            hairstyle: existingPick.hairstyle,
            items: existingPick.items as any,
          });

          // Set image with fallback
          const itemsArr = (existingPick.items as any[]) || [];
          const fallbackHero =
            itemsArr.find((it: any) => it?.imageUrl)?.imageUrl || "";
          setImageUrl(existingPick.image_url || fallbackHero);

          return pick;
        }
      }

      // Need to generate new recommendation
      // Delete existing record if present to avoid duplicate key error
      if (existingPick) {
        await deleteTodaysPick(user.id, today);
      }

      const { data: garments } = await supabase
        .from("garments")
        .select("id, type, color, material, brand, image_url");

      let outfits: Outfit[];
      try {
        outfits = await generateOutfitRecommendation(weather, garments || []);
        
        // Enrich items with images from closet or product search
        if (outfits[0]?.items) {
          const enrichedItems = await enrichItemsWithImages(
            outfits[0].items,
            garments || []
          );
          outfits[0].items = enrichedItems;
        }
      } catch (error) {
        console.error("AI service unavailable, using fallback:", error);
        outfits = await createFallbackOutfit(garments || []);
      }

      if (outfits[0]) {
        const savedPick = await saveTodaysPick(
          user.id,
          today,
          outfits[0],
          weather
        );
        setTodaysPick(savedPick);
        setOutfit(outfits[0]);

        // Generate and save image
        await generateAndSaveImage(outfits[0], weather, savedPick.id);

        return savedPick;
      }

      return null;
    } catch (error) {
      console.error("Error loading today's pick:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate outfit image and save to database
   */
  const generateAndSaveImage = async (
    outfit: Outfit,
    weather?: WeatherData,
    pickId?: string
  ) => {
    setGeneratingImage(true);
    try {
      const imageUrl = await generateOutfitImage(outfit, weather);
      if (imageUrl) {
        setImageUrl(imageUrl);
        const targetId = pickId || todaysPick?.id;
        if (targetId) {
          await updateTodaysPickImage(targetId, imageUrl);
        }
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  /**
   * Toggle like status
   */
  const toggleLike = async () => {
    if (!todaysPick) return;

    const newLikedStatus = !todaysPick.is_liked;
    setTodaysPick({ ...todaysPick, is_liked: newLikedStatus });

    try {
      const { error } = await supabase
        .from("todays_picks")
        .update({ is_liked: newLikedStatus })
        .eq("id", todaysPick.id);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to update like status:", error);
      setTodaysPick({ ...todaysPick, is_liked: !newLikedStatus }); // Revert
      throw error;
    }
  };

  /**
   * Mark as added to OOTD
   */
  const markAddedToOOTD = async () => {
    if (!todaysPick) return;

    setTodaysPick({ ...todaysPick, added_to_ootd: true });

    try {
      const { error } = await supabase
        .from("todays_picks")
        .update({ added_to_ootd: true })
        .eq("id", todaysPick.id);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to mark as added to OOTD:", error);
      setTodaysPick({ ...todaysPick, added_to_ootd: false }); // Revert
      throw error;
    }
  };

  return {
    todaysPick,
    outfit,
    imageUrl,
    loading,
    generatingImage,
    loadTodaysPick,
    generateAndSaveImage,
    toggleLike,
    markAddedToOOTD,
  };
};
