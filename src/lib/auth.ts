import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

/** Returns the current user and their account row, creating the account on
 * first access if it does not exist yet. Redirects to /login when signed out. */
export async function getAccount(): Promise<{ userId: string; account: Account }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    await supabase.from("accounts").insert({ id: user.id });
    ({ data } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", user.id)
      .maybeSingle());
  }

  return { userId: user.id, account: data as Account };
}
