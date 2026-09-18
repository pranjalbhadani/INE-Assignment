"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { TrackedProduct, ScrapeAttempt } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunScrapeButton } from "@/components/products/RunScrapeButton";
import { PriceHistoryChart } from "@/components/products/PriceHistoryChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const [product, setProduct] = useState<TrackedProduct | null>(null);
  const [scrapes, setScrapes] = useState<ScrapeAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [prodRes, scrapesRes] = await Promise.all([
        api.getTrackedProduct(id),
        api.getScrapeHistory(id)
      ]);
      if (prodRes.success) setProduct(prodRes.data);
      if (scrapesRes.success) setScrapes(scrapesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Loading product details...</div>;
  }

  if (!product) {
    return <div className="text-zinc-400">Product not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/products" className="mb-4 text-zinc-400 hover:text-white px-0 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tracked Products
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">{product.name}</h1>
              {product.is_active ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-zinc-700 text-zinc-500">Paused</Badge>
              )}
            </div>
            <p className="text-zinc-400 mt-1">{product.brand} • SKU: {product.sku}</p>
            <a href={product.target_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 mt-2">
              <ExternalLink className="mr-1 h-3 w-3" />
              View Original Product
            </a>
          </div>
          <RunScrapeButton productId={product.id} onComplete={loadData} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-medium text-zinc-400">Latest Price</span>
          <span className="mt-2 text-4xl font-mono text-emerald-400">
            {product.last_known_price ? `₹${product.last_known_price}` : '--'}
          </span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-medium text-zinc-400">Stock Availability</span>
          <span className="mt-2 text-3xl font-semibold text-white">
            {product.last_known_stock !== null ? product.last_known_stock : '--'}
          </span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{product.last_known_stock_status || 'Unknown'}</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-medium text-zinc-400">Last Scraped</span>
          <span className="mt-2 text-lg font-medium text-zinc-200">
            {product.last_scraped_at ? new Date(product.last_scraped_at).toLocaleString() : 'Never'}
          </span>
          {product.last_scrape_status === 'failed' && (
            <span className="text-sm text-red-500 mt-1">Failed ({product.consecutive_failures}x)</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-xl font-semibold text-white">Price History</h2>
        <PriceHistoryChart productId={id} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Scrape Log</h2>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-zinc-400 hover:text-white">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        {scrapes.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">No scrape attempts recorded yet.</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/50">
                  <TableHead className="text-zinc-400">Time</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Duration</TableHead>
                  <TableHead className="text-zinc-400">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrapes.map((s) => (
                  <TableRow key={s.id} className="border-zinc-800 hover:bg-zinc-900/30">
                    <TableCell className="text-zinc-300">
                      {new Date(s.scraped_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {s.status === 'success' ? (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Success</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500/30 text-red-400">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-400">{s.duration_ms}ms</TableCell>
                    <TableCell>
                      {s.status === 'failed' ? (
                        <div className="flex flex-col text-sm">
                          <span className="text-red-400 font-medium">{s.error_type}</span>
                          <span className="text-zinc-500 text-xs truncate max-w-md" title={s.error_message || ''}>
                            {s.error_message}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-sm">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
