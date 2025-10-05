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
    <Card className={`overflow-hidden shadow-soft hover:shadow-medium transition-all cursor-pointer ${
      selected ? 'ring-2 ring-primary' : ''
    }`}>
      <div className="aspect-square relative bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{brand}</h3>
          <p className="text-sm text-muted-foreground">{model}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary">{price}</span>
          {availability && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              availability === "In Stock" 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            }`}>
              {availability}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm">{style}</p>
          {material && (
            <p className="text-xs text-muted-foreground">Material: {material}</p>
          )}
          {color && (
            <p className="text-xs text-muted-foreground">Color: {color}</p>
          )}
        </div>

        {features && features.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Features:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {features.slice(0, 3).map((feature, idx) => (
                <li key={idx}>• {feature}</li>
              ))}
            </ul>
          </div>
        )}

        <Button 
          onClick={onSelect}
          variant={selected ? "default" : "outline"}
          className="w-full"
        >
          {selected ? "Selected" : "Select This"}
        </Button>
      </CardContent>
    </Card>
  );
}
