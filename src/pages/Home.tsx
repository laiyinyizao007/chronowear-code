import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Camera, MapPin, Sun, Loader2, ChevronRight, Shirt, X, ShoppingCart, Heart, Calendar } from "lucide-react";
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
  const [moreOutfitsLoading, setMoreOutfitsLoading] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<any>(null);
  const [showOutfitDialog, setShowOutfitDialog] = useState(false);
  const [dialogLoadingImages, setDialogLoadingImages] = useState(false);
  const [addingToCloset, setAddingToCloset] = useState<{ [key: number]: boolean }>({});
  const [outfitImageUrl, setOutfitImageUrl] = useState<string>("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [trendOutfits, setTrendOutfits] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedTrendOutfit, setSelectedTrendOutfit] = useState<any>(null);
  const [showTrendDialog, setShowTrendDialog] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadWeatherAndRecommendation();
  }, []);

  const loadWeatherAndRecommendation = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      
      // Get user's location with graceful fallback
      let latitude = 35.6764225; // Default: Tokyo
      let longitude = 139.650027;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000 // Cache for 5 minutes
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoError: any) {
        console.warn('Geolocation failed, using default coords:', geoError);
        toast({
          title: "Location Unavailable",
          description: "Using a default city to load weather and recommendations.",
        });
      }

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
        .select('id, type, color, material, brand, image_url');

      // Generate AI recommendation with fallback
      setRecommendationLoading(true);
      try {
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

        // Generate outfit image for the first outfit
        if (recommendationData.outfits?.[0]) {
          generateOutfitImage(recommendationData.outfits[0]);
        }

        // Load trend outfits
        loadTrendOutfits(weatherData, garments || []);
      } catch (aiError) {
        console.error('AI service unavailable:', aiError);
        // Use complete mock data when AI is unavailable
        setOutfits([
          {
            title: "Casual Chic",
            summary: "Perfect casual outfit for today's weather with complete accessories",
            hairstyle: "Natural wavy hair",
            items: [
              { type: "Hairstyle", name: "Natural Waves", description: "Soft, natural wavy hairstyle", fromCloset: false },
              { type: "Top", name: "White T-Shirt", brand: "Uniqlo", model: "Basic Tee", color: "White", material: "Cotton", fromCloset: false },
              { type: "Bottom", name: "Blue Jeans", brand: "Levi's", model: "501", color: "Blue", material: "Denim", fromCloset: false },
              { type: "Shoes", name: "White Sneakers", brand: "Adidas", model: "Stan Smith", color: "White", material: "Leather", fromCloset: false },
              { type: "Bag", name: "Tote Bag", brand: "Canvas", model: "Classic", color: "Beige", material: "Canvas", fromCloset: false },
              { type: "Accessories", name: "Watch", brand: "Casio", model: "Simple", color: "Silver", material: "Metal", fromCloset: false }
            ]
          },
          {
            title: "Business Casual",
            summary: "Professional yet comfortable outfit with all essentials",
            hairstyle: "Sleek low ponytail",
            items: [
              { type: "Hairstyle", name: "Low Ponytail", description: "Sleek and professional low ponytail", fromCloset: false },
              { type: "Top", name: "Silk Blouse", brand: "Zara", model: "Professional", color: "Cream", material: "Silk", fromCloset: false },
              { type: "Bottom", name: "Tailored Pants", brand: "Mango", model: "Office", color: "Black", material: "Polyester", fromCloset: false },
              { type: "Shoes", name: "Heels", brand: "Clarks", model: "Comfort", color: "Black", material: "Leather", fromCloset: false },
              { type: "Bag", name: "Structured Handbag", brand: "Michael Kors", model: "Professional", color: "Brown", material: "Leather", fromCloset: false },
              { type: "Accessories", name: "Pearl Earrings", brand: "Classic", model: "Simple", color: "White", material: "Pearl", fromCloset: false }
            ]
          }
        ]);
        setTrendOutfits([]);
        toast({
          title: "AI Service Unavailable",
          description: "Showing basic recommendations. AI features are temporarily disabled.",
        });
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      setLoadError(true);
      if (error.code === 1) {
        toast({
          title: "Location Access Denied",
          description: "Please enable location access to get weather and outfit recommendations.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRecommendationLoading(false);
    }
  };

  const loadTrendOutfits = async (weatherData?: any, garments?: any[]) => {
    try {
      setTrendLoading(true);
      const currentWeather = weatherData || weather;
      if (!currentWeather) return;

      const currentGarments = garments || (await supabase
        .from('garments')
        .select('id, type, color, material, brand, image_url')).data || [];

      // Use complete mock trend data with fashion images
      const mockTrends = [
        {
          title: "Elegant Evening",
          summary: "Sophisticated evening look with all accessories",
          hairstyle: "Elegant updo",
          imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
          items: [
            { type: "Hairstyle", name: "Elegant Updo", description: "Classic sophisticated updo", fromCloset: false },
            { type: "Dress", name: "Little Black Dress", brand: "Zara", model: "Classic", color: "Black", material: "Polyester", fromCloset: false },
            { type: "Shoes", name: "Strappy Heels", brand: "Steve Madden", model: "Evening", color: "Black", material: "Leather", fromCloset: false },
            { type: "Bag", name: "Clutch", brand: "Luxury", model: "Evening", color: "Gold", material: "Satin", fromCloset: false },
            { type: "Accessories", name: "Statement Necklace", brand: "Jewelry", model: "Bold", color: "Gold", material: "Metal", fromCloset: false }
          ]
        },
        {
          title: "Weekend Casual",
          summary: "Relaxed weekend style with comfortable accessories",
          hairstyle: "Messy bun",
          imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
          items: [
            { type: "Hairstyle", name: "Messy Bun", description: "Casual and effortless bun", fromCloset: false },
            { type: "Top", name: "Oversized Sweater", brand: "H&M", model: "Cozy", color: "Gray", material: "Wool", fromCloset: false },
            { type: "Bottom", name: "Leggings", brand: "Lululemon", model: "Align", color: "Black", material: "Nylon", fromCloset: false },
            { type: "Shoes", name: "Slip-on Sneakers", brand: "Vans", model: "Classic", color: "White", material: "Canvas", fromCloset: false },
            { type: "Bag", name: "Backpack", brand: "Herschel", model: "Classic", color: "Navy", material: "Polyester", fromCloset: false },
            { type: "Accessories", name: "Sunglasses", brand: "Ray-Ban", model: "Aviator", color: "Black", material: "Metal", fromCloset: false }
          ]
        },
        {
          title: "Smart Office",
          summary: "Professional office attire with polished details",
          hairstyle: "Sleek straight",
          imageUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&q=80",
          items: [
            { type: "Hairstyle", name: "Sleek Straight", description: "Professional sleek straight hair", fromCloset: false },
            { type: "Top", name: "Blazer", brand: "Banana Republic", model: "Tailored", color: "Navy", material: "Wool blend", fromCloset: false },
            { type: "Bottom", name: "Pencil Skirt", brand: "Ann Taylor", model: "Professional", color: "Gray", material: "Polyester", fromCloset: false },
            { type: "Shoes", name: "Pumps", brand: "Nine West", model: "Classic", color: "Black", material: "Leather", fromCloset: false },
            { type: "Bag", name: "Leather Tote", brand: "Coach", model: "Professional", color: "Brown", material: "Leather", fromCloset: false },
            { type: "Accessories", name: "Minimalist Watch", brand: "Daniel Wellington", model: "Classic", color: "Rose Gold", material: "Leather", fromCloset: false }
          ]
        },
        {
          title: "Sporty Active",
          summary: "Athletic look perfect for workouts or active days",
          hairstyle: "High ponytail",
          imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
          items: [
            { type: "Hairstyle", name: "High Ponytail", description: "Athletic high ponytail", fromCloset: false },
            { type: "Top", name: "Sports Bra", brand: "Nike", model: "Pro", color: "Black", material: "Spandex", fromCloset: false },
            { type: "Bottom", name: "Yoga Pants", brand: "Athleta", model: "Salutation", color: "Navy", material: "Nylon", fromCloset: false },
            { type: "Shoes", name: "Running Shoes", brand: "Adidas", model: "Ultraboost", color: "White", material: "Mesh", fromCloset: false },
            { type: "Bag", name: "Gym Bag", brand: "Under Armour", model: "Duffle", color: "Black", material: "Polyester", fromCloset: false },
            { type: "Accessories", name: "Fitness Tracker", brand: "Fitbit", model: "Charge", color: "Black", material: "Silicone", fromCloset: false }
          ]
        },
        {
          title: "Bohemian Chic",
          summary: "Free-spirited boho style with artisan accessories",
          hairstyle: "Loose beach waves",
          imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80",
          items: [
            { type: "Hairstyle", name: "Beach Waves", description: "Loose, carefree beach waves", fromCloset: false },
            { type: "Dress", name: "Maxi Dress", brand: "Free People", model: "Flowy", color: "Floral", material: "Cotton", fromCloset: false },
            { type: "Shoes", name: "Sandals", brand: "Birkenstock", model: "Arizona", color: "Brown", material: "Leather", fromCloset: false },
            { type: "Bag", name: "Crossbody Bag", brand: "Fossil", model: "Boho", color: "Tan", material: "Suede", fromCloset: false },
            { type: "Accessories", name: "Layered Necklaces", brand: "Artisan", model: "Boho", color: "Gold", material: "Mixed metals", fromCloset: false }
          ]
        }
      ];

      setTrendOutfits(mockTrends);
    } catch (error) {
      console.error('Error loading trend outfits:', error);
      setTrendOutfits([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const generateOutfitImage = async (outfit: any) => {
    try {
      setGeneratingImage(true);
      const { data, error } = await supabase.functions.invoke('generate-outfit-image', {
        body: {
          items: outfit.items || [],
          weather: weather?.current,
          hairstyle: outfit.hairstyle
        }
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setOutfitImageUrl(data.imageUrl);
      }
    } catch (error) {
      console.error('AI image generation unavailable:', error);
      // Silently fail - image generation is optional
    } finally {
      setGeneratingImage(false);
    }
  };

  const enrichItemsWithImages = async (items: any[], garments: any[]) => {
    setDialogLoadingImages(true);
    const updated = await Promise.all(
      (items || []).map(async (item) => {
        // First check if item has garmentId (definitive proof it's from closet)
        if (item.garmentId && garments?.length > 0) {
          const matchingGarment = garments.find(g => g.id === item.garmentId);
          if (matchingGarment?.image_url) {
            return { ...item, imageUrl: matchingGarment.image_url, fromCloset: true };
          }
        }
        
        // If item claims to be from closet but no garmentId, verify by matching
        if (item.fromCloset && garments?.length > 0) {
          const matchingGarment = garments.find(g => 
            g.type?.toLowerCase() === item.type?.toLowerCase() &&
            g.brand?.toLowerCase() === item.brand?.toLowerCase()
          );
          if (matchingGarment) {
            return { 
              ...item, 
              imageUrl: matchingGarment.image_url, 
              fromCloset: true,
              garmentId: matchingGarment.id 
            };
          } else {
            // Item claims fromCloset but no match found - mark as not from closet
            item.fromCloset = false;
          }
        }
        
        // If already has image or missing info, return as is
        if (item.imageUrl || !item.brand || !item.model) return item;
        
        // Otherwise fetch from search API
        try {
          console.log(`Calling search-product-info for: ${item.brand} ${item.model}`);
          const { data, error } = await supabase.functions.invoke('search-product-info', {
            body: { brand: item.brand, model: item.model }
          });
          console.log(`Response for ${item.brand} ${item.model}:`, { data, error });
          if (!error && data?.imageUrl) {
            console.log(`Got image URL: ${data.imageUrl}`);
            return { ...item, imageUrl: data.imageUrl };
          } else {
            console.warn(`No image URL received for ${item.brand} ${item.model}:`, error);
          }
        } catch (e) {
          console.error('Image fetch failed:', e);
        }
        return item;
      })
    );
    setDialogLoadingImages(false);
    return updated;
  };

  const loadMoreOutfits = async () => {
    if (!weather) return;
    
    try {
      setMoreOutfitsLoading(true);
      
      // Fetch user's garments
      const { data: garments } = await supabase
        .from('garments')
        .select('id, type, color, material, brand, image_url');

      // Generate new AI recommendation
      const { data: recommendationData, error: recError } = await supabase.functions.invoke(
        'generate-outfit-recommendation',
        {
          body: {
            temperature: weather.current.temperature,
            weatherDescription: weather.current.weatherDescription,
            uvIndex: weather.current.uvIndex,
            garments: garments || []
          }
        }
      );

      if (recError) throw recError;
      setOutfits(recommendationData.outfits || []);
      
      // Generate outfit image for the first outfit
      if (recommendationData.outfits?.[0]) {
        generateOutfitImage(recommendationData.outfits[0]);
      }
      
      toast({
        title: "New Outfits Generated",
        description: "Fresh outfit recommendations based on current weather!",
      });
    } catch (error: any) {
      console.error('Error generating new outfits:', error);
      toast({
        title: "AI Service Unavailable",
        description: "AI recommendations are temporarily disabled. Please try again later.",
      });
    } finally {
      setMoreOutfitsLoading(false);
    }
  };

  const handleAddToCloset = async (item: any, index: number) => {
    try {
      setAddingToCloset(prev => ({ ...prev, [index]: true }));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure we have an image URL before adding
      if (!item.imageUrl) {
        throw new Error("Item must have an image before adding to closet");
      }

      const { data: newGarment, error } = await supabase
        .from('garments')
        .insert({
          user_id: user.id,
          type: item.type,
          brand: item.brand,
          color: item.color,
          material: item.material,
          image_url: item.imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to your closet!",
      });

      const updatedItem = { ...item, fromCloset: true, garmentId: newGarment.id };

      // Update the selected outfit in dialog
      setSelectedOutfit((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any, idx: number) => 
          idx === index ? updatedItem : i
        )
      }));

      // Update the outfit in the main list so it shows CLOSET badge when dialog closes
      setOutfits(prev => prev.map(outfit => 
        outfit.title === selectedOutfit?.title 
          ? {
              ...outfit,
              items: outfit.items.map((i: any, idx: number) => 
                idx === index ? updatedItem : i
              )
            }
          : outfit
      ));
    } catch (error: any) {
      console.error('Error adding to closet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item to closet",
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

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="text-muted-foreground">Failed to load data</div>
        <Button onClick={loadWeatherAndRecommendation}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Fashion Trends</h2>
        {trendLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : trendOutfits.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {trendOutfits.map((outfit, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <Card 
                    className="shadow-medium cursor-pointer hover:shadow-large transition-all overflow-hidden group"
                    onClick={async () => {
                      setSelectedTrendOutfit(outfit);
                      setShowTrendDialog(true);
                      const { data: garments } = await supabase
                        .from('garments')
                        .select('id, type, color, material, brand, image_url');
                      const updatedItems = await enrichItemsWithImages(outfit.items || [], garments || []);
                      setSelectedTrendOutfit((prev: any) => ({ ...prev, items: updatedItems }));
                    }}
                  >
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                      {outfit.imageUrl ? (
                        <img 
                          src={outfit.imageUrl} 
                          alt={outfit.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white font-medium text-sm">{outfit.title}</p>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error("Not authenticated");

                            const { error } = await supabase
                              .from('saved_outfits')
                              .insert({
                                user_id: user.id,
                                title: outfit.title,
                                items: outfit.items || [],
                                hairstyle: outfit.hairstyle,
                                summary: outfit.summary,
                                image_url: outfit.imageUrl
                              });

                            if (error) throw error;
                            toast({
                              title: "Success",
                              description: "Outfit saved!",
                            });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: "Failed to save outfit",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : null}
      </div>

      {/* Today's Pick - Single Outfit */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            Today's Pick
          </h2>
          {outfits.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadMoreOutfits} disabled={moreOutfitsLoading}>
              {moreOutfitsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          )}
        </div>
        
        {recommendationLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : outfits.length > 0 ? (
          <Card className="shadow-medium overflow-hidden">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: AI Generated Outfit Image */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">{outfits[0].title}</h3>
                  <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    {generatingImage ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      </div>
                    ) : outfitImageUrl ? (
                      <img 
                        src={outfitImageUrl} 
                        alt="Today's outfit"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Sparkles className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{outfits[0].summary}</p>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      variant="outline"
                      onClick={async () => {
                        setSelectedOutfit(outfits[0]);
                        setShowOutfitDialog(true);
                        const { data: garments } = await supabase
                          .from('garments')
                          .select('id, type, color, material, brand, image_url');
                        const updatedItems = await enrichItemsWithImages(outfits[0].items || [], garments || []);
                        setSelectedOutfit((prev: any) => ({ ...prev, items: updatedItems }));
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");

                          // Get garment IDs from outfit items that are in closet
                          const { data: garments } = await supabase
                            .from('garments')
                            .select('id, type, brand')
                            .eq('user_id', user.id);

                          const garmentIds = outfits[0].items
                            ?.filter((item: any) => item.fromCloset)
                            .map((item: any) => {
                              const match = garments?.find(g => 
                                g.type?.toLowerCase() === item.type?.toLowerCase() &&
                                g.brand?.toLowerCase() === item.brand?.toLowerCase()
                              );
                              return match?.id;
                            })
                            .filter(Boolean) || [];

                          const { error } = await supabase
                            .from('ootd_records')
                            .insert({
                              user_id: user.id,
                              date: new Date().toISOString().split('T')[0],
                              photo_url: outfitImageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80',
                              garment_ids: garmentIds,
                              weather: weather?.current.weatherDescription || '',
                              location: weather?.location || '',
                              notes: `${outfits[0].title} - ${outfits[0].summary}`,
                              products: outfits[0].items || []
                            });

                          if (error) throw error;
                          toast({
                            title: "Added to OOTD!",
                            description: "Today's outfit has been saved to your diary.",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: "Failed to add to OOTD",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Add to OOTD
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");

                          const { error } = await supabase
                            .from('saved_outfits')
                            .insert({
                              user_id: user.id,
                              title: outfits[0].title,
                              items: outfits[0].items || [],
                              hairstyle: outfits[0].hairstyle,
                              summary: outfits[0].summary,
                              image_url: outfitImageUrl
                            });

                          if (error) throw error;
                          toast({
                            title: "Success",
                            description: "Outfit saved to your closet!",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: "Failed to save outfit",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Right: Item List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Items Needed</h4>
                  <div className="space-y-2">
                    {outfits[0].items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <Shirt className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.type}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.color} {item.brand && `• ${item.brand}`}
                          </p>
                        </div>
                        {item.fromCloset && (
                          <Badge variant="secondary" className="text-xs">CLOSET</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {outfits[0].hairstyle && (
                    <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm font-medium mb-1">Hairstyle Suggestion</p>
                      <p className="text-xs text-muted-foreground">{outfits[0].hairstyle}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* Today's Pick Outfit Details Dialog */}
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

              {/* Hairstyle Recommendation */}
              {selectedOutfit.hairstyle && (
                <div className="space-y-4 border-t border-border/30 pt-6">
                  <h3 className="font-serif font-light text-2xl tracking-wide flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Recommended Hairstyle
                  </h3>
                  <div className="bg-accent/10 rounded-lg p-4">
                    <p className="font-medium mb-2">{selectedOutfit.hairstyle.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedOutfit.hairstyle.description}</p>
                  </div>
                </div>
              )}

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

              {/* Save as OOTD Button */}
              <div className="border-t border-border/30 pt-6">
                <Button
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Not authenticated");

                      // Save outfit as OOTD
                      const { error } = await supabase
                        .from("ootd_records")
                        .insert({
                          user_id: user.id,
                          date: new Date().toISOString().split('T')[0],
                          garment_ids: selectedOutfit.items
                            ?.filter((item: any) => item.garmentId)
                            .map((item: any) => item.garmentId) || [],
                          photo_url: selectedOutfit.items?.[0]?.imageUrl || "",
                          notes: selectedOutfit.summary,
                          weather: weather ? `${weather.current.temperature}°F, ${weather.current.weatherDescription}` : "",
                          location: weather?.location || "",
                        });

                      if (error) throw error;

                      toast({
                        title: "Success",
                        description: "Outfit saved to your OOTD diary!",
                      });
                      setShowOutfitDialog(false);
                    } catch (error: any) {
                      console.error('Error saving OOTD:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save outfit",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Save as Today's OOTD
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trend Outfit Details Dialog */}
      <Dialog open={showTrendDialog} onOpenChange={setShowTrendDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-3xl font-serif font-light">
              <Sparkles className="w-7 h-7 text-accent" strokeWidth={1.5} />
              Trend Outfit Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTrendOutfit && (
            <div className="space-y-8 mt-6">
              <div className="bg-secondary/30 rounded-sm p-6">
                <p className="text-base leading-relaxed text-foreground/80 font-sans">{selectedTrendOutfit.summary}</p>
              </div>

              {selectedTrendOutfit.hairstyle && (
                <div className="space-y-4 border-t border-border/30 pt-6">
                  <h3 className="font-serif font-light text-2xl tracking-wide flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Recommended Hairstyle
                  </h3>
                  <div className="bg-accent/10 rounded-lg p-4">
                    <p className="font-medium mb-2">{selectedTrendOutfit.hairstyle.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrendOutfit.hairstyle.description}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="font-serif font-light text-2xl tracking-wide">Outfit Items</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedTrendOutfit.items?.map((item: any, index: number) => (
                    <Card key={index} className="shadow-card hover:shadow-large transition-all duration-500 overflow-hidden group border-border/50">
                      <CardContent className="p-0">
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
                          
                          {item.fromCloset && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="outline" className="text-[8px] uppercase tracking-wider bg-background/90 backdrop-blur-sm border-primary/30 text-primary font-sans px-1.5 py-0.5">
                                Closet
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <h4 className="font-serif font-light text-base leading-tight text-foreground truncate">
                            {item.name}
                          </h4>

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

              {selectedTrendOutfit.tips && selectedTrendOutfit.tips.length > 0 && (
                <div className="space-y-4 border-t border-border/30 pt-6">
                  <h3 className="font-serif font-light text-2xl tracking-wide">Style Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTrendOutfit.tips.map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 text-sm text-muted-foreground bg-secondary/20 rounded-sm p-4">
                        <span className="text-accent font-semibold text-base">•</span>
                        <span className="font-sans leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border/30 pt-6 flex gap-3">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Not authenticated");

                      const { error } = await supabase
                        .from('saved_outfits')
                        .insert({
                          user_id: user.id,
                          title: selectedTrendOutfit.title,
                          items: selectedTrendOutfit.items || [],
                          hairstyle: selectedTrendOutfit.hairstyle,
                          summary: selectedTrendOutfit.summary,
                          image_url: selectedTrendOutfit.imageUrl
                        });

                      if (error) throw error;
                      toast({
                        title: "Success",
                        description: "Outfit saved to your closet!",
                      });
                      setShowTrendDialog(false);
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: "Failed to save outfit",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Save to Closet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
