import { getAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonitorsManager } from "@/components/monitors-manager";
import type { Monitor } from "@/lib/types";

export default async function DashboardPage() {
  const { userId, account } = await getAccount();

  const supabase = await createClient();
  const { data: monitors } = await supabase
    .from("monitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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
      />
    </div>
  );
}
