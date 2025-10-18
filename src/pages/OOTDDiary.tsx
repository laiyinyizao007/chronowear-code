import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarDays, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import ProductCard from "@/components/ProductCard";
import { removeBackground, loadImage } from "@/lib/backgroundRemoval";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IdentifiedProduct {
  brand: string;
  model: string;
  type: string;
  color?: string;
  material?: string;
  imageUrl?: string;
  price?: string;
  style?: string;
  availability?: string;
  features?: string[];
}

interface OOTDRecord {
  id: string;
  photo_url: string;
  date: string;
  location: string;
  weather: string;
  notes: string;
  products?: any; // JSON field from database
}

export default function OOTDDiary() {
  const [records, setRecords] = useState<OOTDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingOutfit, setProcessingOutfit] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentWeather, setCurrentWeather] = useState("");
  const [identifiedProducts, setIdentifiedProducts] = useState<IdentifiedProduct[]>([]);
  const [selectedProductIndices, setSelectedProductIndices] = useState<Set<number>>(new Set());
  const [showProductConfirmation, setShowProductConfirmation] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OOTDRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [removingBackground, setRemovingBackground] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForLog, setSelectedDateForLog] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planningMode, setPlanningMode] = useState<'closet-only' | 'with-wishlist' | 'any-items'>('closet-only');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [ootdPlan, setOotdPlan] = useState<any>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("ootd_records")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setRecords((data || []) as OOTDRecord[]);
    } catch (error: any) {
      toast.error("Failed to load OOTD records");
    } finally {
      setLoading(false);
    }
  };

  const getLocationAndWeather = async () => {
    try {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const { data, error } = await supabase.functions.invoke("get-weather", {
            body: { latitude, longitude },
          });

          if (error) throw error;

          setCurrentLocation(data.location || "Unknown Location");
          setCurrentWeather(data.current?.weatherDescription || "Unknown");
          toast.success("Location and weather detected!");
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to get location");
        }
      );
    } catch (error: any) {
      console.error("Weather error:", error);
      toast.error("Failed to get weather data");
    }
  };

  const identifyGarments = async (imageUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("identify-garment", {
        body: { imageUrl },
      });

      if (error) throw error;

      if (data.garments && Array.isArray(data.garments)) {
        return data.garments;
      }
      return [];
    } catch (error: any) {
      console.error("Garment identification error:", error);
      return [];
    }
  };

  const searchProductInfo = async (brand: string, model: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("search-product-info", {
        body: { brand, model },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Product search error:", error);
      return null;
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isProcessing) {
      toast.error("Please wait for the current processing to complete");
      return;
    }

    setUploadingImage(true);
    setProcessingOutfit(true);
    setProcessingProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Remove background first
      setRemovingBackground(true);
      toast.info("Removing background...");
      
      const imageElement = await loadImage(file);
      const processedBlob = await removeBackground(imageElement);
      
      setRemovingBackground(false);
      toast.success("Background removed!");

      const fileExt = "png"; // Always use PNG for transparent backgrounds
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setProcessingProgress(15);
      const { error: uploadError } = await supabase.storage
        .from("ootd-photos")
        .upload(fileName, processedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ootd-photos")
        .getPublicUrl(fileName);

      setCurrentPhotoUrl(publicUrl);
      setUploadingImage(false);
      setProcessingProgress(30);

      // Close dialog and start processing
      setIsAddDialogOpen(false);
      setIsProcessing(true);

      // Get location and weather
      setProcessingProgress(40);
      await getLocationAndWeather();

      // Identify garments
      setProcessingProgress(55);
      const garments = await identifyGarments(publicUrl);

      // Search product info for each garment
      setProcessingProgress(70);
      const products: IdentifiedProduct[] = [];
      
      for (const garment of garments) {
        const productInfo = await searchProductInfo(garment.brand, garment.model);
        if (productInfo) {
          products.push({
            brand: garment.brand,
            model: garment.model,
            type: garment.type,
            color: garment.color,
            material: garment.material,
            imageUrl: productInfo.imageUrl,
            price: productInfo.price,
            style: productInfo.style,
            availability: productInfo.availability,
            features: productInfo.features,
          });
        }
      }

      setIdentifiedProducts(products);
      
      // Pre-select all identified products
      const allIndices = new Set(products.map((_, index) => index));
      setSelectedProductIndices(allIndices);
      
      setProcessingProgress(100);
      
      if (products.length > 0) {
        toast.success(`Identified ${products.length} item${products.length > 1 ? 's' : ''}!`);
        setShowProductConfirmation(true);
      } else {
        toast.info("No items identified");
      }

      setIsAddDialogOpen(true);
      setIsProcessing(false);
      setProcessingProgress(0);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      setIsProcessing(false);
      setProcessingProgress(0);
      return null;
    } finally {
      setProcessingOutfit(false);
      setUploadingImage(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!currentPhotoUrl) {
      toast.error("Please upload a photo");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter selected products
      const selectedProducts = identifiedProducts.filter((_, index) => 
        selectedProductIndices.has(index)
      );

      // Save OOTD record with selected date
      const recordDate = selectedDateForLog || new Date();
      const recordData = {
        user_id: user.id,
        photo_url: currentPhotoUrl,
        date: format(recordDate, "yyyy-MM-dd"),
        location: currentLocation || "",
        weather: currentWeather || "",
        notes: "",
        products: JSON.stringify(selectedProducts),
      };

      const { error: recordError } = await supabase.from("ootd_records").insert([recordData]);

      if (recordError) throw recordError;

      // Save each selected product to My Closet with product image
      for (const product of selectedProducts) {
        const garmentData = {
          user_id: user.id,
          image_url: product.imageUrl || currentPhotoUrl, // Use product image if available
          type: product.type || "Other",
          color: product.color || "",
          season: "All-Season",
          brand: product.brand || "",
          material: product.material || "",
        };

        // Check if this product already exists to avoid duplicates
        const { data: existing } = await supabase
          .from("garments")
          .select("id")
          .eq("user_id", user.id)
          .eq("brand", garmentData.brand)
          .eq("type", garmentData.type)
          .maybeSingle();

        if (!existing) {
          await supabase.from("garments").insert([garmentData]);
        }
      }

      toast.success(`OOTD saved! ${selectedProducts.length} items added to closet.`);
      setIsAddDialogOpen(false);
      setCurrentPhotoUrl("");
      setCurrentLocation("");
      setCurrentWeather("");
      setIdentifiedProducts([]);
      setSelectedProductIndices(new Set());
      setShowProductConfirmation(false);
      setSelectedDateForLog(undefined);
      loadRecords();
    } catch (error: any) {
      toast.error("Failed to save OOTD");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ootd_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("OOTD deleted successfully!");
      loadRecords();
    } catch (error: any) {
      toast.error("Failed to delete OOTD");
    }
  };

  const toggleProductSelection = (index: number) => {
    setSelectedProductIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const generateOOTDPlan = async () => {
    try {
      setGeneratingPlan(true);
      
      // Get user's garments
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: garments } = await supabase
        .from('garments')
        .select('*')
        .eq('user_id', user.id);

      if (!garments || garments.length === 0) {
        toast.error("You need items in your closet to generate a plan");
        return;
      }

      // Get 7-day weather forecast
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const weatherPromises = [];
          for (let i = 0; i < 7; i++) {
            weatherPromises.push(
              supabase.functions.invoke("get-weather", {
                body: { latitude, longitude }
              })
            );
          }

          const weatherResults = await Promise.all(weatherPromises);
          const weatherForecast = weatherResults.map((result, idx) => ({
            day: idx + 1,
            temp: result.data?.current?.temperature || 70,
            weather: result.data?.current?.weatherDescription || 'Clear',
            uvIndex: result.data?.current?.uvIndex || 3
          }));

          // Get wishlist items if needed
          let wishlistItems = [];
          if (planningMode === 'with-wishlist') {
            const { data: savedOutfits } = await supabase
              .from('saved_outfits')
              .select('items')
              .eq('user_id', user.id)
              .eq('liked', true);
            
            wishlistItems = savedOutfits?.flatMap(outfit => 
              JSON.parse(outfit.items as any || '[]')
            ) || [];
          }

          // Call AI to generate plan
          const { data: planData, error: planError } = await supabase.functions.invoke('generate-ootd-plan', {
            body: {
              garments,
              weatherForecast,
              planningMode,
              wishlistItems
            }
          });

          if (planError) throw planError;

          setOotdPlan(planData);
          toast.success(`Generated ${planData.totalDays}-day outfit plan!`);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to get location for weather forecast");
        }
      );
    } catch (error: any) {
      console.error('Error generating OOTD plan:', error);
      toast.error("Failed to generate plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hidden dialog for Log OOTD functionality - accessible via navigation */}
      <div className="hidden">
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            // Reset form when closing
            setCurrentPhotoUrl("");
            setCurrentLocation("");
            setCurrentWeather("");
            setIdentifiedProducts([]);
            setSelectedProductIndices(new Set());
            setShowProductConfirmation(false);
            setSelectedDateForLog(undefined);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Log OOTD
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {!currentPhotoUrl ? (
                <DialogHeader>
                  <DialogTitle>Log Today's Outfit</DialogTitle>
                </DialogHeader>
              ) : (
                <DialogHeader>
                  <DialogTitle>确认选择的单品</DialogTitle>
                </DialogHeader>
              )}
              
              {!currentPhotoUrl ? (
                <div className="space-y-4 py-8">
                  <label htmlFor="ootd-upload" className="cursor-pointer">
                    <Card className="p-12 hover:shadow-large transition-all duration-300 hover:border-primary">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <Camera className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl mb-2">Upload Your Outfit Photo</h3>
                          <p className="text-sm text-muted-foreground">
                            {removingBackground 
                              ? "Removing background..." 
                              : uploadingImage 
                              ? "Uploading..." 
                              : processingOutfit 
                              ? "AI is processing..." 
                              : "Click to select (auto background removal)"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </label>
                  <input
                    id="ootd-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || processingOutfit || removingBackground}
                  />
                  {(uploadingImage || processingOutfit || removingBackground) && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <Label className="text-sm font-medium">Date:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                          <CalendarDays className="w-3 h-3 mr-2" />
                          {selectedDateForLog ? format(selectedDateForLog, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDateForLog || new Date()}
                          onSelect={setSelectedDateForLog}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <img 
                      src={currentPhotoUrl} 
                      alt="Uploaded outfit" 
                      className="w-full h-40 sm:h-48 object-cover rounded-lg"
                    />
                  </div>

                  {currentLocation && (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      📍 {currentLocation} {currentWeather && `• ${currentWeather}`}
                    </div>
                  )}
                  
                  {identifiedProducts.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto p-2">
                        {identifiedProducts.map((product, index) => (
                          <div key={index} className="relative">
                            <div 
                              className={`cursor-pointer transition-all ${
                                selectedProductIndices.has(index) ? 'ring-2 ring-primary' : ''
                              }`}
                              onClick={() => toggleProductSelection(index)}
                            >
                              <ProductCard
                                brand={product.brand}
                                model={product.model}
                                price={product.price || ""}
                                style={product.style || ""}
                                features={product.features || []}
                                imageUrl={product.imageUrl}
                                material={product.material}
                                color={product.color}
                                availability={product.availability}
                                selected={selectedProductIndices.has(index)}
                                onSelect={() => toggleProductSelection(index)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          {selectedProductIndices.size} of {identifiedProducts.length} items selected
                        </p>
                        <Button onClick={handleSaveRecord}>
                          Save OOTD
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center space-y-4">
                      <p className="text-muted-foreground">No products identified from the image</p>
                      <Button onClick={handleSaveRecord} variant="outline">
                        Save Anyway
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
        </Dialog>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Camera className="w-16 h-16 text-muted-foreground mb-6" />
          <h3 className="text-xl font-medium mb-2">No outfits yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Start your style journey today
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log OOTD
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Navigation Controls - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg w-full sm:w-auto">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="flex-1 sm:flex-none text-xs sm:px-6"
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="flex-1 sm:flex-none text-xs sm:px-6"
              >
                Week
              </Button>
            </div>

            {/* Plan Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPlanDialog(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Plan
            </Button>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
                  else setCurrentDate(subWeeks(currentDate, 1));
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 min-w-[140px]">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm">{format(currentDate, 'MMM yyyy')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
                  else setCurrentDate(addWeeks(currentDate, 1));
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Month Display - Only show in day view */}
          {viewMode === 'day' && (
            <div className="text-center py-4">
              <h2 className="text-4xl sm:text-6xl font-light tracking-wide text-muted-foreground/40">
                {format(currentDate, 'MMMM').toUpperCase()}
              </h2>
            </div>
          )}

          {/* Calendar Grid - Minimal, No Dashed Borders */}
          <div className="bg-card rounded-lg overflow-hidden">
            {viewMode === 'day' ? (
              <div className="max-w-lg mx-auto p-4">
                {(() => {
                  const day = currentDate;
                  const dayRecords = records.filter((r) => isSameDay(new Date(r.date), day));
                  const hasRecord = dayRecords.length > 0;

                  return (
                    <Card 
                      className="overflow-hidden cursor-pointer transition-all hover:shadow-medium"
                      onClick={() => {
                        if (hasRecord) {
                          setSelectedRecord(dayRecords[0]);
                        } else {
                          setSelectedDateForLog(day);
                          setIsAddDialogOpen(true);
                        }
                      }}
                    >
                      <div className="relative aspect-[3/4]">
                        {hasRecord ? (
                          <>
                            <img
                              src={dayRecords[0].photo_url}
                              alt={`OOTD ${format(day, "d")}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              <div className="text-4xl font-light mb-1">
                                {format(day, "d")}
                              </div>
                              <div className="text-sm opacity-90">{format(day, "EEEE")}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-3 right-3 h-10 w-10 bg-background/10 hover:bg-background/20 text-white backdrop-blur-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRecordId(dayRecords[0].id);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full bg-secondary">
                            <span className="text-6xl font-light text-muted-foreground mb-2">
                              {format(day, "d")}
                            </span>
                            <span className="text-base text-muted-foreground">{format(day, "EEEE")}</span>
                            <Plus className="w-8 h-8 text-muted-foreground/40 mt-6" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-4 px-2 max-w-5xl mx-auto">
                {/* First row - 4 items (Mon-Thu) */}
                <div className="grid grid-cols-4 gap-2 justify-items-center">
                  {(() => {
                    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                    const firstRowDays = [0, 1, 2, 3].map(i => addDays(weekStart, i));

                    return firstRowDays.map((day) => {
                      const dayRecords = records.filter((r) => isSameDay(new Date(r.date), day));
                      const hasRecord = dayRecords.length > 0;
                      const isToday = isSameDay(day, new Date());

                      return (
                        <Card
                          key={day.toISOString()}
                          className={cn(
                            "group overflow-hidden cursor-pointer transition-all hover:shadow-medium",
                            isToday && "ring-2 ring-primary"
                          )}
                          onClick={() => {
                            if (hasRecord) {
                              setSelectedRecord(dayRecords[0]);
                            } else {
                              setSelectedDateForLog(day);
                              setIsAddDialogOpen(true);
                            }
                          }}
                        >
                          <div className="relative">
                            {/* Date Label */}
                            <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm px-2 py-1.5 border-b">
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-medium">{format(day, "d")}</span>
                                <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                              </div>
                            </div>

                            {/* Vertical card image - double height */}
                            <div className="aspect-[3/10]">
                              {hasRecord ? (
                                <>
                                  <img
                                    src={dayRecords[0].photo_url}
                                    alt={`OOTD ${format(day, "MMM d")}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-10 right-1 h-7 w-7 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteRecordId(dayRecords[0].id);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full bg-secondary">
                                  <Plus className="w-6 h-6 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    });
                  })()}
                </div>

                {/* Second row - 3 items centered (Fri-Sun) */}
                <div className="grid grid-cols-7 gap-2 justify-items-center">
                  <div className="col-span-1" />
                  {(() => {
                    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                    const secondRowDays = [4, 5, 6].map(i => addDays(weekStart, i));

                    return secondRowDays.map((day) => {
                      const dayRecords = records.filter((r) => isSameDay(new Date(r.date), day));
                      const hasRecord = dayRecords.length > 0;
                      const isToday = isSameDay(day, new Date());

                      return (
                        <Card
                          key={day.toISOString()}
                          className={cn(
                            "group overflow-hidden cursor-pointer transition-all hover:shadow-medium col-span-2",
                            isToday && "ring-2 ring-primary"
                          )}
                          onClick={() => {
                            if (hasRecord) {
                              setSelectedRecord(dayRecords[0]);
                            } else {
                              setSelectedDateForLog(day);
                              setIsAddDialogOpen(true);
                            }
                          }}
                        >
                          <div className="relative">
                            {/* Date Label */}
                            <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm px-2 py-1.5 border-b">
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-medium">{format(day, "d")}</span>
                                <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                              </div>
                            </div>

                            {/* Vertical card image - double height */}
                            <div className="aspect-[3/10]">
                              {hasRecord ? (
                                <>
                                  <img
                                    src={dayRecords[0].photo_url}
                                    alt={`OOTD ${format(day, "MMM d")}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-10 right-1 h-7 w-7 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteRecordId(dayRecords[0].id);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full bg-secondary">
                                  <Plus className="w-6 h-6 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Record Detail Dialog */}
          <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedRecord && format(new Date(selectedRecord.date), 'MMMM d, yyyy')}
                </DialogTitle>
              </DialogHeader>
              {selectedRecord && (
                <div className="space-y-4">
                  <img
                    src={selectedRecord.photo_url}
                    alt="OOTD"
                    className="w-full rounded-lg"
                  />
                  {selectedRecord.location && (
                    <p className="text-sm"><strong>Location:</strong> {selectedRecord.location}</p>
                  )}
                  {selectedRecord.weather && (
                    <p className="text-sm"><strong>Weather:</strong> {selectedRecord.weather}</p>
                  )}
                  {selectedRecord.notes && (
                    <p className="text-sm"><strong>Notes:</strong> {selectedRecord.notes}</p>
                  )}
                  {selectedRecord.products && Array.isArray(selectedRecord.products) && selectedRecord.products.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Products</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRecord.products.map((product: any, idx: number) => (
                          <ProductCard
                            key={idx}
                            brand={product.brand || ''}
                            model={product.model || ''}
                            price={product.price || ''}
                            style={product.style || ''}
                            features={product.features || []}
                            imageUrl={product.imageUrl}
                            onSelect={() => {}}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deleteRecordId} onOpenChange={(open) => !open && setDeleteRecordId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this OOTD record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteRecordId && handleDeleteRecord(deleteRecordId)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      
      {isProcessing && (
        <div className="fixed top-20 left-0 right-0 bg-background/95 backdrop-blur-sm border-b shadow-md p-4 z-[60] animate-fade-in">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm font-medium">Processing outfit...</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* AI Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Outfit Planning</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Planning Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Planning Mode</Label>
              <div className="grid gap-2">
                <Button
                  variant={planningMode === 'closet-only' ? 'default' : 'outline'}
                  onClick={() => setPlanningMode('closet-only')}
                  className="justify-start text-left h-auto py-3 px-4"
                >
                  <div>
                    <div className="font-medium">Closet Only</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Use only items you already own
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant={planningMode === 'with-wishlist' ? 'default' : 'outline'}
                  onClick={() => setPlanningMode('with-wishlist')}
                  className="justify-start text-left h-auto py-3 px-4"
                >
                  <div>
                    <div className="font-medium">Include Wishlist</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Add items from your saved/liked outfits
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant={planningMode === 'any-items' ? 'default' : 'outline'}
                  onClick={() => setPlanningMode('any-items')}
                  className="justify-start text-left h-auto py-3 px-4"
                >
                  <div>
                    <div className="font-medium">Any Market Items</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Suggest any available items from brands
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateOOTDPlan} 
              disabled={generatingPlan}
              className="w-full"
              size="lg"
            >
              {generatingPlan ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>

            {/* Display Plan Results */}
            {ootdPlan && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {ootdPlan.totalDays}-Day Outfit Plan
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    No item repetition
                  </span>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {ootdPlan.plan?.map((dayPlan: any, index: number) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Day {dayPlan.day} - {dayPlan.outfit.title}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {dayPlan.weather}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {dayPlan.outfit.notes}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dayPlan.outfit.items.map((item: any, idx: number) => (
                            <span 
                              key={idx}
                              className={cn(
                                "text-xs px-2 py-1 rounded",
                                item.fromCloset 
                                  ? "bg-primary/10 text-primary" 
                                  : "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {ootdPlan.remainingItems && ootdPlan.remainingItems.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {ootdPlan.remainingItems.length} items remaining unused
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
