import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Wand2, Loader2, Upload, Heart, BookHeart } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string>("");
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);

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
    try {
      setProcessingBg(true);
      toast.info("Removing background... This may take 30-60 seconds on first load.");
      
      console.log('Loading image for background removal from:', imageUrl);
      
      // Fetch image and create blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log(`Image blob loaded: ${(blob.size / 1024).toFixed(1)}KB`);
      
      // Load image
      const img = await loadImage(blob);
      console.log(`Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
      
      console.log('Starting background removal with Transformers.js...');
      
      // Remove background
      const resultBlob = await removeBackground(img);
      
      // Convert blob to data URL for immediate display
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setRemovedBgImageUrl(dataUrl);
        toast.success("Background removed successfully!");
      };
      reader.onerror = () => {
        throw new Error('Failed to read result blob');
      };
      reader.readAsDataURL(resultBlob);
      
    } catch (error) {
      console.error("Background removal error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to remove background: ${errorMessage}. Using original photo.`);
      // Fallback: use original photo if background removal fails
      setRemovedBgImageUrl(imageUrl);
    } finally {
      setProcessingBg(false);
    }
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
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-4">
            {/* Model Display */}
            <div className="relative">
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl overflow-hidden relative border border-border/50">
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
                    className="w-full h-full object-contain p-4"
                  />
                ) : removedBgImageUrl ? (
                  <img
                    src={removedBgImageUrl}
                    alt="Your photo"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <img
                    src={fullBodyPhotoUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Bottom action bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full px-6"
                    >
                      Save Look
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full px-6"
                      onClick={handleGenerateTryOn}
                      disabled={!selectedGarment || generating || processingBg}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Try On
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Garment Selection Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3">Select Garment</h3>
              {garments.length === 0 ? (
                <Card className="shadow-medium">
                  <CardContent className="text-center py-8">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No garments yet</p>
                    <Button size="sm" onClick={() => window.location.href = "/closet"}>
                      Add Garments
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {garments.map((garment) => (
                    <div
                      key={garment.id}
                      onClick={() => setSelectedGarment(garment)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedGarment?.id === garment.id
                          ? "border-primary shadow-lg ring-2 ring-primary/20"
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
                      
                      {/* Garment info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">{garment.brand}</p>
                        <p className="text-white/80 text-[10px] truncate">{garment.type}</p>
                      </div>

                      {/* Like button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeGarment(garment.id, garment.liked || false);
                        }}
                      >
                        <Heart 
                          className={`w-3.5 h-3.5 ${garment.liked ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </Button>

                      {/* Selected indicator */}
                      {selectedGarment?.id === garment.id && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                          Selected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex gap-4 h-[calc(100vh-16rem)]">
            {/* Left: Model Display (60% width for better balance) */}
            <div className="w-[60%] relative">
              <div className="h-full bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl overflow-hidden relative border border-border/50">
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
                    className="w-full h-full object-contain p-4"
                  />
                ) : removedBgImageUrl ? (
                  <img
                    src={removedBgImageUrl}
                    alt="Your photo"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <img
                    src={fullBodyPhotoUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Bottom action bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full px-6"
                    >
                      Save Look
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full px-6"
                      onClick={handleGenerateTryOn}
                      disabled={!selectedGarment || generating || processingBg}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Try On
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Garment Selection (40% width for better readability) */}
            <div className="w-[40%] flex flex-col">
              <h3 className="text-sm font-medium mb-3">Select Garment</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {garments.length === 0 ? (
                  <Card className="h-full flex items-center justify-center shadow-medium">
                    <CardContent className="text-center py-8">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No garments yet</p>
                      <Button size="sm" onClick={() => window.location.href = "/closet"}>
                        Add Garments
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  garments.map((garment) => (
                    <div
                      key={garment.id}
                      onClick={() => setSelectedGarment(garment)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedGarment?.id === garment.id
                          ? "border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
                          : "border-border/50 hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div className="aspect-square bg-muted">
                        <img
                          src={garment.image_url}
                          alt={`${garment.brand} ${garment.type}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Garment info overlay - improved with better spacing */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
                        <p className="text-white text-sm font-medium line-clamp-1">{garment.brand}</p>
                        <p className="text-white/90 text-xs line-clamp-1">{garment.type}</p>
                      </div>

                      {/* Like button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 bg-background/90 hover:bg-background rounded-full shadow-sm backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeGarment(garment.id, garment.liked || false);
                        }}
                      >
                        <Heart 
                          className={`w-4 h-4 transition-all ${garment.liked ? 'fill-red-500 text-red-500 scale-110' : ''}`}
                        />
                      </Button>

                      {/* Selected indicator */}
                      {selectedGarment?.id === garment.id && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-medium shadow-md animate-fade-in">
                          Selected
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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