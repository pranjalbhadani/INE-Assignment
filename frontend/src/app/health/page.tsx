"use client";

import { useEffect, useState } from "react";
import { Server, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function HealthPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await api.getHealth();
        if (!ignore) setHealth(res as unknown as Record<string, unknown>);
      } catch (err) {
        console.error(err);
        if (!ignore) setHealth({ success: false, status: 'error', error: String(err) });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [refreshCount]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">System Health</h1>
          <p className="text-zinc-400 mt-1">Backend service status and connectivity.</p>
        </div>
        <Button variant="outline" onClick={() => setRefreshCount(c => c + 1)} disabled={loading} className="border-zinc-700 text-zinc-300 hover:text-white">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-indigo-500">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">API Server</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health?.success ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${health?.success ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="text-zinc-300 capitalize">{health?.success ? 'Online' : 'Offline'}</span>
            </div>
            {health && (
              <div className="mt-4 text-xs text-zinc-500 font-mono bg-zinc-900 rounded p-2 overflow-auto">
                <pre>{JSON.stringify(health, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
