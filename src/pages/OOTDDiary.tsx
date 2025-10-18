import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarDays } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForLog, setSelectedDateForLog] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">OOTD Diary</h1>
          <p className="text-sm text-muted-foreground">{records.length} outfits logged</p>
        </div>
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
        <Card className="shadow-medium">
          <CardContent className="py-12 text-center space-y-4">
            <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No outfits logged yet</h3>
              <p className="text-muted-foreground mb-4">
                Start documenting your daily style journey
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Log Your First OOTD
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Calendar Header */}
          <Card className="shadow-soft mb-4 sm:mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-serif font-light">
                  {viewMode === 'month' && format(currentMonth, "MMMM yyyy")}
                  {viewMode === 'week' && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                  {viewMode === 'day' && format(currentDate, "MMMM d, yyyy")}
                </h2>
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                  {/* View Mode Toggles */}
                  <div className="flex gap-0.5 sm:gap-1 bg-muted rounded-lg p-0.5 sm:p-1 flex-1 sm:flex-initial">
                    <Button
                      variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('day')}
                      className="text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8 flex-1 sm:flex-initial"
                    >
                      3 Days
                    </Button>
                    <Button
                      variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('week')}
                      className="text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8 flex-1 sm:flex-initial"
                    >
                      Week
                    </Button>
                    <Button
                      variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('month')}
                      className="text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8 flex-1 sm:flex-initial"
                    >
                      Month
                    </Button>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-1 sm:gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-9 sm:w-9"
                      onClick={() => {
                        if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
                        if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
                        if (viewMode === 'day') setCurrentDate(subDays(currentDate, 3));
                      }}
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    
                    {/* Calendar Picker */}
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9"
                        >
                          <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                          mode="single"
                          selected={viewMode === 'month' ? currentMonth : currentDate}
                          onSelect={(date) => {
                            if (date) {
                              setCurrentMonth(date);
                              setCurrentDate(date);
                              setCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-9 sm:w-9"
                      onClick={() => {
                        if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
                        if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
                        if (viewMode === 'day') setCurrentDate(addDays(currentDate, 3));
                      }}
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {/* Day Headers */}
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div key={idx} className="text-center text-[10px] sm:text-sm font-medium text-muted-foreground py-1 sm:py-2 hidden sm:block">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}
                </div>
              ))}
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div key={idx} className="text-center text-[10px] font-medium text-muted-foreground py-1 block sm:hidden">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {(() => {
                const monthStart = startOfMonth(currentMonth);
                const monthEnd = endOfMonth(currentMonth);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                
                const startDay = monthStart.getDay();
                const paddingDays = Array(startDay).fill(null);
                
                return [...paddingDays, ...days].map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }
                  
                  const dayRecords = records.filter(r => isSameDay(new Date(r.date), day));
                  const hasRecord = dayRecords.length > 0;
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <Card 
                      key={day.toISOString()}
                      className={`aspect-square overflow-hidden cursor-pointer transition-all hover:shadow-large ${
                        !isSameMonth(day, currentMonth) ? 'opacity-50' : ''
                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        if (hasRecord) {
                          setSelectedRecord(dayRecords[0]);
                        } else {
                          // Open log dialog for this date
                          setSelectedDateForLog(day);
                          setIsAddDialogOpen(true);
                        }
                      }}
                    >
                      <CardContent className="p-0 h-full relative">
                        {hasRecord ? (
                          <>
                            <img
                              src={dayRecords[0].photo_url}
                              alt={`OOTD ${format(day, 'd')}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                            <div className="absolute bottom-1 left-1 right-1 sm:bottom-2 sm:left-2 sm:right-2">
                              <div className="text-lg sm:text-2xl font-serif font-light text-foreground">
                                {format(day, 'd')}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-0.5 right-0.5 h-5 w-5 sm:h-6 sm:w-6 bg-background/80 hover:bg-background"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRecordId(dayRecords[0].id);
                              }}
                            >
                              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full hover:bg-muted/30 transition-colors">
                            <div className="text-center">
                              <span className="text-lg sm:text-2xl font-light text-muted-foreground">
                                {format(day, 'd')}
                              </span>
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mx-auto mt-1 text-muted-foreground/50" />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {(() => {
                const weekStart = startOfWeek(currentDate);
                const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                
                return days.map((day) => {
                  const dayRecords = records.filter(r => isSameDay(new Date(r.date), day));
                  const hasRecord = dayRecords.length > 0;
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      <div className="text-center">
                        <div className="text-sm font-medium text-muted-foreground">{format(day, 'EEE')}</div>
                        <div className={`text-lg font-serif font-light ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                      <Card 
                        className={`aspect-[3/4] overflow-hidden cursor-pointer transition-all hover:shadow-large ${
                          isToday ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => hasRecord && setSelectedRecord(dayRecords[0])}
                      >
                        <CardContent className="p-0 h-full relative">
                          {hasRecord ? (
                            <>
                              <img
                                src={dayRecords[0].photo_url}
                                alt={`OOTD ${format(day, 'MMM d')}`}
                                className="w-full h-full object-cover"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRecordId(dayRecords[0].id);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full bg-muted/30">
                              <span className="text-4xl font-light text-muted-foreground/30">+</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* 3-Day View - Vertical cards */}
          {viewMode === 'day' && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {(() => {
                const days = [
                  subDays(currentDate, 1),
                  currentDate,
                  addDays(currentDate, 1)
                ];
                
                return days.map((day) => {
                  const dayRecords = records.filter(r => isSameDay(new Date(r.date), day));
                  const hasRecord = dayRecords.length > 0;
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <Card 
                      key={day.toISOString()}
                      className={`overflow-hidden cursor-pointer transition-all hover:shadow-large ${
                        isToday ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => hasRecord && setSelectedRecord(dayRecords[0])}
                    >
                      <CardContent className="p-0">
                        <div className="space-y-3 p-4">
                          {/* Date Header */}
                          <div className="text-center pb-2 border-b">
                            <div className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</div>
                            <div className={`text-2xl font-serif font-light ${isToday ? 'text-primary' : ''}`}>
                              {format(day, 'MMM d')}
                            </div>
                          </div>
                          
                          {/* Vertical Full Body Image */}
                          {hasRecord ? (
                            <>
                              <div className="aspect-[3/4] relative">
                                <img
                                  src={dayRecords[0].photo_url}
                                  alt={`OOTD ${format(day, 'MMM d')}`}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteRecordId(dayRecords[0].id);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="space-y-1 text-center text-sm">
                                {dayRecords[0].location && (
                                  <p className="text-muted-foreground truncate">📍 {dayRecords[0].location}</p>
                                )}
                                {dayRecords[0].weather && (
                                  <p className="text-muted-foreground">☀️ {dayRecords[0].weather}</p>
                                )}
                                {dayRecords[0].notes && (
                                  <p className="text-muted-foreground text-xs line-clamp-2">{dayRecords[0].notes}</p>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="aspect-[3/4] flex items-center justify-center bg-muted/30 rounded-lg">
                              <span className="text-4xl font-light text-muted-foreground/30">+</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          )}
        
        <AlertDialog open={!!deleteRecordId} onOpenChange={(open) => !open && setDeleteRecordId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete OOTD?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this OOTD record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteRecordId) {
                    handleDeleteRecord(deleteRecordId);
                    setDeleteRecordId(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-3xl font-serif font-light">
                <Camera className="w-7 h-7 text-accent" strokeWidth={1.5} />
                OOTD Details
              </DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-8 mt-6">
                {/* Summary Info */}
                <div className="bg-secondary/30 rounded-sm p-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif font-light">{format(new Date(selectedRecord.date), "MMMM d, yyyy")}</h3>
                    {selectedRecord.location && (
                      <p className="text-base text-muted-foreground">📍 {selectedRecord.location}</p>
                    )}
                    {selectedRecord.weather && (
                      <p className="text-base text-muted-foreground">🌤️ {selectedRecord.weather}</p>
                    )}
                    {selectedRecord.notes && (
                      <p className="text-base leading-relaxed text-foreground/80 font-sans mt-4">{selectedRecord.notes}</p>
                    )}
                  </div>
                </div>

                {/* Full Body Photo */}
                <div className="space-y-4">
                  <h3 className="font-serif font-light text-2xl tracking-wide">Full Outfit</h3>
                  <div className="max-w-md mx-auto">
                    <img 
                      src={selectedRecord.photo_url} 
                      alt={`OOTD from ${selectedRecord.date}`}
                      className="w-full object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* Outfit Items */}
                {(() => {
                  try {
                    const products = typeof selectedRecord.products === 'string' 
                      ? JSON.parse(selectedRecord.products) 
                      : selectedRecord.products;
                    if (Array.isArray(products) && products.length > 0) {
                      return (
                        <div className="space-y-6">
                          <h3 className="font-serif font-light text-2xl tracking-wide">Outfit Items</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product: IdentifiedProduct, index: number) => (
                              <Card key={index} className="shadow-card hover:shadow-large transition-all duration-500 overflow-hidden group border-border/50">
                                <CardContent className="p-0">
                                  {/* Image Container */}
                                  <div className="relative w-full aspect-square bg-secondary/20 overflow-hidden">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={`${product.brand || ""} ${product.model}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                                        <Camera className="w-16 h-16 text-muted-foreground" strokeWidth={1} />
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Info */}
                                  <div className="p-4 space-y-3">
                                    <h4 className="font-serif font-light text-base leading-tight text-foreground truncate">
                                      {product.model || product.type}
                                    </h4>

                                    <div className="flex items-center justify-between gap-2">
                                      {product.brand && (
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-sans font-light">
                                          {product.brand}
                                        </p>
                                      )}
                                      <span className="text-[9px] uppercase tracking-wider font-sans font-normal bg-muted px-1.5 py-0 rounded">
                                        {product.type}
                                      </span>
                                    </div>

                                    {(product.color || product.material) && (
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        {product.color && <p>Color: {product.color}</p>}
                                        {product.material && <p>Material: {product.material}</p>}
                                      </div>
                                    )}

                                    {product.price && (
                                      <p className="text-sm font-medium text-primary pt-2">{product.price}</p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
        </>
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
    </div>
  );
}
