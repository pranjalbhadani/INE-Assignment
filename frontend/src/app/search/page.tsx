"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface StoreSearchResult {
  store_product_id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.searchProducts(query);
      if (res.success && res.data) {
        setResults(res.data as unknown as StoreSearchResult[]);
      }
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (storeProductId: string) => {
    setTrackingId(storeProductId);
    try {
      const res = await api.trackProduct(storeProductId);
      if (res.success && res.data?.id) {
        router.push(`/products/${res.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to track product");
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div className="text-center mt-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Store Search</h1>
        <p className="text-zinc-400 mt-2">Find and start tracking products from the external store catalog.</p>
      </div>

      <form onSubmit={handleSearch} className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search by name, category, or SKU..."
          className="h-14 w-full rounded-full border-zinc-800 bg-zinc-950/50 pl-12 pr-32 text-lg text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button 
          type="submit" 
          disabled={loading || !query.trim()}
          className="absolute right-2 h-10 rounded-full bg-indigo-600 px-6 hover:bg-indigo-700 text-white"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
        </Button>
      </form>

      <div className="mt-4">
        {loading && (
          <div className="text-center py-12 text-zinc-500">Searching store catalog...</div>
        )}
        
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No products found matching &quot;{query}&quot;
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-4">
            {results.map((product) => (
              <Card key={product.store_product_id} className="border-zinc-800 bg-zinc-950/50">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{product.name}</h3>
                    <div className="text-sm text-zinc-400 mt-1 flex gap-3">
                      <span>Brand: {product.brand}</span>
                      <span>•</span>
                      <span>Category: {product.category}</span>
                      <span>•</span>
                      <span>SKU: {product.sku}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Button 
                      onClick={() => handleTrack(product.store_product_id)}
                      disabled={trackingId === product.store_product_id}
                      className="bg-zinc-800 hover:bg-indigo-600 text-white"
                    >
                      {trackingId === product.store_product_id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Track
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
