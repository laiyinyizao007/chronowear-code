import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Filter, Image as ImageIcon, Sparkles, Camera, Upload, Edit3, X, Scan, ChevronsUpDown, Check, Shirt, Heart, Trash2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getWashingRecommendation, identifyGarmentsFromImage } from "@/services/garmentService";
import { searchProductInfo } from "@/services/outfitService";
import { useProgress } from "@/contexts/ProgressContext";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
  care_instructions: string | null;
  official_price: number | null;
  acquired_date: string | null;
  liked?: boolean;
  notes?: string | null;
  currency?: string;
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
  official_price?: number;
  washing_frequency?: string;
  care_instructions?: string;
  type?: string;
}

export default function Closet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setProgress, startProcessing, stopProcessing, startFakeProgress, doneProgress } = useProgress();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const [sortBy, setSortBy] = useState<"newest" | "frequency">("newest");
  const [filters, setFilters] = useState({
    types: [] as string[],
    colors: [] as string[],
    brands: [] as string[],
    seasons: [] as string[],
    liked: false,
  });
  const [newGarment, setNewGarment] = useState({
    image_url: "",
    type: "",
    color: "",
    season: "",
    brand: "",
    material: "",
    washing_frequency: "",
    care_instructions: "",
    official_price: null as number | null,
    acquired_date: new Date().toISOString().split('T')[0],
  });
  const [currency, setCurrency] = useState("USD");
  const [brandSearch, setBrandSearch] = useState("");
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [isScanningLabel, setIsScanningLabel] = useState(false);

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

  // Apply filters and sorting to garments
  const filteredGarments = useMemo(() => {
    let filtered = garments.filter(garment => {
      if (filters.types.length > 0 && !filters.types.includes(garment.type)) return false;
      if (filters.colors.length > 0 && !filters.colors.includes(garment.color)) return false;
      if (filters.brands.length > 0 && !filters.brands.includes(garment.brand)) return false;
      if (filters.seasons.length > 0 && !filters.seasons.includes(garment.season)) return false;
      if (filters.liked && !garment.liked) return false;
      return true;
    });

    // Apply sorting
    if (sortBy === "frequency") {
      filtered = [...filtered].sort((a, b) => b.usage_count - a.usage_count);
    }

    return filtered;
  }, [garments, filters, sortBy]);

  // Get active filter tags
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ category: keyof typeof filters; value: string | boolean; label: string }> = [];
    
    filters.types.forEach(type => tags.push({ category: 'types', value: type, label: type }));
    filters.colors.forEach(color => tags.push({ category: 'colors', value: color, label: color }));
    filters.brands.forEach(brand => tags.push({ category: 'brands', value: brand, label: brand }));
    filters.seasons.forEach(season => tags.push({ category: 'seasons', value: season, label: season }));
    if (filters.liked) tags.push({ category: 'liked', value: true, label: 'Favorites' });
    
    return tags;
  }, [filters]);

  const hasActiveFilters = activeFilterTags.length > 0;

  // Remove individual filter tag
  const removeFilterTag = (category: keyof typeof filters, value: string | boolean) => {
    if (category === 'liked') {
      setFilters(prev => ({ ...prev, liked: false }));
    } else {
      setFilters(prev => ({
        ...prev,
        [category]: prev[category].filter((item: string) => item !== value)
      }));
    }
  };

  useEffect(() => {
    loadGarments();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("geo_location")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // Set default currency based on geo_location
      if (profile?.geo_location) {
        const location = profile.geo_location.toLowerCase();
        if (location.includes('china') || location.includes('中国')) {
          setCurrency('CNY');
        } else if (location.includes('europe') || location.includes('eu') || location.includes('欧洲')) {
          setCurrency('EUR');
        } else if (location.includes('uk') || location.includes('britain') || location.includes('英国')) {
          setCurrency('GBP');
        } else if (location.includes('japan') || location.includes('日本')) {
          setCurrency('JPY');
        } else {
          setCurrency('USD');
        }
      }
    } catch (error: any) {
      console.error("Failed to load user profile:", error);
    }
  };

  // Auto-trigger garment identification when imageUrl is in URL
  useEffect(() => {
    const imageUrl = searchParams.get('imageUrl');
    if (imageUrl && !isProcessing && !identifyingProducts) {
      setUploadedImageUrl(imageUrl);
      setIsProcessing(true);
      identifyProducts(imageUrl).finally(() => {
        // Clean up URL params after processing
        setSearchParams({});
      });
    }
  }, [searchParams]);

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

  const toggleLikeGarment = async (garmentId: string, currentLiked: boolean) => {
    try {
      const { error } = await supabase
        .from("garments")
        .update({ liked: !currentLiked })
        .eq("id", garmentId);

      if (error) throw error;
      
      toast.success(currentLiked ? "Removed from favorites" : "Added to favorites");
      loadGarments();
    } catch (error: any) {
      toast.error("Failed to update favorite");
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
    
    // 启动假进度条动画（5秒内到99.5%）
    startFakeProgress(5000);
    
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

      setUploadedImageUrl(publicUrl);
      setUploadingImage(false);
      
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
      doneProgress();
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const identifyProducts = async (imageUrl: string, getMoreResults: boolean = false) => {
    setIdentifyingProducts(true);
    if (!getMoreResults) {
      setProcessingProgress(50);
    }
    
    try {
      // Use unified garment service with getMoreResults flag
      const garments = await identifyGarmentsFromImage(imageUrl, getMoreResults);
      
      if (!garments || garments.length === 0) {
        toast.info("No garments identified in the image");
        if (!getMoreResults) {
          setProcessingProgress(100);
          setIsProcessing(false);
          doneProgress();
        }
        setIdentifyingProducts(false);
        return;
      }

      if (!getMoreResults) {
        setProcessingProgress(70);
      }
      
      // Fetch detailed product info for each identified garment
      const productPromises = garments.map(async (garment: any) => {
        const productData = await searchProductInfo(
          garment.brand, 
          garment.model,
          garment.type,
          garment.material,
          garment.color
        );
        
        return {
          brand: garment.brand,
          model: garment.model,
          type: garment.type || productData?.type,
          color: garment.color || productData?.color,
          material: garment.material || productData?.material,
          imageUrl: productData?.imageUrl,
          price: productData?.price,
          style: productData?.style,
          features: productData?.features || [],
          availability: productData?.availability,
          official_price: productData?.official_price,
          washing_frequency: productData?.washing_frequency,
          care_instructions: productData?.care_instructions,
        };
      });

      const products = await Promise.all(productPromises);
      
      if (getMoreResults) {
        // Append new results to existing ones
        setProductSuggestions(prev => [...prev, ...products]);
        toast.success(`${products.length} more product${products.length > 1 ? 's' : ''} loaded!`);
      } else {
        setProductSuggestions(products);
        
        // Pre-fill newGarment with first product data
        if (products.length > 0) {
          const firstProduct = products[0];
          setNewGarment({
            image_url: imageUrl,
            type: firstProduct.type || "",
            color: firstProduct.color || "",
            season: "All-Season",
            brand: firstProduct.brand || "",
            material: firstProduct.material || "",
            washing_frequency: firstProduct.washing_frequency || "",
            care_instructions: firstProduct.care_instructions || "",
            official_price: firstProduct.official_price || null,
            acquired_date: new Date().toISOString().split('T')[0],
          });
        }
        
        setProcessingProgress(100);
        toast.success(`${products.length} product${products.length > 1 ? 's' : ''} identified!`);
        setIsAddDialogOpen(true);
        setIsProcessing(false);
        setProcessingProgress(0);
        doneProgress();
      }
    } catch (error: any) {
      console.error('Error identifying products:', error);
      toast.error("Failed to identify products");
      if (!getMoreResults) {
        setIsProcessing(false);
        setProcessingProgress(0);
        doneProgress();
      }
    } finally {
      setIdentifyingProducts(false);
      if (getMoreResults) {
        setIsLoadingMore(false);
      }
    }
  };

  const loadMoreProducts = async () => {
    if (!uploadedImageUrl || isLoadingMore) return;
    startFakeProgress(3000);
    setIsLoadingMore(true);
    await identifyProducts(uploadedImageUrl, true);
    doneProgress();
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

      // Get washing frequency and care instructions recommendation
      let washingFrequency = null;
      let careInstructions = null;
      if (product.material) {
        const recommendation = await getWashingRecommendation(product.material, "Top");
        washingFrequency = recommendation.frequency;
        careInstructions = recommendation.care_instructions;
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
        care_instructions: careInstructions,
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

      // Get washing frequency and care instructions recommendation
      let washingFrequency = null;
      let careInstructions = null;
      if (material) {
        const recommendation = await getWashingRecommendation(material, type);
        washingFrequency = recommendation.frequency;
        careInstructions = recommendation.care_instructions;
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
        care_instructions: careInstructions,
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
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Closet</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {filteredGarments.length} {filteredGarments.length === garments.length ? 'items' : `of ${garments.length} items`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filters.liked ? "default" : "outline"}
              size="icon"
              onClick={() => setFilters(prev => ({ ...prev, liked: !prev.liked }))}
              className="relative"
            >
              <Heart className={`w-4 h-4 ${filters.liked ? 'fill-current' : ''}`} />
            </Button>
            <Select value={sortBy} onValueChange={(value: "newest" | "frequency") => setSortBy(value)}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="frequency">Most Worn</SelectItem>
              </SelectContent>
            </Select>
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
            <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <SheetTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Garment
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-4 sm:p-6">
              <SheetHeader className="mb-4">
                <SheetTitle>Add New Garment</SheetTitle>
                <SheetClose className="absolute right-4 top-4" />
              </SheetHeader>
              
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
                    <Select value={newGarment.type} onValueChange={(value) => setNewGarment({ ...newGarment, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="dress">Dress</SelectItem>
                        <SelectItem value="outerwear">Outerwear</SelectItem>
                        <SelectItem value="shoes">Shoes</SelectItem>
                        <SelectItem value="accessory">Accessory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select value={newGarment.color} onValueChange={(value) => setNewGarment({ ...newGarment, color: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="pink">Pink</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="beige">Beige</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {newGarment.brand || "Select or enter brand"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search brand..." 
                            value={brandSearch}
                            onValueChange={setBrandSearch}
                          />
                          <CommandEmpty>
                            <Button 
                              variant="ghost" 
                              className="w-full"
                              onClick={() => {
                                setNewGarment({ ...newGarment, brand: brandSearch });
                                setBrandSearch("");
                              }}
                            >
                              Use "{brandSearch}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Gucci", "Prada", "Louis Vuitton"].map((brand) => (
                              <CommandItem
                                key={brand}
                                value={brand}
                                onSelect={() => {
                                  setNewGarment({ ...newGarment, brand });
                                  setBrandSearch("");
                                }}
                              >
                                <Check className={newGarment.brand === brand ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 opacity-0"} />
                                {brand}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={newGarment.material}
                      onChange={(e) => setNewGarment({ ...newGarment, material: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="official_price">Official Price</Label>
                    <div className="flex gap-2">
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="official_price"
                        type="number"
                        step="0.01"
                        className="flex-1"
                        value={newGarment.official_price || ""}
                        onChange={(e) => setNewGarment({ ...newGarment, official_price: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="washing_frequency">Washing Frequency</Label>
                    <Input
                      id="washing_frequency"
                      value={newGarment.washing_frequency}
                      onChange={(e) => setNewGarment({ ...newGarment, washing_frequency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="care_instructions">Care Instructions</Label>
                    <Textarea
                      id="care_instructions"
                      value={newGarment.care_instructions}
                      onChange={(e) => setNewGarment({ ...newGarment, care_instructions: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsScanningBarcode(true)}
                    >
                      <Scan className="mr-2 h-4 w-4" />
                      Scan Barcode
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsScanningLabel(true)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Photo Label
                    </Button>
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
                <div className="space-y-6 pb-24">
                  <Carousel className="w-full max-w-full">
                    <CarouselContent className="-ml-4">
                      {productSuggestions.map((product, index) => (
                        <CarouselItem key={index} className="pl-4 basis-[min(350px,80vw)] h-[550px]">
                          <ProductCard
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
                        </CarouselItem>
                      ))}
                      
                      {/* More Card */}
                      <CarouselItem className="pl-4 basis-[min(350px,80vw)] h-[550px]">
                        <Card 
                          className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary flex"
                          onClick={loadMoreProducts}
                        >
                          <CardContent className="flex flex-col items-center justify-center h-full w-full p-6">
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                              <Plus className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Load More</h3>
                            <p className="text-sm text-muted-foreground text-center">
                              {isLoadingMore ? "Loading..." : "Get more product suggestions"}
                            </p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                  </Carousel>
                </div>
              )}
              
              {/* Fixed Add to Closet Button */}
              {productSuggestions.length > 0 && !showManualForm && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
                  <Button
                    className="w-full h-14 text-lg font-semibold"
                    disabled={selectedProduct === null || isSaving}
                    onClick={async () => {
                      if (selectedProduct === null) return;
                      
                      setIsSaving(true);
                      startProcessing();
                      setProgress(20);
                      
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error("Not authenticated");

                        const selectedProductData = productSuggestions[selectedProduct];
                        
                        setProgress(40);
                        
                        // Get washing frequency and care instructions recommendation
                        let washingFrequency = null;
                        let careInstructions = null;
                        if (selectedProductData.material) {
                          const recommendation = await getWashingRecommendation(selectedProductData.material, selectedProductData.type || "Top");
                          washingFrequency = recommendation.frequency;
                          careInstructions = recommendation.care_instructions;
                        }

                        setProgress(70);

                        const { error } = await supabase.from("garments").insert({
                          user_id: user.id,
                          image_url: uploadedImageUrl,
                          type: selectedProductData.type || "Top",
                          color: selectedProductData.color || "",
                          season: "All-Season",
                          brand: selectedProductData.brand,
                          material: selectedProductData.material || "",
                          washing_frequency: washingFrequency,
                          care_instructions: careInstructions,
                          official_price: selectedProductData.official_price || null,
                          currency: currency,
                          usage_count: 0,
                        });

                        if (error) throw error;

                        setProgress(90);
                        
                        // Close dialog and reset states
                        setIsAddDialogOpen(false);
                        setProductSuggestions([]);
                        setSelectedProduct(null);
                        setUploadedImageUrl("");
                        setShowManualForm(false);
                        setIsProcessing(false);
                        
                        // Reload garments to show the new one
                        await loadGarments();
                        
                        setProgress(100);
                        
                        setTimeout(() => {
                          stopProcessing();
                        }, 300);
                        
                        // Scroll to top to show the closet view
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch (error: any) {
                        toast.error("Failed to save garment");
                        stopProcessing();
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? "Adding..." : selectedProduct !== null ? "Add to Closet" : "Select a Product"}
                  </Button>
                </div>
              )}
              </SheetContent>
            </Sheet>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGarments.map((garment) => (
            <Card 
              key={garment.id} 
              className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow cursor-pointer group"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeGarment(garment.id, garment.liked || false);
                  }}
                >
                  <Heart 
                    className={`w-4 h-4 ${garment.liked ? 'fill-red-500 text-red-500' : ''}`}
                  />
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
      )}

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

        <Sheet open={!!selectedGarment} onOpenChange={(open) => !open && setSelectedGarment(null)}>
          <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col overflow-hidden">
            <SheetHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <SheetTitle>Garment Details</SheetTitle>
              <SheetClose className="absolute right-4 top-4" />
            </SheetHeader>
            <div className="overflow-y-auto flex-1 px-6 py-4">
            {selectedGarment && (
              <div className="space-y-4">
                <img 
                  src={selectedGarment.image_url} 
                  alt={selectedGarment.type}
                  className="w-full max-h-[40vh] sm:max-h-[50vh] object-contain rounded-lg"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Type - Read Only */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                      <p className="text-sm font-semibold capitalize">{selectedGarment.type}</p>
                    </div>
                  </div>

                  {/* Color - Read Only */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Color</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                      <p className="text-sm font-semibold capitalize">{selectedGarment.color || "Not specified"}</p>
                    </div>
                  </div>

                  {/* Brand - Editable */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground">Brand</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1 h-9">
                          <span className="text-sm">{selectedGarment.brand || "Select or enter brand"}</span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search brand..." 
                            value={brandSearch}
                            onValueChange={setBrandSearch}
                          />
                          <CommandEmpty>
                            <Button 
                              variant="ghost" 
                              className="w-full"
                              onClick={async () => {
                                setSelectedGarment({ ...selectedGarment, brand: brandSearch });
                                const { error } = await supabase
                                  .from("garments")
                                  .update({ brand: brandSearch })
                                  .eq("id", selectedGarment.id);
                                if (error) toast.error("Failed to update brand");
                                else {
                                  toast.success("Brand updated");
                                  loadGarments();
                                }
                                setBrandSearch("");
                              }}
                            >
                              Use "{brandSearch}"
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Gucci", "Prada", "Louis Vuitton"].map((brand) => (
                              <CommandItem
                                key={brand}
                                value={brand}
                                onSelect={async () => {
                                  setSelectedGarment({ ...selectedGarment, brand });
                                  const { error } = await supabase
                                    .from("garments")
                                    .update({ brand })
                                    .eq("id", selectedGarment.id);
                                  if (error) toast.error("Failed to update brand");
                                  else {
                                    toast.success("Brand updated");
                                    loadGarments();
                                  }
                                  setBrandSearch("");
                                }}
                              >
                                <Check className={selectedGarment.brand === brand ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 opacity-0"} />
                                {brand}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Official Price - Editable */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground">Official Price</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        value={selectedGarment.currency || currency} 
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from("garments")
                              .update({ currency: value })
                              .eq("id", selectedGarment.id);
                            if (error) throw error;
                            setSelectedGarment({ ...selectedGarment, currency: value });
                            toast.success("Currency updated");
                            loadGarments();
                          } catch (error) {
                            toast.error("Failed to update currency");
                          }
                        }}
                      >
                        <SelectTrigger className="w-20 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        className="flex-1 h-9 text-sm"
                        value={selectedGarment.official_price || ""}
                        onChange={(e) => setSelectedGarment({ ...selectedGarment, official_price: e.target.value ? parseFloat(e.target.value) : null })}
                        onBlur={async () => {
                          try {
                            const { error } = await supabase
                              .from("garments")
                              .update({ official_price: selectedGarment.official_price })
                              .eq("id", selectedGarment.id);
                            if (error) throw error;
                            toast.success("Price updated");
                            loadGarments();
                          } catch (error) {
                            toast.error("Failed to update price");
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Usage Count - Read Only */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Usage Count</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md">
                      <p className="text-sm font-semibold">{selectedGarment.usage_count} times</p>
                    </div>
                  </div>

                  {/* Acquired Date - Editable */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Acquired Date</Label>
                    <Input
                      type="date"
                      className="mt-1 h-9 text-sm"
                      value={selectedGarment.acquired_date || ""}
                      onChange={(e) => setSelectedGarment({ ...selectedGarment, acquired_date: e.target.value })}
                      onBlur={async () => {
                        try {
                          const { error } = await supabase
                            .from("garments")
                            .update({ acquired_date: selectedGarment.acquired_date })
                            .eq("id", selectedGarment.id);
                          if (error) throw error;
                          toast.success("Acquired date updated");
                          loadGarments();
                        } catch (error) {
                          toast.error("Failed to update acquired date");
                        }
                      }}
                    />
                  </div>

                  {/* Washing Frequency - Editable */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5">Washing Frequency</Label>
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
                      <SelectTrigger className="mt-1 h-9">
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

                  {/* Care Instructions - Read Only */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5">Care Instructions</Label>
                    <Textarea
                      value={selectedGarment.care_instructions || ""}
                      disabled
                      className="mt-1 min-h-[80px] text-sm bg-muted cursor-not-allowed"
                      placeholder="AI-generated care instructions..."
                    />
                  </div>

                  {/* Notes - Editable */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5">Notes</Label>
                    <Textarea
                      value={selectedGarment.notes || ""}
                      onChange={(e) => setSelectedGarment({ ...selectedGarment, notes: e.target.value })}
                      onBlur={async () => {
                        try {
                          const { error } = await supabase
                            .from("garments")
                            .update({ notes: selectedGarment.notes })
                            .eq("id", selectedGarment.id);
                          if (error) throw error;
                          toast.success("Notes updated");
                          loadGarments();
                        } catch (error) {
                          toast.error("Failed to update notes");
                        }
                      }}
                      className="mt-1 min-h-[80px] text-sm"
                      placeholder="Add your personal notes about this garment..."
                    />
                  </div>
                  
                  {/* Barcode and Photo Scanning */}
                  <div className="sm:col-span-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => setIsScanningBarcode(true)}
                      >
                        <Scan className="mr-1.5 h-3.5 w-3.5" />
                        <span className="text-xs">Scan Barcode</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => setIsScanningLabel(true)}
                      >
                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                        <span className="text-xs">Photo Label</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </SheetContent>
        </Sheet>
      
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
