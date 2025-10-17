import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Camera, Loader2, X } from "lucide-react";
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
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

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

    setUploadingImage(true);
    setProcessingOutfit(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ootd-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ootd-photos")
        .getPublicUrl(fileName);

      setCurrentPhotoUrl(publicUrl);
      setUploadingImage(false);

      // Get location and weather
      await getLocationAndWeather();

      // Identify garments
      toast.info("Identifying garments...");
      const garments = await identifyGarments(publicUrl);

      // Search product info for each garment
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
      
      if (products.length > 0) {
        toast.success(`Identified ${products.length} item${products.length > 1 ? 's' : ''}!`);
      }

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      return null;
    } finally {
      setProcessingOutfit(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

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

      const recordData = {
        user_id: user.id,
        photo_url: currentPhotoUrl,
        date: formData.get("date") as string,
        location: formData.get("location") as string || currentLocation,
        weather: formData.get("weather") as string || currentWeather,
        notes: formData.get("notes") as string,
        products: JSON.stringify(selectedProducts),
      };

      const { error } = await supabase.from("ootd_records").insert([recordData]);

      if (error) throw error;

      toast.success("OOTD saved successfully!");
      setIsAddDialogOpen(false);
      setCurrentPhotoUrl("");
      setCurrentLocation("");
      setCurrentWeather("");
      setIdentifiedProducts([]);
      setSelectedProductIndices(new Set());
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Log OOTD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Today's Outfit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddRecord} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage || processingOutfit}
                />
                {processingOutfit && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing outfit and identifying items...
                  </div>
                )}
              </div>

              {currentPhotoUrl && (
                <div className="space-y-2">
                  <img 
                    src={currentPhotoUrl} 
                    alt="Uploaded outfit" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              {identifiedProducts.length > 0 && (
                <div className="space-y-3">
                  <Label>Identified Items (Select to Save)</Label>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                    {identifiedProducts.map((product, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex gap-3 items-start">
                          <Checkbox 
                            checked={selectedProductIndices.has(index)}
                            onCheckedChange={() => toggleProductSelection(index)}
                            className="mt-1"
                          />
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.model}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{product.brand}</h4>
                            <p className="text-xs text-muted-foreground truncate">{product.model}</p>
                            <p className="text-xs text-muted-foreground">{product.type}</p>
                            {product.price && (
                              <p className="text-sm font-medium mt-1">{product.price}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    name="location" 
                    placeholder="Auto-detected" 
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weather">Weather</Label>
                  <Input 
                    id="weather" 
                    name="weather" 
                    placeholder="Auto-detected" 
                    value={currentWeather}
                    onChange={(e) => setCurrentWeather(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="How did you feel in this outfit?"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploadingImage || processingOutfit || !currentPhotoUrl}>
                {uploadingImage ? "Uploading..." : processingOutfit ? "Processing..." : "Save OOTD"}
              </Button>
            </form>
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
            <Card key={record.id} className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow">
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
                  onClick={() => setDeleteRecordId(record.id)}
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
        </>
      )}
    </div>
  );
}
