"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface RunScrapeButtonProps {
  productId: string;
  onComplete: () => void;
}

export function RunScrapeButton({ productId, onComplete }: RunScrapeButtonProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<'success' | 'failed' | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setLastOutcome(null);

    try {
      const res = await api.runScrape(productId);
      if (res.success) {
        setLastOutcome(res.data.status);
        if (res.data.status === 'failed') {
          setError(res.data.error_message || "Scraper failed");
        }
      }
      onComplete(); // Trigger parent reload
    } catch (err: any) {
      setError(err.message || "Failed to trigger scrape API");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button 
        onClick={handleRun} 
        disabled={running}
        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
      >
        {running ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Now
          </>
        )}
      </Button>
      {lastOutcome === 'success' && (
        <span className="text-xs text-emerald-500 font-medium">Scrape Successful</span>
      )}
      {error && (
        <span className="text-xs text-red-500 max-w-[200px] text-right font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
