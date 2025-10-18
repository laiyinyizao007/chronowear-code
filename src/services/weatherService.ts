import { supabase } from "@/integrations/supabase/client";
import { WeatherData } from "@/types";

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Get current geolocation
 */
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  const defaultLocation = {
    latitude: 35.6764225, // Default: Tokyo
    longitude: 139.650027,
  };

  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000,
        });
      }
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.warn("Geolocation failed, using default coords:", error);
    return defaultLocation;
  }
};

/**
 * Fetch weather data from Supabase edge function
 */
export const fetchWeather = async (
  latitude: number,
  longitude: number
): Promise<WeatherData> => {
  const { data, error } = await supabase.functions.invoke("get-weather", {
    body: { lat: latitude, lng: longitude },
  });

  if (error) throw error;
  return data as WeatherData;
};

/**
 * Get current location and weather in one call
 */
export const getLocationAndWeather = async (): Promise<{
  location: { latitude: number; longitude: number };
  weather: WeatherData;
}> => {
  const location = await getCurrentLocation();
  const weather = await fetchWeather(location.latitude, location.longitude);
  return { location, weather };
};
