"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="text-sm text-slate-500 hover:text-slate-900"
    >
      Sign out
    </button>
  );
}
