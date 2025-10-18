import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shirt, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  type: 'garment' | 'ootd' | 'product';
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date?: string;
  brand?: string;
  color?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);

  const searchLocal = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Search in garments
      const { data: garments } = await supabase
        .from('garments')
        .select('*')
        .or(`brand.ilike.${searchTerm},type.ilike.${searchTerm},color.ilike.${searchTerm},material.ilike.${searchTerm}`);

      // Search in OOTD records
      const { data: ootds } = await supabase
        .from('ootd_records')
        .select('*')
        .or(`location.ilike.${searchTerm},weather.ilike.${searchTerm},notes.ilike.${searchTerm}`);

      const localResults: SearchResult[] = [
        ...(garments || []).map(g => ({
          type: 'garment' as const,
          id: g.id,
          title: `${g.brand || ''} ${g.type}`,
          description: `${g.color || ''} ${g.material || ''}`,
          imageUrl: g.image_url,
          brand: g.brand,
          color: g.color
        })),
        ...(ootds || []).map(o => ({
          type: 'ootd' as const,
          id: o.id,
          title: o.location || 'OOTD',
          description: `${o.weather || ''} - ${o.notes || ''}`,
          imageUrl: o.photo_url,
          date: o.date
        }))
      ];

      setResults(localResults);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const searchExternal = async (query: string) => {
    if (!query.trim()) return;

    setSearchingExternal(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-product-info', {
        body: { brand: query, model: '' }
      });

      if (error) throw error;
      
      if (data) {
        setExternalResults([{
          title: `${query} Products`,
          imageUrl: data.imageUrl,
          price: data.price,
          style: data.style,
          availability: data.availability
        }]);
      }
    } catch (error) {
      console.error('External search error:', error);
      toast.error('External search failed');
    } finally {
      setSearchingExternal(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocal(searchQuery);
  };

  const handleExternalSearch = () => {
    searchExternal(searchQuery);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Search className="w-6 h-6" />
            Search
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search closet, outfits, or products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) {
                searchLocal(e.target.value);
              } else {
                setResults([]);
                setExternalResults([]);
              }
            }}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        <Tabs defaultValue="local" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">
              My Items ({results.length})
            </TabsTrigger>
            <TabsTrigger value="external" onClick={() => searchExternal(searchQuery)}>
              Shop Online
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {searching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No results found' : 'Start typing to search...'}
              </div>
            ) : (
              results.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {result.imageUrl && (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {result.type === 'garment' ? (
                            <Shirt className="w-4 h-4 text-primary" />
                          ) : (
                            <Calendar className="w-4 h-4 text-primary" />
                          )}
                          <h3 className="font-medium truncate">{result.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
                        {result.date && (
                          <Badge variant="secondary" className="mt-2">
                            {new Date(result.date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="external" className="flex-1 overflow-y-auto space-y-3 mt-4">
            <div className="space-y-3">
              <Button
                onClick={handleExternalSearch}
                disabled={!searchQuery || searchingExternal}
                className="w-full"
              >
                {searchingExternal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching Online...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Search "{searchQuery}" Online
                  </>
                )}
              </Button>

              {searchingExternal ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : externalResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Click the button above to search online stores
                </div>
              ) : (
                externalResults.map((product, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{product.title}</h3>
                          {product.price && (
                            <p className="text-lg font-bold text-primary mb-1">
                              {product.price}
                            </p>
                          )}
                          {product.style && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {product.style}
                            </p>
                          )}
                          {product.availability && (
                            <Badge variant="outline">{product.availability}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
