import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadImage, removeBackground } from "@/lib/backgroundRemoval";

interface Garment {
  id: string;
  image_url: string;
  type: string;
  brand: string;
  color: string;
}

export default function Stylist() {
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState<string>("");
  const [removedBgImageUrl, setRemovedBgImageUrl] = useState<string>("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string>("");

  useEffect(() => {
    loadData();
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

  const processBackgroundRemoval = async (imageUrl: string) => {
    try {
      setProcessingBg(true);
      
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Load as HTMLImageElement
      const imgElement = await loadImage(blob);
      
      // Remove background
      const resultBlob = await removeBackground(imgElement);
      
      // Create a data URL for display
      const dataUrl = URL.createObjectURL(resultBlob);
      setRemovedBgImageUrl(dataUrl);
      
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error("Failed to remove background");
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
          personImageUrl: removedBgImageUrl,
          garmentImageUrl: selectedGarment.image_url,
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setTryOnResultUrl(data.imageUrl);
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
          <h1 className="text-3xl font-bold">AI Stylist</h1>
          <p className="text-muted-foreground">Virtual try-on & styling magic</p>
        </div>

        <Card className="shadow-medium">
          <CardContent className="py-12 text-center space-y-4">
            <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
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
        <h1 className="text-3xl font-bold">AI Stylist</h1>
        <p className="text-muted-foreground">Virtual try-on & styling magic</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Model */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Your Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative">
              {processingBg ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Removing background...</p>
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
                  alt="Your photo with background removed"
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={fullBodyPhotoUrl}
                  alt="Your full body photo"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Garment Selection */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              Select Garment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {garments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">No garments in your closet yet</p>
                <Button onClick={() => window.location.href = "/closet"}>
                  Add Garments
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {garments.map((garment) => (
                    <div
                      key={garment.id}
                      onClick={() => setSelectedGarment(garment)}
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedGarment?.id === garment.id
                          ? "border-primary shadow-lg scale-105"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={garment.image_url}
                        alt={`${garment.brand} ${garment.type}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {selectedGarment && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <p className="font-medium">{selectedGarment.brand}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedGarment.type} • {selectedGarment.color}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleGenerateTryOn}
                  disabled={!selectedGarment || generating || processingBg}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Try On This Garment
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}