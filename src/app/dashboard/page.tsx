import { getAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonitorsManager } from "@/components/monitors-manager";
import type { Monitor, PricePoint } from "@/lib/types";

/** Start of the window shown in each monitor's price history chart. */
function historySince(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function DashboardPage() {
  const { userId, account } = await getAccount();

  const supabase = await createClient();
  const { data: monitors } = await supabase
    .from("monitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Last 30 days of recorded prices per monitor, for the history chart.
  const history: Record<string, PricePoint[]> = {};
  const monitorIds = (monitors ?? []).map((m) => m.id);
  if (monitorIds.length > 0) {
    const { data: points } = await supabase
      .from("price_history")
      .select("*")
      .in("monitor_id", monitorIds)
      .gte("checked_at", historySince())
      .order("checked_at")
      .limit(5000);
    for (const point of (points as PricePoint[]) ?? []) {
      (history[point.monitor_id] ??= []).push(point);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your monitors</h1>
        <p className="mt-1 text-sm text-slate-500">
          We check your products regularly and email you on price drops or
          restocks.
        </p>
      </div>
      <MonitorsManager
        initialMonitors={(monitors as Monitor[]) ?? []}
        userId={userId}
        plan={account.plan}
        history={history}
      />
    </div>
  );
}
