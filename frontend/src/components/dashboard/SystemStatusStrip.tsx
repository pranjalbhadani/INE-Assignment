"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Package } from "lucide-react";
import { api } from "@/lib/api";
import { ScraperStatus } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";

export function SystemStatusStrip() {
  const [status, setStatus] = useState<ScraperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getScraperStatus();
        if (res.success) setStatus(res.data);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-zinc-900" />;
  if (error || !status) return <div className="h-24 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-500">Failed to load system status</div>;

  const cards = [
    {
      label: "Tracked Products",
      value: status.trackedProductCount,
      icon: Package,
      color: "text-blue-500",
    },
    {
      label: "Active Scrapes",
      value: status.activeScrapeCount,
      icon: Activity,
      color: "text-amber-500",
    },
    {
      label: "24h Success",
      value: status.successfulScrapes24h,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Failure Rate",
      value: `${status.recentFailureRatePct}%`,
      icon: AlertTriangle,
      color: status.recentFailureRatePct > 10 ? "text-red-500" : "text-emerald-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="bg-zinc-950/50 border-zinc-800">
          <CardContent className="flex items-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-zinc-400">{c.label}</p>
              <h3 className="text-2xl font-bold text-zinc-100">{c.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
