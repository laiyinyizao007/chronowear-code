import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Filter, Image as ImageIcon, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";

interface Garment {
  id: string;
  image_url: string;
  type: string;
  color: string;
  season: string;
  brand: string;
  material: string;
  last_worn_date: string | null;
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

    setUploadingImage(true);
    setProductSuggestions([]);
    setSelectedProduct(null);
    
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
      
      // Auto-identify products after upload
      await identifyProducts(publicUrl);
      
      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const identifyProducts = async (imageUrl: string) => {
    setIdentifyingProducts(true);
    try {
      toast.info("AI is identifying products...");
      
      const { data: identifyData, error: identifyError } = await supabase.functions.invoke(
        'identify-garment',
        { body: { imageUrl } }
      );

      if (identifyError) throw identifyError;

      const results = identifyData?.results || [];
      
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
      toast.success("Products identified! Select one to save.");
    } catch (error: any) {
      console.error('Error identifying products:', error);
      toast.error("Failed to identify products");
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

      const { error } = await supabase.from("garments").insert({
        user_id: user.id,
        image_url: uploadedImageUrl,
        type: "Top", // Default, can be enhanced later
        color: product.color || "",
        season: "All-Season",
        brand: product.brand,
        material: product.material || "",
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

      const { error } = await supabase.from("garments").insert({
        user_id: user.id,
        image_url: imageUrl,
        type: formData.get("type") as string,
        color: formData.get("color") as string,
        season: formData.get("season") as string,
        brand: formData.get("brand") as string,
        material: formData.get("material") as string,
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
          <h1 className="text-3xl font-bold">My Closet</h1>
          <p className="text-muted-foreground">{garments.length} items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Garment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Add New Garment with AI
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              {productSuggestions.length === 0 ? (
                <form onSubmit={handleAddGarment} className="space-y-4">
                  <input type="hidden" name="imageUrl" id="imageUrl" />
                  <div className="space-y-2">
                    <Label htmlFor="image">Upload Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const url = await handleImageUpload(e);
                        if (url) {
                          (document.getElementById("imageUrl") as HTMLInputElement).value = url;
                        }
                      }}
                      disabled={uploadingImage || identifyingProducts}
                    />
                    {(uploadingImage || identifyingProducts) && (
                      <p className="text-sm text-muted-foreground">
                        {uploadingImage ? "Uploading image..." : "AI is identifying products..."}
                      </p>
                    )}
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
                  <Button type="submit" className="w-full" disabled={uploadingImage || identifyingProducts}>
                    {uploadingImage ? "Uploading..." : identifyingProducts ? "Identifying..." : "Add Manually"}
                  </Button>
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
                      }}
                      className="flex-1"
                    >
                      Cancel
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
          {garments.map((garment) => (
            <Card key={garment.id} className="overflow-hidden shadow-soft hover:shadow-medium transition-shadow cursor-pointer">
              <div className="aspect-square relative bg-muted">
                <img
                  src={garment.image_url}
                  alt={garment.type}
                  className="w-full h-full object-cover"
                />
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
