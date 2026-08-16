import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses Row-Level Security.
 * SERVER-ONLY: never import this into a Client Component.
 * Used by trusted server code such as the Stripe webhook.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
