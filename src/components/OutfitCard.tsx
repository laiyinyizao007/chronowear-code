import { Card } from "@/components/ui/card";

interface OutfitCardProps {
  imageUrl: string;
  title: string;
  description: string;
  isMoreCard?: boolean;
  onClick?: () => void;
}

export default function OutfitCard({
  imageUrl,
  title,
  description,
  isMoreCard,
  onClick,
}: OutfitCardProps) {
  if (isMoreCard) {
    return (
      <Card 
        className="flex-shrink-0 w-[280px] h-[400px] cursor-pointer overflow-hidden shadow-card hover:shadow-large transition-all duration-300 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10"
        onClick={onClick}
      >
        <div className="text-center space-y-3">
          <div className="text-6xl font-bold text-primary">+</div>
          <div className="text-xl font-semibold">More Outfits</div>
          <p className="text-sm text-muted-foreground px-6">Discover more styles</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="flex-shrink-0 w-[280px] h-[400px] cursor-pointer overflow-hidden shadow-card hover:shadow-large transition-all duration-300 group"
      onClick={onClick}
    >
      <div className="relative h-full">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}
