import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Wand2, Loader2, Upload, Heart, BookHeart, ShirtIcon, UtensilsCrossed, Glasses, Watch, Sparkle } from "lucide-react";
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

export default function Stylist() {
  const [activeTab, setActiveTab] = useState("virtual-tryon");
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState<string>("");
  const [removedBgImageUrl, setRemovedBgImageUrl] = useState<string>("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string>("");
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);

  const categories = [
    { id: "all", label: "All", icon: Sparkle },
    { id: "top", label: "Tops", icon: ShirtIcon },
    { id: "bottom", label: "Bottoms", icon: UtensilsCrossed },
    { id: "shoes", label: "Shoes", icon: UtensilsCrossed },
    { id: "accessories", label: "Accessories", icon: Watch },
    { id: "hairstyle", label: "Hairstyle", icon: Sparkle },
  ];

  const filteredGarments = selectedCategory === "all" 
    ? garments 
    : garments.filter(g => g.type.toLowerCase().includes(selectedCategory));

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
    }
    // We intentionally omit handleGenerateTryOn from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGarment]);

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">AI Stylist</h1>
        <p className="text-muted-foreground">Virtual try-on & your style collection</p>
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
          {/* New Layout - Full body photo on top, category tags below */}
          <div className="space-y-4">
            {/* Full Body Photo Display */}
            <div className="relative">
              <div className="h-[55vh] sm:h-[60vh] bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl overflow-hidden relative border border-border/50">
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
                    className="w-full h-full object-contain"
                  />
                ) : removedBgImageUrl ? (
                  <img
                    src={removedBgImageUrl}
                    alt="Your photo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={fullBodyPhotoUrl}
                    alt="Your photo"
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* Action buttons overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-white/90 hover:bg-white shadow-md"
                    onClick={handleGenerateTryOn}
                    disabled={!selectedGarment || generating || processingBg}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Try On
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Tags */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 transition-all flex-shrink-0 ${
                      selectedCategory === category.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium whitespace-nowrap">{category.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Garment Grid */}
            <div>
              {filteredGarments.length === 0 ? (
                <Card className="shadow-medium">
                  <CardContent className="text-center py-8">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedCategory === "all" ? "No garments yet" : `No ${selectedCategory} items yet`}
                    </p>
                    <Button size="sm" onClick={() => window.location.href = "/closet"}>
                      Add Garments
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {filteredGarments.map((garment) => (
                    <div
                      key={garment.id}
                      onClick={() => setSelectedGarment(garment)}
                      className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedGarment?.id === garment.id
                          ? "border-primary shadow-lg ring-2 ring-primary/20 scale-105"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      <div className="aspect-square bg-muted">
                        <img
                          src={garment.image_url}
                          alt={`${garment.brand} ${garment.type}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Selected indicator */}
                      {selectedGarment?.id === garment.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-full font-medium">
                            Selected
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
      </Tabs>
    </div>
  );
}