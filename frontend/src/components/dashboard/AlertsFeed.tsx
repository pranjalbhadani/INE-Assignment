"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, Package, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { Alert } from "@/types/api";

export function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getAlerts();
        if (res.success) {
          setAlerts(res.data.slice(0, 5)); // Show only top 5 on dashboard
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
      case 'price_drop': return <TrendingDown className="h-4 w-4 text-emerald-500" />;
      case 'out_of_stock': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'back_in_stock': return <Package className="h-4 w-4 text-blue-500" />;
      case 'failure_streak': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-zinc-500" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-zinc-900/50 rounded-md" />;
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
        <Bell className="h-8 w-8 mb-2 opacity-20" />
        <span className="text-sm">No recent alerts</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex gap-3 items-start border-b border-zinc-800/50 pb-4 last:border-0 last:pb-0">
          <div className="mt-0.5 rounded-full bg-zinc-900 p-1">
            {getAlertIcon(alert.alert_type)}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-zinc-200">{alert.title}</h4>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{alert.message}</p>
            <div className="text-[10px] text-zinc-500 mt-1">
              {new Date(alert.created_at).toLocaleString()} • {alert.product_name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
