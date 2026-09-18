import { SystemStatusStrip } from "@/components/dashboard/SystemStatusStrip";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ScrapeActivityTimeline } from "@/components/dashboard/ScrapeActivityTimeline";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
        <p className="text-zinc-400 mt-1">Real-time observability of your price intelligence system.</p>
      </div>

      <SystemStatusStrip />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
          <AlertsFeed />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Scrape Activity</h2>
          <ScrapeActivityTimeline />
        </div>
      </div>
    </div>
  );
}
