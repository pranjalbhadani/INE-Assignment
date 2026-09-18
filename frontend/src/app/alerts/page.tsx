"use client";

import { useEffect, useState } from "react";
import { Bell, Package, TrendingDown, AlertCircle, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Alert } from "@/types/api";
import { Badge } from "@/components/ui/badge";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getAlerts();
        if (res.success) {
          setAlerts(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_drop': return <TrendingDown className="h-5 w-5 text-emerald-500" />;
      case 'out_of_stock': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'back_in_stock': return <Package className="h-5 w-5 text-blue-500" />;
      case 'failure_streak': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Bell className="h-5 w-5 text-zinc-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Alerts</h1>
        <p className="text-zinc-400 mt-1">Notifications for price changes, stock availability, and scraper failures.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p>No alerts generated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex gap-4 p-4 hover:bg-zinc-900/30 transition-colors">
                <div className="mt-1">{getAlertIcon(alert.alert_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-200">{alert.title}</h3>
                    <span className="text-xs text-zinc-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300">
                      {alert.product_name}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
