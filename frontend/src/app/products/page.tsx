"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Package } from "lucide-react";
import { api } from "@/lib/api";
import { TrackedProduct } from "@/types/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getTrackedProducts();
        if (res.success) {
          setProducts(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tracked Products</h1>
          <p className="text-zinc-400 mt-1">Products actively monitored for price and stock changes.</p>
        </div>
        <Link href="/search" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          Track New Product
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p>No products tracked yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Product</TableHead>
                <TableHead className="text-zinc-400">Latest Price</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Last Scrape</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell>
                    <div className="font-medium text-zinc-200">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.brand} • SKU: {p.sku}</div>
                  </TableCell>
                  <TableCell>
                    {p.last_known_price ? (
                      <span className="font-mono text-emerald-400">₹{p.last_known_price}</span>
                    ) : (
                      <span className="text-zinc-600">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-500">Paused</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-300">
                      {p.last_scraped_at ? new Date(p.last_scraped_at).toLocaleString() : 'Never'}
                    </div>
                    {p.last_scrape_status === 'failed' && (
                      <div className="text-xs text-red-400 mt-1">Failed ({p.consecutive_failures}x)</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/products/${p.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-zinc-800 hover:text-white h-8 px-3 py-2 text-zinc-400">
                      Details
                    </Link>
                    <a href={p.target_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:text-indigo-400 h-8 w-8 text-zinc-500 ml-2">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
