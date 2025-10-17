import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Camera, MapPin, Sun, Loader2, ChevronRight, Shirt, X, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import OutfitCard from "@/components/OutfitCard";
import OutfitRecommendationCard from "@/components/OutfitRecommendationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<any>(null);
  const [showOutfitDialog, setShowOutfitDialog] = useState(false);
  const [dialogLoadingImages, setDialogLoadingImages] = useState(false);
  const [addingToCloset, setAddingToCloset] = useState<{ [key: number]: boolean }>({});
  
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
      setOutfits(recommendationData.outfits || []);

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

  const enrichItemsWithImages = async (items: any[]) => {
    setDialogLoadingImages(true);
    const updated = await Promise.all(
      (items || []).map(async (item) => {
        if (item.imageUrl || !item.brand || !item.model) return item;
        try {
          const { data, error } = await supabase.functions.invoke('search-product-info', {
            body: { brand: item.brand, model: item.model }
          });
          if (!error && data?.imageUrl) return { ...item, imageUrl: data.imageUrl };
        } catch (e) {
          console.error('Image fetch failed:', e);
        }
        return item;
      })
    );
    setDialogLoadingImages(false);
    return updated;
  };

  const handleAddToCloset = async (item: any, index: number) => {
    try {
      setAddingToCloset(prev => ({ ...prev, [index]: true }));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('garments').insert({
        user_id: user.id,
        type: item.type,
        brand: item.brand,
        color: item.color,
        material: item.material,
        image_url: item.imageUrl,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to your closet!",
      });

      // Update the item to show it's now in closet
      setSelectedOutfit((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any, idx: number) => 
          idx === index ? { ...i, fromCloset: true } : i
        )
      }));
    } catch (error: any) {
      console.error('Error adding to closet:', error);
      toast({
        title: "Error",
        description: "Failed to add item to closet",
        variant: "destructive",
      });
    } finally {
      setAddingToCloset(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleBuyProduct = (item: any) => {
    const searchQuery = encodeURIComponent(`${item.brand || ''} ${item.model || item.name}`.trim());
    window.open(`https://www.google.com/search?q=${searchQuery}&tbm=shop`, '_blank');
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
        ) : outfits.length > 0 ? (
          <div className="relative -mx-4 px-4">
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {outfits.map((outfit, index) => (
                  <CarouselItem key={index} className="pl-4 basis-auto">
                    <OutfitRecommendationCard
                      title={outfit.title}
                      items={outfit.items || []}
                      summary={outfit.summary || ""}
                      onClick={async () => {
                        setSelectedOutfit(outfit);
                        setShowOutfitDialog(true);
                        const updatedItems = await enrichItemsWithImages(outfit.items || []);
                        setSelectedOutfit((prev: any) => ({ ...prev, items: updatedItems }));
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
        ) : null}
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

      {/* Outfit Details Dialog */}
      <Dialog open={showOutfitDialog} onOpenChange={setShowOutfitDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-3xl font-serif font-light">
              <Sparkles className="w-7 h-7 text-accent" strokeWidth={1.5} />
              Today's Outfit Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedOutfit && (
            <div className="space-y-8 mt-6">
              <div className="bg-secondary/30 rounded-sm p-6">
                <p className="text-base leading-relaxed text-foreground/80 font-sans">{selectedOutfit.summary}</p>
              </div>

              <div className="space-y-6">
                <h3 className="font-serif font-light text-2xl tracking-wide">Outfit Items</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedOutfit.items?.map((item: any, index: number) => (
                    <Card key={index} className="shadow-card hover:shadow-large transition-all duration-500 overflow-hidden group border-border/50">
                      <CardContent className="p-0">
                        {/* Image Container */}
                        <div className="relative w-full aspect-square bg-secondary/20 overflow-hidden">
                          {dialogLoadingImages ? (
                            <div className="w-full h-full bg-muted/50 animate-pulse" />
                          ) : item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.brand || ''} ${item.model || item.name}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  target.style.display = 'none';
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-secondary/30">
                                      <svg class="w-16 h-16 text-muted-foreground" stroke-width="1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                              <Shirt className="w-16 h-16 text-muted-foreground" strokeWidth={1} />
                            </div>
                          )}
                          
                          {/* Badge Overlay */}
                          {item.fromCloset && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="outline" className="text-[8px] uppercase tracking-wider bg-background/90 backdrop-blur-sm border-primary/30 text-primary font-sans px-1.5 py-0.5">
                                Closet
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-4 space-y-3">
                          {/* Name */}
                          <h4 className="font-serif font-light text-base leading-tight text-foreground truncate">
                            {item.name}
                          </h4>

                          {/* Brand & Type */}
                          <div className="flex items-center justify-between gap-2">
                            {item.brand && (
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-sans font-light">
                                {item.brand}
                              </p>
                            )}
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-sans font-normal bg-muted px-1.5 py-0">
                              {item.type}
                            </Badge>
                          </div>

                          {/* Actions for non-closet items */}
                          {!item.fromCloset ? (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs"
                                onClick={() => handleBuyProduct(item)}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-8 text-xs"
                                onClick={() => handleAddToCloset(item, index)}
                                disabled={addingToCloset[index]}
                              >
                                {addingToCloset[index] ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add to Closet
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-[9px] text-primary uppercase tracking-wider font-sans pt-2">
                              From Your Closet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedOutfit.tips && selectedOutfit.tips.length > 0 && (
                <div className="space-y-4 border-t border-border/30 pt-6">
                  <h3 className="font-serif font-light text-2xl tracking-wide">Style Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedOutfit.tips.map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 text-sm text-muted-foreground bg-secondary/20 rounded-sm p-4">
                        <span className="text-accent font-semibold text-base">•</span>
                        <span className="font-sans leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
