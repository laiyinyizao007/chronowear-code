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
    const { lat, lng } = await req.json();
    
    console.log('Getting weather for coordinates:', { lat, lng });

    // Using Open-Meteo API (free, no API key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,uv_index_max&temperature_unit=fahrenheit&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const weatherData = await weatherResponse.json();
    
    // Get location name using free BigDataCloud reverse geocoding API (no API key required)
    let locationName = 'Unknown Location';
    
    try {
      const geocodeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        console.log('Geocoding data:', geocodeData);
        
        // Build location name from city and country
        const city = geocodeData.city || geocodeData.locality || geocodeData.principalSubdivision;
        const country = geocodeData.countryCode;
        
        if (city && country) {
          locationName = `${city}, ${country}`;
        } else if (city) {
          locationName = city;
        } else if (geocodeData.countryName) {
          locationName = geocodeData.countryName;
        }
      }
    } catch (geocodeError) {
      console.error('Geocoding error (non-fatal):', geocodeError);
      // Continue with Unknown Location if geocoding fails
    }

    // Map weather codes to descriptions
    const getWeatherDescription = (code: number): string => {
      const weatherCodes: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
      };
      return weatherCodes[code] || 'Unknown';
    };

    const result = {
      location: locationName,
      current: {
        temperature: Math.round(weatherData.current.temperature_2m),
        humidity: weatherData.current.relative_humidity_2m,
        weatherDescription: getWeatherDescription(weatherData.current.weather_code),
        weatherCode: weatherData.current.weather_code,
        uvIndex: weatherData.current.uv_index || 0,
      },
      daily: {
        temperatureMax: Math.round(weatherData.daily.temperature_2m_max[0]),
        temperatureMin: Math.round(weatherData.daily.temperature_2m_min[0]),
        uvIndexMax: weatherData.daily.uv_index_max[0] || 0,
      }
    };

    console.log('Weather data:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-weather function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
