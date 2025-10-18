import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface ProductCardProps {
  brand: string;
  model: string;
  price: string;
  style: string;
  features: string[];
  imageUrl?: string;
  material?: string;
  color?: string;
  availability?: string;
  selected?: boolean;
  onSelect: () => void;
}

export default function ProductCard({
  brand,
  model,
  price,
  style,
  features,
  imageUrl,
  material,
  color,
  availability,
  selected,
  onSelect,
}: ProductCardProps) {
  return (
    <Card 
      onClick={onSelect}
      className={`group overflow-hidden transition-all duration-300 cursor-pointer h-full flex flex-col ${
        selected 
          ? 'ring-2 ring-primary shadow-large bg-primary/5' 
          : 'shadow-card hover:shadow-large border'
      }`}
    >
      <div className="aspect-[3/4] relative bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
              (e.currentTarget as HTMLImageElement).onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
        {selected && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-large">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
        <div>
          <h3 className="font-bold text-xl tracking-tight">{brand}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{model}</p>
        </div>
        
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{price}</span>
          {availability && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              availability === "In Stock" 
                ? "bg-primary/20 text-primary" 
                : "bg-destructive/20 text-destructive"
            }`}>
              {availability}
            </span>
          )}
        </div>

        <div className="space-y-2 pt-1 flex-1">
          <p className="text-sm leading-relaxed line-clamp-2">{style}</p>
          {material && (
            <p className="text-xs text-muted-foreground line-clamp-1">Material: {material}</p>
          )}
          {color && (
            <p className="text-xs text-muted-foreground line-clamp-1">Color: {color}</p>
          )}
        </div>

        {features && features.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide">Features</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {features.slice(0, 2).map((feature, idx) => (
                <li key={idx} className="flex items-start line-clamp-1">
                  <span className="mr-1.5">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
