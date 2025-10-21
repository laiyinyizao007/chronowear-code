import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Sparkles, Wand2, Loader2, Upload, Heart, BookHeart, ShirtIcon, UtensilsCrossed, Glasses, Watch, Sparkle, RefreshCw, Book, ExternalLink, Plus, Shirt, Footprints, ShoppingBag, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";

interface Garment {
  id: string;
  image_url: string;
  type: string;
  brand: string;
  color: string;
  liked?: boolean;
}

interface AIRecommendedItem {
  category: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  isFromCloset?: boolean;
  closetItemId?: string;
}

interface OutfitSlot {
  type: string;
  label: string;
  icon: any;
  garment: Garment | null;
}

export default function Stylist() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("virtual-tryon");
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState<string>("");
  const [removedBgImageUrl, setRemovedBgImageUrl] = useState<string>("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string>("");
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendedItem[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [swapDrawerOpen, setSwapDrawerOpen] = useState(false);
  const [swapCategory, setSwapCategory] = useState<string>("");
  const [trendOutfits, setTrendOutfits] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [outfitSlots, setOutfitSlots] = useState<OutfitSlot[]>([
    { type: "hairstyle", label: "发型", icon: Sparkle, garment: null },
    { type: "hat", label: "帽子", icon: Crown, garment: null },
    { type: "accessories", label: "首饰", icon: Watch, garment: null },
    { type: "top", label: "上衣", icon: Shirt, garment: null },
    { type: "bottom", label: "下衣", icon: UtensilsCrossed, garment: null },
    { type: "shoes", label: "鞋子", icon: Footprints, garment: null },
    { type: "bag", label: "包包", icon: ShoppingBag, garment: null },
  ]);

  const categories = [
    { id: "trends", label: "Fashion Trends", icon: Sparkles },
    { id: "stylebook", label: "Stylebook", icon: Book },
    { id: "top", label: "Tops", icon: ShirtIcon },
    { id: "bottom", label: "Bottoms", icon: UtensilsCrossed },
    { id: "shoes", label: "Shoes", icon: UtensilsCrossed },
    { id: "accessories", label: "Accessories", icon: Watch },
    { id: "hairstyle", label: "Hairstyle", icon: Sparkle },
  ];

  const filteredGarments = selectedCategory === "all" 
    ? garments 
    : garments.filter(g => g.type.toLowerCase().includes(selectedCategory));

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === "trends") {
      setActiveTab("trends");
      loadTrendOutfits();
      return;
    }
    if (categoryId === "stylebook") {
      setActiveTab("stylebook");
      return;
    }
    setSelectedCategory(categoryId);
    setIsDrawerOpen(true);
  };

  const handleSelectGarment = (garment: Garment) => {
    setSelectedGarment(garment);
    setIsDrawerOpen(false);
  };

  const handleSelectSlotGarment = (slotType: string, garment: Garment) => {
    setOutfitSlots(prev => 
      prev.map(slot => 
        slot.type === slotType ? { ...slot, garment } : slot
      )
    );
    setIsDrawerOpen(false);
  };

  const handleOpenSlotDrawer = (slotType: string) => {
    setSelectedCategory(slotType);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    loadData();
    loadSavedOutfits();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user settings for full body photo
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("full_body_photo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData?.full_body_photo_url) {
        setFullBodyPhotoUrl(settingsData.full_body_photo_url);
        // Process background removal
        await processBackgroundRemoval(settingsData.full_body_photo_url);
      }

      // Load garments from closet
      const { data: garmentsData } = await supabase
        .from("garments")
        .select("id, image_url, type, brand, color")
        .order("created_at", { ascending: false });

      if (garmentsData) {
        setGarments(garmentsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedOutfits = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_outfits")
        .select("*")
        .eq("liked", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedOutfits(data || []);
    } catch (error: any) {
      console.error("Error loading saved outfits:", error);
    }
  };

  const processBackgroundRemoval = async (imageUrl: string) => {
    // 暂时跳过背景移除，直接使用原图
    console.log('Using original image without background removal');
    setRemovedBgImageUrl(imageUrl);
    setProcessingBg(false);
  };

  const handleGenerateTryOn = async () => {
    if (!removedBgImageUrl || !selectedGarment) {
      toast.error("Please select a garment to try on");
      return;
    }

    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-virtual-tryon', {
        body: {
          userPhotoUrl: removedBgImageUrl, // data URL accessible by backend model
          garmentImageUrl: selectedGarment.image_url,
          garmentType: selectedGarment.type,
        }
      });

      if (error) throw error;

      const url = data?.imageUrl || data?.tryonImageUrl;
      if (url) {
        setTryOnResultUrl(url);
        toast.success("Virtual try-on generated!");
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      console.error("Error generating try-on:", error);
      toast.error(error.message || "Failed to generate virtual try-on");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate try-on when a garment is selected (mobile-friendly UX)
  useEffect(() => {
    if (selectedGarment && removedBgImageUrl && !generating && !processingBg) {
      handleGenerateTryOn();
      // Clear AI recommendations when selecting a new garment
      setAiRecommendations([]);
    }
    // We intentionally omit handleGenerateTryOn from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGarment]);

  const handleAIFinishRest = async () => {
    if (!selectedGarment) {
      toast.error("Please select a garment first");
      return;
    }

    try {
      setGeneratingAI(true);
      
      const { data, error } = await supabase.functions.invoke('generate-outfit-suggestion', {
        body: {
          selectedItem: {
            type: selectedGarment.type,
            brand: selectedGarment.brand,
            color: selectedGarment.color,
          },
          userGarments: garments.map(g => ({
            type: g.type,
            brand: g.brand,
            color: g.color,
          })),
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        setAiRecommendations(data.recommendations);
        toast.success("AI outfit suggestions generated!");
      }
    } catch (error: any) {
      console.error("Error generating AI suggestions:", error);
      toast.error(error.message || "Failed to generate AI suggestions");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSwapItem = (category: string) => {
    setSwapCategory(category);
    setSwapDrawerOpen(true);
  };

  const handleReplaceWithClosetItem = (garment: Garment, category: string) => {
    setAiRecommendations(prev => 
      prev.map(item => 
        item.category === category
          ? {
              ...item,
              name: `${garment.brand} ${garment.type}`,
              brand: garment.brand,
              imageUrl: garment.image_url,
              isFromCloset: true,
              closetItemId: garment.id,
            }
          : item
      )
    );
    setSwapDrawerOpen(false);
    toast.success("Item replaced from your closet");
  };

  const toggleLikeGarment = async (garmentId: string, currentLiked: boolean) => {
    try {
      const { error } = await supabase
        .from("garments")
        .update({ liked: !currentLiked })
        .eq("id", garmentId);

      if (error) throw error;
      
      toast.success(currentLiked ? "Removed from favorites" : "Added to favorites");
      loadData();
    } catch (error: any) {
      toast.error("Failed to update favorite");
    }
  };

  const toggleLikeOutfit = async (outfitId: string, currentLiked: boolean) => {
    try {
      const { error } = await supabase
        .from("saved_outfits")
        .update({ liked: !currentLiked })
        .eq("id", outfitId);

      if (error) throw error;
      
      toast.success(currentLiked ? "Removed from Stylebook" : "Added to Stylebook");
      loadSavedOutfits();
    } catch (error: any) {
      toast.error("Failed to update Stylebook");
    }
  };

  const loadTrendOutfits = async () => {
    try {
      setTrendLoading(true);
      
      // Get current weather
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const { data: weatherData, error: weatherError } = await supabase.functions.invoke(
            'get-weather',
            { body: { latitude, longitude } }
          );

          if (weatherError) throw weatherError;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");

          const today = new Date().toISOString().split('T')[0];

          const { data: existingTrends } = await supabase
            .from('trends')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(5);

          if (existingTrends && existingTrends.length > 0) {
            setTrendOutfits(existingTrends.map(trend => ({
              title: trend.title,
              summary: trend.summary || trend.description,
              hairstyle: trend.hairstyle,
              imageUrl: trend.image_url,
              items: trend.items || []
            })));
            setTrendLoading(false);
            return;
          }

          const { data: trendsData, error: trendsError } = await supabase.functions.invoke('save-fashion-trends', {
            body: {
              temperature: weatherData.current.temperature,
              weatherDescription: weatherData.current.weatherDescription,
              currentWeather: weatherData
            }
          });

          if (trendsError) throw trendsError;

          if (trendsData?.trends) {
            const formattedTrends = trendsData.trends.map((trend: any) => ({
              title: trend.title,
              summary: trend.summary || trend.description,
              hairstyle: trend.hairstyle,
              imageUrl: trend.image_url,
              items: trend.items || []
            }));
            
            setTrendOutfits(formattedTrends);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to get location for trends");
          setTrendLoading(false);
        }
      );
    } catch (error) {
      console.error('Error loading trend outfits:', error);
      toast.error("Failed to load fashion trends");
    } finally {
      setTrendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fullBodyPhotoUrl) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Stylist</h1>
          <p className="text-muted-foreground">Virtual try-on & styling magic</p>
        </div>

        <Card className="shadow-medium">
          <CardContent className="py-12 text-center space-y-4">
            <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Upload Your Photo First</h3>
              <p className="text-muted-foreground mb-4">
                Please upload a full-body photo in Settings to use the virtual try-on feature
              </p>
              <Button onClick={() => window.location.href = "/settings"}>
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Stylist</h1>
          <p className="text-muted-foreground">Virtual try-on & your style collection</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate("/closet")}
          className="gap-2"
        >
          <ShirtIcon className="w-4 h-4" />
          <span className="hidden sm:inline">My Closet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="virtual-tryon">
            <Wand2 className="w-4 h-4 mr-2" />
            Virtual Try-On
          </TabsTrigger>
          <TabsTrigger value="stylebook">
            <BookHeart className="w-4 h-4 mr-2" />
            Stylebook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="virtual-tryon" className="space-y-4 mt-6">
          {/* New Layout - Outfit slots on left, full body photo on right */}
          <div className="flex gap-4">
            {/* Left Column - Outfit Slots */}
            <div className="flex flex-col gap-3 w-24 sm:w-28">
              {outfitSlots.map((slot) => {
                const Icon = slot.icon;
                return (
                  <button
                    key={slot.type}
                    onClick={() => handleOpenSlotDrawer(slot.type)}
                    className="relative group"
                  >
                    <div className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                      slot.garment 
                        ? "border-primary/50 hover:border-primary" 
                        : "border-dashed border-border hover:border-primary/50"
                    }`}>
                      {slot.garment ? (
                        <img
                          src={slot.garment.image_url}
                          alt={slot.garment.type}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/30">
                          <Plus className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-center mt-1 text-muted-foreground">
                      {slot.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right Column - Full Body Photo Display */}
            <div className="flex-1 relative">
              <div className="h-[70vh] bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl overflow-hidden relative border border-border/50">
                {processingBg ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Processing image...</p>
                    </div>
                  </div>
                ) : tryOnResultUrl ? (
                  <img
                    src={tryOnResultUrl}
                    alt="Virtual try-on result"
                    className="w-full h-full object-cover"
                  />
                ) : removedBgImageUrl ? (
                  <img
                    src={removedBgImageUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={fullBodyPhotoUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Action buttons overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-white/90 hover:bg-white shadow-md"
                    onClick={handleAIFinishRest}
                    disabled={!selectedGarment || generatingAI}
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        AI Finish the Rest
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Drawer */}
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetContent side="bottom" className="h-[45vh] bg-background border-t z-50">
              <SheetHeader>
                <SheetTitle>
                  选择 {outfitSlots.find(s => s.type === selectedCategory)?.label || selectedCategory}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex items-center justify-center h-[calc(100%-4rem)]">
                {filteredGarments.length === 0 ? (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      暂无 {outfitSlots.find(s => s.type === selectedCategory)?.label} 单品
                    </p>
                    <Button size="sm" onClick={() => window.location.href = "/closet"}>
                      添加衣物
                    </Button>
                  </div>
                ) : (
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2">
                      {filteredGarments.map((garment) => (
                        <CarouselItem key={garment.id} className="basis-1/3 sm:basis-1/4 pl-2">
                          <div 
                            onClick={() => handleSelectSlotGarment(selectedCategory, garment)}
                            className="cursor-pointer"
                          >
                            <div className="border-2 hover:border-primary transition-all rounded-lg overflow-hidden bg-background">
                              <div className="aspect-square bg-muted overflow-hidden">
                                <img
                                  src={garment.image_url}
                                  alt={`${garment.brand} ${garment.type}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-2 text-center">
                                <p className="text-xs font-medium truncate">{garment.brand}</p>
                                <p className="text-xs text-muted-foreground truncate">{garment.type}</p>
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-0" />
                    <CarouselNext className="right-0" />
                  </Carousel>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Swap Item Drawer */}
          <Sheet open={swapDrawerOpen} onOpenChange={setSwapDrawerOpen}>
            <SheetContent side="bottom" className="h-[45vh] bg-background border-t z-50">
              <SheetHeader>
                <SheetTitle>
                  Replace with Your {categories.find(c => c.id === swapCategory)?.label}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex items-center justify-center h-[calc(100%-4rem)]">
                {garments.filter(g => g.type.toLowerCase().includes(swapCategory)).length === 0 ? (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No {swapCategory} items in your closet
                    </p>
                    <Button size="sm" onClick={() => window.location.href = "/closet"}>
                      Add Garments
                    </Button>
                  </div>
                ) : (
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2">
                      {garments.filter(g => g.type.toLowerCase().includes(swapCategory)).map((garment) => (
                        <CarouselItem key={garment.id} className="basis-1/3 sm:basis-1/4 pl-2">
                          <div 
                            onClick={() => handleReplaceWithClosetItem(garment, swapCategory)}
                            className="cursor-pointer"
                          >
                            <div className="border-2 hover:border-primary transition-all rounded-lg overflow-hidden bg-background">
                              <div className="aspect-square bg-muted overflow-hidden">
                                <img
                                  src={garment.image_url}
                                  alt={`${garment.brand} ${garment.type}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-2 text-center">
                                <p className="text-xs font-medium truncate">{garment.brand}</p>
                                <p className="text-xs text-muted-foreground truncate">{garment.type}</p>
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-0" />
                    <CarouselNext className="right-0" />
                  </Carousel>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* AI Recommendations */}
          {aiRecommendations.length > 0 && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-base">AI Outfit Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {aiRecommendations.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden relative border border-border">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShirtIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {item.isFromCloset && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-full">
                            From Closet
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold line-clamp-1">{item.category}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.name}</p>
                        {item.brand && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{item.brand}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => handleSwapItem(item.category)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Swap
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stylebook" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                {savedOutfits.length} saved outfit{savedOutfits.length !== 1 ? 's' : ''}
              </p>
            </div>

            {savedOutfits.length === 0 ? (
              <Card className="shadow-medium">
                <CardContent className="py-12 text-center">
                  <BookHeart className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Saved Outfits</h3>
                  <p className="text-muted-foreground mb-4">
                    Save your favorite outfits to your Stylebook
                  </p>
                  <Button onClick={() => window.location.href = "/"}>
                    Explore Outfits
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedOutfits.map((outfit) => (
                  <Card key={outfit.id} className="shadow-medium overflow-hidden group">
                    <div className="relative aspect-[3/4] bg-muted">
                      {outfit.image_url ? (
                        <img
                          src={outfit.image_url}
                          alt={outfit.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute bottom-2 right-2 h-7 w-7 sm:h-8 sm:w-8 bg-background/80 hover:bg-background"
                        onClick={() => toggleLikeOutfit(outfit.id, outfit.liked)}
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{outfit.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {outfit.summary}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Fashion Trends</h2>
                <p className="text-muted-foreground text-sm">
                  Discover the latest fashion trends
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadTrendOutfits}
                disabled={trendLoading}
              >
                {trendLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>

            {trendLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : trendOutfits.length === 0 ? (
              <Card className="shadow-medium">
                <CardContent className="py-12 text-center">
                  <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Trends Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Load fashion trends based on current weather
                  </p>
                  <Button onClick={loadTrendOutfits}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Load Trends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {trendOutfits.map((trend, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-medium transition-shadow cursor-pointer">
                    <div className="aspect-[3/4] relative overflow-hidden">
                      {trend.imageUrl ? (
                        <img
                          src={trend.imageUrl}
                          alt={trend.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-semibold mb-1">{trend.title}</h3>
                        <p className="text-xs opacity-90 line-clamp-2">{trend.summary}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}