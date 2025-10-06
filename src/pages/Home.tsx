import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Camera, MapPin, Sun, Loader2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import OutfitCard from "@/components/OutfitCard";

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    humidity: number;
    weatherDescription: string;
    uvIndex: number;
  };
  daily: {
    temperatureMax: number;
    temperatureMin: number;
    uvIndexMax: number;
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recommendation, setRecommendation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  
  // Mock outfit recommendations (will be replaced with AI-generated ones)
  const outfitRecommendations = [
    {
      imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&h=700&fit=crop",
      title: "Casual Chic",
      description: "Perfect for a relaxed day out with friends"
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=700&fit=crop",
      title: "Smart Casual",
      description: "Ideal for work meetings or dinner dates"
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&h=700&fit=crop",
      title: "Street Style",
      description: "Express yourself with bold urban fashion"
    }
  ];

  useEffect(() => {
    loadWeatherAndRecommendation();
  }, []);

  const loadWeatherAndRecommendation = async () => {
    try {
      setLoading(true);
      
      // Get user's location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Fetch weather data
      const { data: weatherData, error: weatherError } = await supabase.functions.invoke(
        'get-weather',
        {
          body: { lat: latitude, lng: longitude }
        }
      );

      if (weatherError) throw weatherError;
      setWeather(weatherData);

      // Fetch user's garments
      const { data: garments } = await supabase
        .from('garments')
        .select('type, color, material, brand');

      // Generate AI recommendation
      setRecommendationLoading(true);
      const { data: recommendationData, error: recError } = await supabase.functions.invoke(
        'generate-outfit-recommendation',
        {
          body: {
            temperature: weatherData.current.temperature,
            weatherDescription: weatherData.current.weatherDescription,
            uvIndex: weatherData.current.uvIndex,
            garments: garments || []
          }
        }
      );

      if (recError) throw recError;
      setRecommendation(recommendationData.recommendation);

    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.code === 1) {
        toast({
          title: "Location Access Denied",
          description: "Please enable location access to get weather and outfit recommendations.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load weather data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRecommendationLoading(false);
    }
  };

  const getUVLevel = (uvIndex: number): { level: string; color: string } => {
    if (uvIndex < 3) return { level: "Low", color: "text-green-600" };
    if (uvIndex < 6) return { level: "Moderate", color: "text-yellow-600" };
    if (uvIndex < 8) return { level: "High", color: "text-orange-600" };
    return { level: "Very High", color: "text-red-600" };
  };

  return (
    <div className="space-y-6">
      {/* Weather Card */}
      <Card className="shadow-medium">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : weather ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{weather.location}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{weather.current.temperature}°F</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-sm">{weather.current.weatherDescription}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1 text-sm">
                  <div className="text-muted-foreground">High: {weather.daily.temperatureMax}°F</div>
                  <div className="text-muted-foreground">Low: {weather.daily.temperatureMin}°F</div>
                </div>
              </div>
              
              {/* UV Index */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Sun className="w-5 h-5 text-yellow-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">UV Index</div>
                  <div className="text-xs text-muted-foreground">
                    {weather.current.uvIndex} - <span className={getUVLevel(weather.current.uvIndex).color}>
                      {getUVLevel(weather.current.uvIndex).level}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Unable to load weather data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Outfit Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            Today's Picks
          </h2>
        </div>
        
        {recommendationLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="relative -mx-4 px-4">
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {outfitRecommendations.map((outfit, index) => (
                  <CarouselItem key={index} className="pl-4 basis-auto">
                    <OutfitCard
                      imageUrl={outfit.imageUrl}
                      title={outfit.title}
                      description={outfit.description}
                      onClick={() => {
                        toast({
                          title: "Outfit Selected",
                          description: `You selected: ${outfit.title}`,
                        });
                      }}
                    />
                  </CarouselItem>
                ))}
                <CarouselItem className="pl-4 basis-auto">
                  <OutfitCard
                    imageUrl=""
                    title=""
                    description=""
                    isMoreCard
                    onClick={() => navigate("/stylist")}
                  />
                </CarouselItem>
              </CarouselContent>
              <div className="flex gap-2 justify-center mt-6">
                <CarouselPrevious className="static translate-y-0" />
                <CarouselNext className="static translate-y-0" />
              </div>
            </Carousel>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
          onClick={() => navigate("/closet")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Add Garment</h3>
              <p className="text-xs text-muted-foreground">Build your wardrobe</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
          onClick={() => navigate("/diary")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Log OOTD</h3>
              <p className="text-xs text-muted-foreground">Save today's outfit</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
