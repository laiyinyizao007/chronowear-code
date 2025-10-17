import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const popularCities = [
  { value: "new-york-usa", label: "New York, USA" },
  { value: "london-uk", label: "London, UK" },
  { value: "paris-france", label: "Paris, France" },
  { value: "tokyo-japan", label: "Tokyo, Japan" },
  { value: "milan-italy", label: "Milan, Italy" },
  { value: "los-angeles-usa", label: "Los Angeles, USA" },
  { value: "seoul-korea", label: "Seoul, South Korea" },
  { value: "hong-kong", label: "Hong Kong" },
  { value: "singapore", label: "Singapore" },
  { value: "sydney-australia", label: "Sydney, Australia" },
  { value: "beijing-china", label: "Beijing, China" },
  { value: "shanghai-china", label: "Shanghai, China" },
  { value: "mumbai-india", label: "Mumbai, India" },
  { value: "dubai-uae", label: "Dubai, UAE" },
  { value: "barcelona-spain", label: "Barcelona, Spain" },
];

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationCombobox({ value, onChange }: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
              {value
                ? popularCities.find((city) => city.label === value)?.label || value
                : "Select location..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-background" align="start">
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandEmpty>No location found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {popularCities.map((city) => (
              <CommandItem
                key={city.value}
                value={city.label}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === city.label ? "opacity-100" : "opacity-0"
                  )}
                />
                {city.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
