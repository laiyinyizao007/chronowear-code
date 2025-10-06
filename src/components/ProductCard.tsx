import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className={`group overflow-hidden shadow-card hover:shadow-large transition-all duration-300 cursor-pointer border-0 ${
      selected ? 'ring-2 ring-primary shadow-large' : ''
    }`}>
      <div className="aspect-[3/4] relative bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
        {selected && (
          <div className="absolute top-3 right-3 bg-accent text-accent-foreground rounded-full p-1.5 shadow-medium">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-xl tracking-tight">{brand}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{model}</p>
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

        <div className="space-y-2 pt-1">
          <p className="text-sm leading-relaxed">{style}</p>
          {material && (
            <p className="text-xs text-muted-foreground">Material: {material}</p>
          )}
          {color && (
            <p className="text-xs text-muted-foreground">Color: {color}</p>
          )}
        </div>

        {features && features.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide">Features</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {features.slice(0, 3).map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-1.5">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button 
          onClick={onSelect}
          variant={selected ? "default" : "outline"}
          className="w-full mt-4 font-semibold"
          size="lg"
        >
          {selected ? "Selected ✓" : "Add to Bag"}
        </Button>
      </CardContent>
    </Card>
  );
}
