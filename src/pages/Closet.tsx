import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Image as ImageIcon, Sparkles, Camera, Upload, Edit3, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import GarmentFilterSheet from "@/components/GarmentFilterSheet";

interface Garment {
  id: string;
  image_url: string;
  type: string;
  color: string;
  season: string;
  brand: string;
  material: string;
  last_worn_date: string | null;
  usage_count: number;
  washing_frequency: string | null;
}

interface ProductInfo {
  brand: string;
  model: string;
  price: string;
  style: string;
  features: string[];
  imageUrl?: string;
  material?: string;
  color?: string;
  availability?: string;
}

export default function Closet() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [identifyingProducts, setIdentifyingProducts] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState<ProductInfo[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [deleteGarmentId, setDeleteGarmentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    colors: [] as string[],
    brands: [] as string[],
    seasons: [] as string[],
  });

  // Extract unique filter options from garments
  const filterOptions = useMemo(() => {
    const types = [...new Set(garments.map(g => g.type).filter(Boolean))];
    const colors = [...new Set(garments.map(g => g.color).filter(Boolean))];
    const brands = [...new Set(garments.map(g => g.brand).filter(Boolean))];
    const seasons = [...new Set(garments.map(g => g.season).filter(Boolean))];
    
    return {
      types: types.sort(),
      colors: colors.sort(),
      brands: brands.sort(),
      seasons: seasons.sort(),
    };
  }, [garments]);

  // Apply filters to garments
  const filteredGarments = useMemo(() => {
    return garments.filter(garment => {
      if (filters.types.length > 0 && !filters.types.includes(garment.type)) return false;
      if (filters.colors.length > 0 && !filters.colors.includes(garment.color)) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(garment.brand)) return false;
      if (filters.seasons.length > 0 && !filters.seasons.includes(garment.season)) return false;
      return true;
    });
  }, [garments, filters]);

  // Get active filter tags
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ category: keyof typeof filters; value: string; label: string }> = [];
    
    filters.types.forEach(type => tags.push({ category: 'types', value: type, label: type }));
    filters.colors.forEach(color => tags.push({ category: 'colors', value: color, label: color }));
    filters.brands.forEach(brand => tags.push({ category: 'brands', value: brand, label: brand }));
    filters.seasons.forEach(season => tags.push({ category: 'seasons', value: season, label: season }));
    
    return tags;
  }, [filters]);

  const hasActiveFilters = activeFilterTags.length > 0;

  // Remove individual filter tag
  const removeFilterTag = (category: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].filter((item: string) => item !== value)
    }));
  };

  useEffect(() => {
    loadGarments();
  }, []);

  const loadGarments = async () => {
    try {
      const { data, error } = await supabase
        .from("garments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGarments(data || []);
    } catch (error: any) {
      toast.error("Failed to load garments");
    } finally {
      setLoading(false);
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
    setProductSuggestions([]);
    setSelectedProduct(null);
    setProcessingProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setProcessingProgress(20);
      const { error: uploadError } = await supabase.storage
        .from("garments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("garments")
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      setUploadingImage(false);
      setProcessingProgress(40);
      
      // Close dialog and start processing
      setIsAddDialogOpen(false);
      setIsProcessing(true);
      
      // Auto-identify products after upload
      await identifyProducts(publicUrl);
      
      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      setIsProcessing(false);
      setProcessingProgress(0);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const identifyProducts = async (imageUrl: string) => {
    setIdentifyingProducts(true);
    setProcessingProgress(50);
    try {
      const { data: identifyData, error: identifyError } = await supabase.functions.invoke(
        'identify-garment',
        { body: { imageUrl } }
      );

      if (identifyError) throw identifyError;

      const results = identifyData?.results || [];
      setProcessingProgress(70);
      
      // Fetch detailed product info for each result
      const productPromises = results.map(async (result: any) => {
        try {
          const { data: productData } = await supabase.functions.invoke(
            'search-product-info',
            { body: { brand: result.brand, model: result.model } }
          );
          
          return {
            brand: result.brand,
            model: result.model,
            price: result.price,
            style: result.style,
            features: result.features || [],
            imageUrl: productData?.imageUrl,
            material: productData?.material,
            color: productData?.color,
            availability: productData?.availability,
          };
        } catch (error) {
          console.error('Error fetching product info:', error);
          return {
            brand: result.brand,
            model: result.model,
            price: result.price,
            style: result.style,
            features: result.features || [],
          };
        }
      });

      const products = await Promise.all(productPromises);
      setProductSuggestions(products);
      setProcessingProgress(100);
      
      toast.success(`${products.length} product${products.length > 1 ? 's' : ''} identified!`);
      setIsAddDialogOpen(true);
      setIsProcessing(false);
      setProcessingProgress(0);
    } catch (error: any) {
      console.error('Error identifying products:', error);
      toast.error("Failed to identify products");
      setIsProcessing(false);
      setProcessingProgress(0);
    } finally {
      setIdentifyingProducts(false);
    }
  };

  const handleSaveSelectedProduct = async () => {
    if (selectedProduct === null || !productSuggestions[selectedProduct]) {
      toast.error("Please select a product");
      return;
    }

    const product = productSuggestions[selectedProduct];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get washing frequency recommendation
      let washingFrequency = null;
      if (product.material) {
        try {
          const { data: freqData } = await supabase.functions.invoke('recommend-washing-frequency', {
            body: { material: product.material, type: "Top" }
          });
          washingFrequency = freqData?.frequency || null;
        } catch (error) {
          console.error('Failed to get washing frequency recommendation:', error);
        }
      }

      const { error } = await supabase.from("garments").insert({
        user_id: user.id,
        image_url: uploadedImageUrl,
        type: "Top", // Default, can be enhanced later
        color: product.color || "",
        season: "All-Season",
        brand: product.brand,
        material: product.material || "",
        washing_frequency: washingFrequency,
        usage_count: 0,
      });

      if (error) throw error;

      toast.success("Garment saved to closet!");
      setIsAddDialogOpen(false);
      setProductSuggestions([]);
      setSelectedProduct(null);
      setUploadedImageUrl("");
      loadGarments();
    } catch (error: any) {
      toast.error("Failed to save garment");
    }
  };

  const handleAddGarment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const imageUrl = formData.get("imageUrl") as string;

    if (!imageUrl) {
      toast.error("Please upload an image");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const material = formData.get("material") as string;
      const type = formData.get("type") as string;

      // Get washing frequency recommendation
      let washingFrequency = null;
      if (material) {
        try {
          const { data: freqData } = await supabase.functions.invoke('recommend-washing-frequency', {
            body: { material, type }
          });
          washingFrequency = freqData?.frequency || null;
        } catch (error) {
          console.error('Failed to get washing frequency recommendation:', error);
        }
      }

      const { error } = await supabase.from("garments").insert({
        user_id: user.id,
        image_url: imageUrl,
        type,
        color: formData.get("color") as string,
        season: formData.get("season") as string,
        brand: formData.get("brand") as string,
        material,
        washing_frequency: washingFrequency,
        usage_count: 0,
      });

      if (error) throw error;

      toast.success("Garment added successfully!");
      setIsAddDialogOpen(false);
      setProductSuggestions([]);
      setSelectedProduct(null);
      setUploadedImageUrl("");
      loadGarments();
    } catch (error: any) {
      toast.error("Failed to add garment");
    }
  };

  const handleDeleteGarment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("garments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Garment deleted successfully!");
      loadGarments();
    } catch (error: any) {
      toast.error("Failed to delete garment");
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Closet</h1>
            <p className="text-muted-foreground">
              {filteredGarments.length} {filteredGarments.length === garments.length ? 'items' : `of ${garments.length} items`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={hasActiveFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setIsFilterOpen(true)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFilterTags.length}
                </span>
              )}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Garment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Add New Garment
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              {productSuggestions.length === 0 && !showManualForm ? (
                <div className="space-y-4 py-8">
                  {/* Upload Image Option */}
                  <div className="space-y-4">
                    <label htmlFor="upload-input" className="cursor-pointer">
                      <Card className="p-8 hover:shadow-large transition-all duration-300 hover:border-primary">
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg mb-1">Upload Image</h3>
                            <p className="text-sm text-muted-foreground">
                              {uploadingImage ? "Uploading image..." : identifyingProducts ? "AI is identifying..." : "Choose from your gallery"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </label>
                    <input
                      id="upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || identifyingProducts}
                    />

                    {/* Camera Option */}
                    <label htmlFor="camera-input" className="cursor-pointer">
                      <Card className="p-8 hover:shadow-large transition-all duration-300 hover:border-primary">
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg mb-1">Take Photo</h3>
                            <p className="text-sm text-muted-foreground">Use your camera</p>
                          </div>
                        </div>
                      </Card>
                    </label>
                    <input
                      id="camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || identifyingProducts}
                    />

                    {/* Manual Entry Option */}
                    <Card 
                      className="p-8 hover:shadow-large transition-all duration-300 hover:border-primary cursor-pointer"
                      onClick={() => setShowManualForm(true)}
                    >
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <Edit3 className="w-8 h-8 text-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Add Manually</h3>
                          <p className="text-sm text-muted-foreground">Enter details yourself</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {(uploadingImage || identifyingProducts) && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ) : showManualForm && productSuggestions.length === 0 ? (
                <form onSubmit={handleAddGarment} className="space-y-4">
                  <input type="hidden" name="imageUrl" id="imageUrl" />
                  <div className="space-y-2">
                    <Label htmlFor="manual-image">Upload Image</Label>
                    <Input
                      id="manual-image"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setUploadingImage(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");

                          const fileExt = file.name.split(".").pop();
                          const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                          const { error: uploadError } = await supabase.storage
                            .from("garments")
                            .upload(fileName, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from("garments")
                            .getPublicUrl(fileName);

                          (document.getElementById("imageUrl") as HTMLInputElement).value = publicUrl;
                        } catch (error: any) {
                          toast.error("Failed to upload image");
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      disabled={uploadingImage}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Top">Top</SelectItem>
                        <SelectItem value="Pants">Pants</SelectItem>
                        <SelectItem value="Outerwear">Outerwear</SelectItem>
                        <SelectItem value="Dress">Dress</SelectItem>
                        <SelectItem value="Shoes">Shoes</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input id="color" name="color" placeholder="e.g., Blue" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="season">Season</Label>
                      <Select name="season">
                        <SelectTrigger>
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spring">Spring</SelectItem>
                          <SelectItem value="Summer">Summer</SelectItem>
                          <SelectItem value="Fall">Fall</SelectItem>
                          <SelectItem value="Winter">Winter</SelectItem>
                          <SelectItem value="All-Season">All-Season</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input id="brand" name="brand" placeholder="e.g., Nike" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material">Material</Label>
                      <Input id="material" name="material" placeholder="e.g., Cotton" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowManualForm(false)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={uploadingImage}>
                      {uploadingImage ? "Uploading..." : "Save Garment"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">AI Identified Products</h3>
                    <p className="text-sm text-muted-foreground">
                      Select the product that best matches your garment
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {productSuggestions.map((product, index) => (
                      <ProductCard
                        key={index}
                        brand={product.brand}
                        model={product.model}
                        price={product.price}
                        style={product.style}
                        features={product.features}
                        imageUrl={product.imageUrl}
                        material={product.material}
                        color={product.color}
                        availability={product.availability}
                        selected={selectedProduct === index}
                        onSelect={() => setSelectedProduct(index)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setProductSuggestions([]);
                        setSelectedProduct(null);
                        setUploadedImageUrl("");
                        setShowManualForm(false);
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveSelectedProduct}
                      disabled={selectedProduct === null}
                      className="flex-1"
                    >
                      Save to Closet
                    </Button>
                  </div>
                </div>
              )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilterTags.map((tag, index) => (
              <Badge
                key={`${tag.category}-${tag.value}-${index}`}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {tag.label}
                <button
                  onClick={() => removeFilterTag(tag.category, tag.value)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {garments.length === 0 ? (
        <Card className="shadow-medium">
          <CardContent className="py-12 text-center space-y-4">
            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Your closet is empty</h3>
              <p className="text-muted-foreground mb-4">
                Start building your digital wardrobe by adding your first garment
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Garment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGarments.map((garment) => (
            <Card 
              key={garment.id} 
              className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => setSelectedGarment(garment)}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={garment.image_url}
                  alt={garment.type}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteGarmentId(garment.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="p-3 space-y-1">
                <h3 className="font-semibold text-sm">{garment.type}</h3>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {garment.color && <span>{garment.color}</span>}
                  {garment.season && <span>• {garment.season}</span>}
                </div>
                {garment.brand && (
                  <p className="text-xs text-muted-foreground">{garment.brand}</p>
                )}
                {garment.usage_count > 0 && (
                  <Badge variant="outline" className="text-xs mt-1">
                    Worn {garment.usage_count}x
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={!!deleteGarmentId} onOpenChange={(open) => !open && setDeleteGarmentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Garment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this garment from your closet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteGarmentId) {
                    handleDeleteGarment(deleteGarmentId);
                    setDeleteGarmentId(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!selectedGarment} onOpenChange={(open) => !open && setSelectedGarment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Garment Details</DialogTitle>
            </DialogHeader>
            {selectedGarment && (
              <div className="space-y-4">
                <img 
                  src={selectedGarment.image_url} 
                  alt={selectedGarment.type}
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                    <p className="text-lg font-semibold">{selectedGarment.type}</p>
                  </div>
                  {selectedGarment.brand && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Brand</h4>
                      <p className="text-lg font-semibold">{selectedGarment.brand}</p>
                    </div>
                  )}
                  {selectedGarment.color && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Color</h4>
                      <p className="text-lg font-semibold">{selectedGarment.color}</p>
                    </div>
                  )}
                  {selectedGarment.season && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Season</h4>
                      <p className="text-lg font-semibold">{selectedGarment.season}</p>
                    </div>
                  )}
                  {selectedGarment.material && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Material</h4>
                      <p className="text-lg font-semibold">{selectedGarment.material}</p>
                    </div>
                  )}
                  {selectedGarment.last_worn_date && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Last Worn</h4>
                      <p className="text-lg font-semibold">
                        {new Date(selectedGarment.last_worn_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Usage Count</h4>
                    <p className="text-lg font-semibold">{selectedGarment.usage_count} times</p>
                  </div>
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Washing Frequency</h4>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={selectedGarment.washing_frequency || ""}
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from("garments")
                              .update({ washing_frequency: value })
                              .eq("id", selectedGarment.id);
                            
                            if (error) throw error;
                            
                            setSelectedGarment({ ...selectedGarment, washing_frequency: value });
                            toast.success("Washing frequency updated");
                            loadGarments();
                          } catch (error) {
                            toast.error("Failed to update washing frequency");
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Set washing frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="After each wear">After each wear</SelectItem>
                          <SelectItem value="After 2-3 wears">After 2-3 wears</SelectItem>
                          <SelectItem value="After 3-5 wears">After 3-5 wears</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
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
              <span className="text-sm font-medium">Processing garment...</span>
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

      <GarmentFilterSheet
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filterOptions={filterOptions}
        currentFilters={filters}
        onApplyFilters={setFilters}
      />
    </div>
  );
}
