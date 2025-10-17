import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (category: keyof FilterState, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleApply = () => {
    onApplyFilters(selectedFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedFilters({
      types: [],
      colors: [],
      brands: [],
      seasons: [],
    });
  };

  const getCount = (category: keyof FilterOptions, value: string) => {
    // This could be enhanced to show actual counts from the data
    return "";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[400px] overflow-y-auto">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-light tracking-wide">FILTER</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-4">
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

        {/* Footer with Clear and Apply buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background space-y-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full"
          >
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            className="w-full bg-foreground text-background hover:bg-foreground/90"
          >
            APPLY
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
