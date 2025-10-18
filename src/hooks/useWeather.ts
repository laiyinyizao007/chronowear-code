import { useState } from "react";
import { WeatherData } from "@/types";
import { getLocationAndWeather as getLocationAndWeatherService } from "@/services/weatherService";

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const { weather: weatherData } = await getLocationAndWeatherService();
      setWeather(weatherData);
      return weatherData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    weather,
    loading,
    error,
    fetchWeather,
  };
};
