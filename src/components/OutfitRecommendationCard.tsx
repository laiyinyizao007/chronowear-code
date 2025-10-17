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
          {items.map((item, index) => (
            <div 
              key={index}
              className="relative bg-secondary/30 rounded-sm p-3 hover:bg-secondary/50 transition-colors duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-background rounded-sm flex items-center justify-center flex-shrink-0 border border-border/30">
                  <Shirt className="w-5 h-5 text-primary" strokeWidth={1.5} />
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
