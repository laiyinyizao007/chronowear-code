import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Camera, MapPin, Sun, Loader2, ChevronRight, Shirt, X, ShoppingCart, Heart, Calendar, RefreshCw, MessageSquare, Cloud, CloudRain, Droplets } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import OutfitCard from "@/components/OutfitCard";
import OutfitRecommendationCard from "@/components/OutfitRecommendationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AIAssistant from "@/components/AIAssistant";

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [todaysPickId, setTodaysPickId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [addedToOOTD, setAddedToOOTD] = useState(false);

  useEffect(() => {
    loadWeatherAndRecommendation();
    loadTrendOutfits();
  }, []);

  const loadWeatherAndRecommendation = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setLoadError(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split('T')[0];

      // Check database for existing Today's Pick (unless forced refresh)
      if (!forceRefresh) {
        const { data: existingPick } = await supabase
          .from('todays_picks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (existingPick) {
          console.log('Loaded today\'s pick from database');
          setWeather(existingPick.weather as any as WeatherData);
          setOutfits([{
            title: existingPick.title,
            summary: existingPick.summary,
            hairstyle: existingPick.hairstyle,
            items: existingPick.items
          }]);
          setOutfitImageUrl(existingPick.image_url || "");
          setTodaysPickId(existingPick.id);
          setIsLiked(existingPick.is_liked);
          setAddedToOOTD(existingPick.added_to_ootd);
          setLoading(false);
          return;
        }
      }
      
      // Get user's location with graceful fallback
      let latitude = 35.6764225; // Default: Tokyo
      let longitude = 139.650027;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoError: any) {
        console.warn('Geolocation failed, using default coords:', geoError);
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
        
        const outfitsData = recommendationData.outfits || [];
        setOutfits(outfitsData);

        // Save to database (replace if exists for today)
        if (outfitsData[0]) {
          const outfit = outfitsData[0];
          
          // If force refresh, delete old Today's Pick for today
          if (forceRefresh) {
            await supabase
              .from('todays_picks')
              .delete()
              .eq('user_id', user.id)
              .eq('date', today);
          }

          const { data: savedPick, error: saveError } = await supabase
            .from('todays_picks')
            .insert({
              user_id: user.id,
              date: today,
              title: outfit.title,
              summary: outfit.summary,
              hairstyle: outfit.hairstyle,
              items: outfit.items,
              weather: weatherData
            })
            .select()
            .single();

          if (!saveError && savedPick) {
            setTodaysPickId(savedPick.id);
            setIsLiked(false);
            setAddedToOOTD(false);
            console.log('Saved new today\'s pick to database');
          }

          // Generate outfit image
          generateOutfitImage(outfit);
        }
      } catch (aiError) {
        console.error('AI service unavailable:', aiError);
        // Use complete mock data when AI is unavailable
        const basicOutfits = [
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
          }
        ];

        const enrichedOutfits = await Promise.all(
          basicOutfits.map(async (outfit) => {
            const enrichedItems = await enrichItemsWithImages(outfit.items, garments || []);
            return { ...outfit, items: enrichedItems };
          })
        );
        
        setOutfits(enrichedOutfits);

        // Save fallback to database
        if (enrichedOutfits[0]) {
          if (forceRefresh) {
            await supabase
              .from('todays_picks')
              .delete()
              .eq('user_id', user.id)
              .eq('date', today);
          }

          const { data: savedPick } = await supabase
            .from('todays_picks')
            .insert({
              user_id: user.id,
              date: today,
              title: enrichedOutfits[0].title,
              summary: enrichedOutfits[0].summary,
              hairstyle: enrichedOutfits[0].hairstyle,
              items: enrichedOutfits[0].items,
              weather: weatherData
            })
            .select()
            .single();

          if (savedPick) {
            setTodaysPickId(savedPick.id);
            setIsLiked(false);
            setAddedToOOTD(false);
          }
        }
        
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
      console.log('Generating outfit image with items:', outfit.items?.length || 0);
      
      const { data, error } = await supabase.functions.invoke('generate-outfit-image', {
        body: {
          items: outfit.items || [],
          weather: weather?.current,
          hairstyle: outfit.hairstyle
        }
      });

      if (error) {
        console.error('Outfit image generation error:', error);
        throw error;
      }
      
      if (data?.imageUrl) {
        console.log('Outfit image generated successfully');
        setOutfitImageUrl(data.imageUrl);

        // Update database with image_url if todaysPickId exists
        if (todaysPickId) {
          await supabase
            .from('todays_picks')
            .update({ image_url: data.imageUrl })
            .eq('id', todaysPickId);
        }
      } else {
        console.warn('No image URL returned from generate-outfit-image');
      }
    } catch (error) {
      console.error('AI image generation unavailable:', error);
      // 使用第一个物品的图片作为fallback
      if (outfit.items?.[0]?.imageUrl) {
        console.log('Using first item image as fallback');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  // Handle refresh outfit - force regenerate today's pick
  const handleRefreshOutfit = async () => {
    setRecommendationLoading(true);
    await loadWeatherAndRecommendation(true);
  };

  // Toggle like status
  const toggleLikeStatus = async () => {
    if (!todaysPickId) return;

    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);

    const { error } = await supabase
      .from('todays_picks')
      .update({ is_liked: newLikedStatus })
      .eq('id', todaysPickId);

    if (error) {
      console.error('Failed to update like status:', error);
      setIsLiked(!newLikedStatus); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  // Mark as added to OOTD
  const markAddedToOOTD = async () => {
    if (!todaysPickId) return;

    const { error } = await supabase
      .from('todays_picks')
      .update({ added_to_ootd: true })
      .eq('id', todaysPickId);

    if (!error) {
      setAddedToOOTD(true);
    }
  };

  // Auto-generate outfit image when outfits are loaded
  useEffect(() => {
    if (outfits.length > 0 && !outfitImageUrl && !generatingImage) {
      console.log('Auto-generating outfit image for first outfit');
      generateOutfitImage(outfits[0]);
    }
  }, [outfits]);

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
        
        // If already has image, return as is
        if (item.imageUrl) return item;
        
        // If missing brand or model info, skip search but return item
        if (!item.brand || !item.model) {
          console.log(`Skipping image search for ${item.type} - missing brand/model`);
          return item;
        }
        
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

  const getWeatherIcon = (description: string) => {
    const lower = description.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return <CloudRain className="w-5 h-5" />;
    if (lower.includes('cloud')) return <Cloud className="w-5 h-5" />;
    return <Sun className="w-5 h-5" />;
  };

  const getUVColor = (uvIndex: number): string => {
    if (uvIndex < 3) return "text-green-600";
    if (uvIndex < 6) return "text-yellow-600";
    if (uvIndex < 8) return "text-orange-600";
    return "text-red-600";
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="text-muted-foreground">Failed to load data</div>
        <Button onClick={() => loadWeatherAndRecommendation(false)}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Weather Info - Minimal */}
      {weather && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {getWeatherIcon(weather.current.weatherDescription)}
          <span className="font-medium">
            {Math.round(weather.daily.temperatureMax)}° / {Math.round(weather.daily.temperatureMin)}°
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">UV</span>
            <span className={`text-sm font-medium ${getUVColor(weather.current.uvIndex)}`}>
              {weather.current.uvIndex.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* AI Search Bar - Minimal Farfetch style */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="w-full h-12 sm:h-14 px-5 sm:px-6 border border-border hover:border-primary/30 transition-all duration-200 bg-background rounded-none justify-start text-left font-light text-sm sm:text-base text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0 stroke-[1.5]" strokeWidth={1.5} />
            <span className="tracking-wide">Search styles, ask fashion questions...</span>
          </Button>
        </div>
        {showAIAssistant && (
          <div className="mt-4 animate-fade-in">
            <AIAssistant />
          </div>
        )}
      </div>

      {/* Trend Section */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-bold">Fashion Trends</h2>
        {trendLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-accent" />
          </div>
        ) : trendOutfits.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {trendOutfits.slice(0, 3).map((outfit, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
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
                    <div className="relative h-32 bg-muted overflow-hidden">
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
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white font-medium text-xs line-clamp-1">{outfit.title}</p>
                      </div>
                      {/* Floating heart button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute bottom-2 left-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white hover:scale-110 transition-all shadow-md"
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
                        <Heart className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  </Card>
                </CarouselItem>
              ))}

              {/* Explore More card */}
              <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                <Card 
                  className="shadow-medium cursor-pointer hover:shadow-large transition-all overflow-hidden group"
                  onClick={() => navigate('/stylist')}
                  aria-label="Explore more trends"
                >
                  <div className="relative aspect-[2/3] bg-muted/60 flex items-center justify-center">
                    <div className="text-center px-4">
                      <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-accent" />
                      <p className="mt-2 font-semibold text-sm">Explore more</p>
                      <p className="text-xs text-muted-foreground">See more trends</p>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : null}
      </div>

      {/* Today's Pick - Single Outfit */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            Today's Pick
          </h2>
          {outfits.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleRefreshOutfit} disabled={recommendationLoading}>
              {recommendationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          )}
        </div>
        
        {recommendationLoading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-accent" />
          </div>
        ) : outfits.length > 0 ? (
          <Card 
            className="shadow-medium overflow-hidden cursor-pointer transition-all hover:shadow-lg"
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
            <CardContent className="p-4 sm:p-6">
              {/* Mobile Layout */}
              <div className="md:hidden">
                <div className="flex gap-2">
                  {/* Left: Item List (1/3 width) */}
                  <div className="w-1/3 space-y-1.5">
                    <h4 className="font-medium text-[10px] text-muted-foreground mb-2">Items</h4>
                    <div className="space-y-1.5">
                      {outfits[0].items?.map((item: any, index: number) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border/50">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.brand || ''} ${item.model || item.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  target.style.display = 'none';
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-muted">
                                      <svg class="w-4 h-4 text-muted-foreground" stroke-width="1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Shirt className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <Heart 
                            className={`absolute top-1 right-1 w-3 h-3 ${
                              item.fromCloset ? 'fill-red-500 text-red-500' : 'text-white/80'
                            }`}
                            style={{ opacity: item.fromCloset ? 1 : 0.4 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Outfit Image (2/3 width) - Auto height to match items */}
                  <div className="w-2/3 space-y-2 flex flex-col">
                    <h3 className="text-sm font-semibold">{outfits[0].title}</h3>
                    <div className="relative flex-1 rounded-lg overflow-hidden bg-background">
                    {generatingImage ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : outfitImageUrl ? (
                      <img 
                        src={outfitImageUrl} 
                        alt="Today's outfit"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    ) : (
                      outfits[0].items?.[0]?.imageUrl ? (
                        <img 
                          src={outfits[0].items[0].imageUrl} 
                          alt="Outfit preview"
                          className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                          <Sparkles className="w-12 h-12" />
                          <p className="text-xs text-center px-4">点击"生成图片"按钮</p>
                        </div>
                      )
                    )}
                    {/* Bottom summary overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3">
                      <p className="text-xs text-foreground/80 line-clamp-2">{outfits[0].summary}</p>
                    </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons for mobile */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={async (e) => {
                      e.stopPropagation();
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

                        // Mark as added to OOTD in todays_picks
                        await markAddedToOOTD();

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
                      <Calendar className="w-3 h-3 mr-1" />
                      OOTD
                    </Button>
                  <Button
                    size="sm"
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
                      <Heart className="w-3 h-3" />
                    </Button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block">
                <div className="flex gap-4">
                  {/* Left: Item List (1/3 width) - Remove scrolling, show all */}
                  <div className="w-1/3 space-y-3 flex flex-col">
                    <h4 className="font-medium text-sm text-muted-foreground">Items</h4>
                    <div className="grid grid-cols-1 gap-2 flex-1">
                      {outfits[0].items?.map((item: any, index: number) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border/50 hover:border-primary/50 transition-colors">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.brand || ''} ${item.model || item.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  target.style.display = 'none';
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-muted">
                                      <svg class="w-8 h-8 text-muted-foreground" stroke-width="1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Shirt className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-white text-xs font-medium truncate">{item.name || item.type}</p>
                            <p className="text-white/80 text-[10px] truncate">{item.color}</p>
                          </div>
                          <Heart 
                            className={`absolute top-1 right-1 w-4 h-4 ${
                              item.fromCloset ? 'fill-red-500 text-red-500' : 'text-white/80'
                            }`}
                            style={{ opacity: item.fromCloset ? 1 : 0.4 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Outfit Image (2/3 width) - Auto height to match items */}
                  <div className="w-2/3 flex flex-col">
                    <h3 className="text-lg font-semibold mb-3">{outfits[0].title}</h3>
                    <div className="relative flex-1 bg-muted rounded-lg overflow-hidden">
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
                    <p className="text-sm text-muted-foreground mt-3">{outfits[0].summary}</p>
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error("Not authenticated");

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

                            // Mark as added to OOTD
                            await markAddedToOOTD();

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
                        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.brand || ''} ${item.model || item.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                if (parent) {
                                  target.style.display = 'none';
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-muted">
                                      <svg class="w-6 h-6 text-muted-foreground" stroke-width="1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Shirt className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name || item.type}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.color} {item.brand && `• ${item.brand}`}
                          </p>
                        </div>
                        <Badge 
                          variant={item.fromCloset ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {item.fromCloset ? "IN CLOSET" : "BUY"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {outfits[0].hairstyle && (
                    <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <p className="text-sm font-medium">Hairstyle Suggestion</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{outfits[0].hairstyle}</p>
                      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                        <img 
                          src={`https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&h=300&fit=crop`}
                          alt="Hairstyle suggestion"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>


      {/* Today's Pick Outfit Details Dialog - Mobile-First Design */}
      <Dialog open={showOutfitDialog} onOpenChange={setShowOutfitDialog}>
        <DialogContent className="max-w-md h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Outfit Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedOutfit && selectedOutfit.items && selectedOutfit.items.length > 0 && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Item Thumbnails */}
              <div className="w-20 bg-muted/30 overflow-y-auto py-2 flex-shrink-0">
                <div className="space-y-2 px-2">
                  {selectedOutfit.items.map((item: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Set the selected item as the main display
                        setSelectedOutfit((prev: any) => ({
                          ...prev,
                          mainDisplayIndex: index
                        }));
                      }}
                      className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        (selectedOutfit.mainDisplayIndex ?? 0) === index
                          ? 'border-primary shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Shirt className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Main Display & Details */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Main Image Display */}
                <div className="flex-1 bg-secondary/20 overflow-hidden relative">
                  {(() => {
                    const mainItem = selectedOutfit.items[selectedOutfit.mainDisplayIndex ?? 0];
                    return mainItem?.imageUrl ? (
                      <img
                        src={mainItem.imageUrl}
                        alt={mainItem.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-24 h-24 text-muted-foreground" strokeWidth={1} />
                      </div>
                    );
                  })()}
                  
                  {/* Item From Closet Heart Icon */}
                  <div className="absolute top-4 right-4">
                    <Heart 
                      className={`w-6 h-6 ${
                        selectedOutfit.items[selectedOutfit.mainDisplayIndex ?? 0]?.fromCloset 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-white/90'
                      }`}
                      style={{ 
                        opacity: selectedOutfit.items[selectedOutfit.mainDisplayIndex ?? 0]?.fromCloset ? 1 : 0.4,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                      }}
                    />
                  </div>
                </div>

                {/* Bottom: Item Info & Actions */}
                <div className="bg-background border-t p-4 space-y-4">
                  {(() => {
                    const mainItem = selectedOutfit.items[selectedOutfit.mainDisplayIndex ?? 0];
                    return (
                      <>
                        {/* Item Details */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-lg">{mainItem?.name || 'Item'}</h3>
                              {mainItem?.brand && (
                                <p className="text-sm text-muted-foreground">{mainItem.brand}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {mainItem?.type}
                            </Badge>
                          </div>
                          
                          {/* Color & Material */}
                          {(mainItem?.color || mainItem?.material) && (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {mainItem.color && <span>• {mainItem.color}</span>}
                              {mainItem.material && <span>• {mainItem.material}</span>}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {!mainItem?.fromCloset && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleBuyProduct(mainItem)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Buy
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
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
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Add to OOTD
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trend Outfit Details Dialog - Mobile-First Design */}
      <Dialog open={showTrendDialog} onOpenChange={setShowTrendDialog}>
        <DialogContent className="max-w-md h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Trend Outfit
            </DialogTitle>
          </DialogHeader>
          
          {selectedTrendOutfit && selectedTrendOutfit.items && selectedTrendOutfit.items.length > 0 && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Item Thumbnails */}
              <div className="w-20 bg-muted/30 overflow-y-auto py-2 flex-shrink-0">
                <div className="space-y-2 px-2">
                  {selectedTrendOutfit.items.map((item: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedTrendOutfit((prev: any) => ({
                          ...prev,
                          mainDisplayIndex: index
                        }));
                      }}
                      className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        (selectedTrendOutfit.mainDisplayIndex ?? 0) === index
                          ? 'border-primary shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Shirt className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Main Display & Details */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Main Image Display */}
                <div className="flex-1 bg-secondary/20 overflow-hidden relative">
                  {(() => {
                    const mainItem = selectedTrendOutfit.items[selectedTrendOutfit.mainDisplayIndex ?? 0];
                    return mainItem?.imageUrl ? (
                      <img
                        src={mainItem.imageUrl}
                        alt={mainItem.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-24 h-24 text-muted-foreground" strokeWidth={1} />
                      </div>
                    );
                  })()}
                  
                  {/* Item From Closet Heart Icon */}
                  <div className="absolute top-4 right-4">
                    <Heart 
                      className={`w-6 h-6 ${
                        selectedTrendOutfit.items[selectedTrendOutfit.mainDisplayIndex ?? 0]?.fromCloset 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-white/90'
                      }`}
                      style={{ 
                        opacity: selectedTrendOutfit.items[selectedTrendOutfit.mainDisplayIndex ?? 0]?.fromCloset ? 1 : 0.4,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                      }}
                    />
                  </div>
                </div>

                {/* Bottom: Item Info & Actions */}
                <div className="bg-background border-t p-4 space-y-4">
                  {(() => {
                    const mainItem = selectedTrendOutfit.items[selectedTrendOutfit.mainDisplayIndex ?? 0];
                    return (
                      <>
                        {/* Item Details */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-lg">{mainItem?.name || 'Item'}</h3>
                              {mainItem?.brand && (
                                <p className="text-sm text-muted-foreground">{mainItem.brand}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {mainItem?.type}
                            </Badge>
                          </div>
                          
                          {(mainItem?.color || mainItem?.material) && (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {mainItem.color && <span>• {mainItem.color}</span>}
                              {mainItem.material && <span>• {mainItem.material}</span>}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {!mainItem?.fromCloset && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleBuyProduct(mainItem)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Buy
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
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
                                    image_url: selectedTrendOutfit.imageUrl,
                                    liked: true
                                  });

                                if (error) throw error;
                                toast({
                                  title: "Success",
                                  description: "Outfit saved to Stylebook!",
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
                            <Heart className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
