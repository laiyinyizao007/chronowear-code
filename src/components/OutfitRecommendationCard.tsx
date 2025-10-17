import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, ChevronRight, Sparkles } from "lucide-react";

interface OutfitItem {
  type: string;
  name: string;
  description: string;
  fromCloset: boolean;
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
  return (
    <Card 
      className="flex-shrink-0 w-[280px] cursor-pointer overflow-hidden shadow-card hover:shadow-large transition-all duration-300 group"
      onClick={onClick}
    >
      <div className="p-4 space-y-4">
        {/* Outfit Title */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>

        {/* Outfit Items - Vertical Layout */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <div 
              key={index}
              className="relative bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-background rounded flex items-center justify-center flex-shrink-0">
                  <Shirt className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {item.type}
                    </Badge>
                    {item.fromCloset && (
                      <Badge variant="outline" className="text-xs bg-primary/10">
                        Closet
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {summary}
          </p>
          <div className="flex items-center justify-end mt-2 text-xs text-primary font-medium">
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Card>
  );
}
