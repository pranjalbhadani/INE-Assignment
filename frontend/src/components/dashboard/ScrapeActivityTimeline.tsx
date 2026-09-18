"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { ScrapeAttempt } from "@/types/api";

export function ScrapeActivityTimeline() {
  const [scrapes, setScrapes] = useState<ScrapeAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch products to get all scrapes. For the dashboard, we might want a global scrape endpoint.
        // But since we don't have one, we can fetch tracked products and get history for the top 3, or just show a message.
        // Wait, the backend doesn't have a GET /api/scraper/activity endpoint. 
        // I'll show recent scrapes from the first active product as a placeholder for the timeline.
        const prods = await api.getTrackedProducts();
        if (prods.success && prods.data.length > 0) {
          const id = prods.data[0].id;
          const res = await api.getScrapeHistory(id);
          if (res.success) {
            setScrapes(res.data.slice(0, 5));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-zinc-900/50 rounded-md" />;
  }

  if (scrapes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
        <span className="text-sm">No recent activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {scrapes.map((scrape) => (
        <div key={scrape.id} className="flex gap-3 items-center border-b border-zinc-800/50 pb-4 last:border-0 last:pb-0">
          {scrape.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-zinc-200">
                Scrape {scrape.status}
              </h4>
              <p className="text-xs text-zinc-500">
                {new Date(scrape.scraped_at).toLocaleString()}
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">{scrape.duration_ms}ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}
