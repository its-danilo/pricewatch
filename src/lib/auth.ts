import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import type { Account } from "@/lib/types";

/** Returns the current user and their account row, creating the account on
 * first access if it does not exist yet. Owners (OWNER_EMAILS) are reported as
 * Pro. Redirects to /login when signed out. */
export async function getAccount(): Promise<{ userId: string; account: Account; isOwner: boolean }> {
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

  const isOwner = isOwnerEmail(user.email);
  const account = data as Account;
  return { userId: user.id, account: { ...account, plan: isOwner ? "pro" : account.plan }, isOwner };
}
