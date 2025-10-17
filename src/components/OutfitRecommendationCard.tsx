import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OutfitItem {
  type: string;
  name: string;
  brand?: string;
  model?: string;
  description: string;
  fromCloset: boolean;
  imageUrl?: string;
}

interface OutfitRecommendationCardProps {
  title: string;
  items: OutfitItem[];
  summary: string;
  onClick: () => void;
}

export default function OutfitRecommendationCard({
  title,
  items,
  summary,
  onClick,
}: OutfitRecommendationCardProps) {
  const [itemsWithImages, setItemsWithImages] = useState<OutfitItem[]>(items);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    const fetchProductImages = async () => {
      setLoadingImages(true);
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          if (item.brand && item.model) {
            try {
              const { data, error } = await supabase.functions.invoke('search-product-info', {
                body: { brand: item.brand, model: item.model }
              });
              
              if (!error && data?.imageUrl) {
                return { ...item, imageUrl: data.imageUrl };
              }
            } catch (error) {
              console.error(`Failed to fetch image for ${item.brand} ${item.model}:`, error);
            }
          }
          return item;
        })
      );
      setItemsWithImages(updatedItems);
      setLoadingImages(false);
    };

    fetchProductImages();
  }, [items]);

  return (
    <Card 
      className="flex-shrink-0 w-[300px] cursor-pointer overflow-hidden shadow-card hover:shadow-large transition-all duration-500 group bg-card border-border/50"
      onClick={onClick}
    >
      <div className="p-6 space-y-5">
        {/* Outfit Title */}
        <div className="pb-3 border-b border-border/50">
          <h3 className="font-serif font-light text-xl tracking-wide text-foreground">{title}</h3>
        </div>

        {/* Outfit Items - Vertical Layout */}
        <div className="space-y-3">
          {itemsWithImages.map((item, index) => (
            <div 
              key={index}
              className="relative bg-secondary/30 rounded-sm overflow-hidden hover:bg-secondary/50 transition-colors duration-300"
            >
              <div className="flex items-start gap-3 p-3">
                {/* Product Image */}
                <div className="w-16 h-16 bg-background rounded-sm flex items-center justify-center flex-shrink-0 border border-border/30 overflow-hidden">
                  {loadingImages ? (
                    <div className="w-full h-full bg-muted/50 animate-pulse" />
                  ) : item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `
                          <svg class="w-5 h-5 text-primary" stroke-width="1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        `;
                      }}
                    />
                  ) : (
                    <Shirt className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-sans font-normal px-2 py-0.5 bg-muted">
                      {item.type}
                    </Badge>
                    {item.fromCloset && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-sans font-normal px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                        Closet
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-sans font-medium text-sm text-foreground/90 truncate">{item.name}</h4>
                  {item.brand && (
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans mt-0.5">
                      {item.brand}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
            {summary}
          </p>
          <div className="flex items-center justify-end mt-3 text-xs text-primary font-medium uppercase tracking-wider">
            <span className="font-sans">View Details</span>
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </Card>
  );
}
