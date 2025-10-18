import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FilterOptions {
  types: string[];
  colors: string[];
  brands: string[];
  seasons: string[];
}

interface FilterState {
  types: string[];
  colors: string[];
  brands: string[];
  seasons: string[];
  liked: boolean;
}

interface GarmentFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterOptions: FilterOptions;
  onApplyFilters: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export default function GarmentFilterSheet({
  open,
  onOpenChange,
  filterOptions,
  onApplyFilters,
  currentFilters,
}: GarmentFilterSheetProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterState>(currentFilters);
  const [openSections, setOpenSections] = useState({
    type: true,
    color: false,
    brand: false,
    season: false,
    liked: false,
  });

  // Sync with parent filters
  useEffect(() => {
    setSelectedFilters(currentFilters);
  }, [currentFilters]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (category: 'types' | 'colors' | 'brands' | 'seasons', value: string) => {
    setSelectedFilters(prev => {
      const current = prev[category] as string[];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      const newFilters = { ...prev, [category]: updated };
      // Real-time filtering
      onApplyFilters(newFilters);
      return newFilters;
    });
  };

  const handleLikedChange = () => {
    const newFilters = { ...selectedFilters, liked: !selectedFilters.liked };
    setSelectedFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      types: [],
      colors: [],
      brands: [],
      seasons: [],
      liked: false,
    };
    setSelectedFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  };

  const getCount = (category: keyof FilterOptions, value: string) => {
    // This could be enhanced to show actual counts from the data
    return "";
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh]">
        <div className="mx-auto w-full max-w-4xl h-full flex flex-col">
          <DrawerHeader className="border-b">
            <DrawerTitle className="text-xl font-light tracking-wide">FILTER</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* FAVORITES FILTER */}
              <div className="py-3 px-2">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="favorites"
                    checked={selectedFilters.liked}
                    onCheckedChange={handleLikedChange}
                    className="border-muted-foreground/30"
                  />
                  <Label
                    htmlFor="favorites"
                    className="text-sm font-medium tracking-wider cursor-pointer flex-1"
                  >
                    FAVORITES ONLY
                  </Label>
                </div>
              </div>

              {/* TYPE FILTER */}
              <Collapsible open={openSections.type} onOpenChange={() => toggleSection('type')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 rounded-sm transition-colors">
                  <span className="text-sm font-medium tracking-wider">TYPE</span>
                  {openSections.type ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3 px-2">
                  {filterOptions.types.map((type) => (
                    <div key={type} className="flex items-center space-x-3">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedFilters.types.includes(type)}
                        onCheckedChange={() => handleCheckboxChange('types', type)}
                        className="border-muted-foreground/30"
                      />
                      <Label
                        htmlFor={`type-${type}`}
                        className="text-sm font-normal cursor-pointer flex-1 leading-tight"
                      >
                        {type} {getCount('types', type)}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* COLOR FILTER */}
              <Collapsible open={openSections.color} onOpenChange={() => toggleSection('color')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 rounded-sm transition-colors">
                  <span className="text-sm font-medium tracking-wider">COLOR</span>
                  {openSections.color ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3 px-2">
                  {filterOptions.colors.map((color) => (
                    <div key={color} className="flex items-center space-x-3">
                      <Checkbox
                        id={`color-${color}`}
                        checked={selectedFilters.colors.includes(color)}
                        onCheckedChange={() => handleCheckboxChange('colors', color)}
                        className="border-muted-foreground/30"
                      />
                      <Label
                        htmlFor={`color-${color}`}
                        className="text-sm font-normal cursor-pointer flex-1 leading-tight"
                      >
                        {color}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* BRAND FILTER */}
              <Collapsible open={openSections.brand} onOpenChange={() => toggleSection('brand')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 rounded-sm transition-colors">
                  <span className="text-sm font-medium tracking-wider">BRAND</span>
                  {openSections.brand ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3 px-2">
                  {filterOptions.brands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-3">
                      <Checkbox
                        id={`brand-${brand}`}
                        checked={selectedFilters.brands.includes(brand)}
                        onCheckedChange={() => handleCheckboxChange('brands', brand)}
                        className="border-muted-foreground/30"
                      />
                      <Label
                        htmlFor={`brand-${brand}`}
                        className="text-sm font-normal cursor-pointer flex-1 leading-tight"
                      >
                        {brand}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* SEASON FILTER */}
              <Collapsible open={openSections.season} onOpenChange={() => toggleSection('season')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 hover:bg-muted/50 px-2 rounded-sm transition-colors">
                  <span className="text-sm font-medium tracking-wider">SEASON</span>
                  {openSections.season ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3 px-2">
                  {filterOptions.seasons.map((season) => (
                    <div key={season} className="flex items-center space-x-3">
                      <Checkbox
                        id={`season-${season}`}
                        checked={selectedFilters.seasons.includes(season)}
                        onCheckedChange={() => handleCheckboxChange('seasons', season)}
                        className="border-muted-foreground/30"
                      />
                      <Label
                        htmlFor={`season-${season}`}
                        className="text-sm font-normal cursor-pointer flex-1 leading-tight"
                      >
                        {season}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Footer with Clear button */}
          <div className="border-t p-4 bg-background">
            <Button
              variant="outline"
              onClick={handleClear}
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
