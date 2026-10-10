import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the auth code (magic link / OAuth) for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // A sign-up confirmation link is already verified by Supabase at this point;
  // the code exchange only fails when it is opened in another browser.
  if (searchParams.get("confirmed") === "1") {
    return NextResponse.redirect(`${origin}/login?confirmed=1`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
