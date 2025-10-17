import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import ProductCard from "@/components/ProductCard";
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

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setProcessingProgress(15);
      const { error: uploadError } = await supabase.storage
        .from("ootd-photos")
        .upload(fileName, file);

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

      // Save OOTD record
      const recordData = {
        user_id: user.id,
        photo_url: currentPhotoUrl,
        date: format(new Date(), "yyyy-MM-dd"),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OOTD Diary</h1>
          <p className="text-muted-foreground">{records.length} outfits logged</p>
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
          }
        }}>
          <DialogTrigger asChild>
            <Button>
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
                            {uploadingImage ? "Uploading..." : processingOutfit ? "AI is processing..." : "Click to select or drag & drop"}
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
                    disabled={uploadingImage || processingOutfit}
                  />
                  {(uploadingImage || processingOutfit) && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">

                  <div className="space-y-2">
                    <img 
                      src={currentPhotoUrl} 
                      alt="Uploaded outfit" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>

                  {currentLocation && (
                    <div className="text-sm text-muted-foreground">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => (
            <Card 
              key={record.id} 
              className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="aspect-[3/4] relative bg-muted">
                <img
                  src={record.photo_url}
                  alt={`OOTD from ${record.date}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteRecordId(record.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{format(new Date(record.date), "MMM d, yyyy")}</h3>
                </div>
                {record.location && (
                  <p className="text-sm text-muted-foreground">{record.location}</p>
                )}
                {record.weather && (
                  <p className="text-sm text-muted-foreground">Weather: {record.weather}</p>
                )}
                {record.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{record.notes}</p>
                )}
                {(() => {
                  try {
                    const products = typeof record.products === 'string' 
                      ? JSON.parse(record.products) 
                      : record.products;
                    if (Array.isArray(products) && products.length > 0) {
                      return (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {products.length} item{products.length > 1 ? 's' : ''} identified
                          </p>
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
        
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>OOTD Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <img 
                  src={selectedRecord.photo_url} 
                  alt={`OOTD from ${selectedRecord.date}`}
                  className="w-full max-h-[50vh] object-contain rounded-lg"
                />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{format(new Date(selectedRecord.date), "MMMM d, yyyy")}</h3>
                  {selectedRecord.location && (
                    <p className="text-sm text-muted-foreground">📍 {selectedRecord.location}</p>
                  )}
                  {selectedRecord.weather && (
                    <p className="text-sm text-muted-foreground">🌤️ {selectedRecord.weather}</p>
                  )}
                  {selectedRecord.notes && (
                    <p className="text-sm text-muted-foreground">{selectedRecord.notes}</p>
                  )}
                </div>
                {(() => {
                  try {
                    const products = typeof selectedRecord.products === 'string' 
                      ? JSON.parse(selectedRecord.products) 
                      : selectedRecord.products;
                    if (Array.isArray(products) && products.length > 0) {
                      return (
                        <div className="space-y-3">
                          <h4 className="font-semibold">Identified Items ({products.length})</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map((product: IdentifiedProduct, index: number) => (
                              <Card key={index} className="p-4">
                                <div className="flex gap-4">
                                  {product.imageUrl && (
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.model}
                                      className="w-24 h-24 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1 space-y-1">
                                    <h5 className="font-semibold">{product.brand}</h5>
                                    <p className="text-sm text-muted-foreground">{product.model}</p>
                                    <p className="text-sm text-muted-foreground">{product.type}</p>
                                    {product.color && (
                                      <p className="text-xs text-muted-foreground">Color: {product.color}</p>
                                    )}
                                    {product.material && (
                                      <p className="text-xs text-muted-foreground">Material: {product.material}</p>
                                    )}
                                    {product.price && (
                                      <p className="text-sm font-medium text-primary">{product.price}</p>
                                    )}
                                    {product.availability && (
                                      <p className="text-xs text-muted-foreground">{product.availability}</p>
                                    )}
                                  </div>
                                </div>
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
        <div className="fixed bottom-24 right-4 bg-background border rounded-lg shadow-lg p-4 w-80 z-[60]">
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
      )}
    </div>
  );
}
