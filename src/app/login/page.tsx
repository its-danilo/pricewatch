"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Turns Supabase auth errors into messages that say what to do next. Supabase
 * returns the same error for an unknown email and a wrong password on purpose,
 * so the message covers both. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Wrong email or password. No account yet? Create one below.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first: open the link we sent to your inbox.";
  }
  if (m.includes("rate limit")) {
    return "Too many emails were sent in a short time. Wait a few minutes and try again.";
  }
  return message;
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so /login can still be prerendered.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signup" | "signin">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    // /auth/callback sends people here when the confirmation link was opened
    // in another browser: the email is confirmed, but there is no session yet.
    params.get("confirmed") === "1"
      ? "Your email is confirmed. Sign in to continue."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Land on the dashboard already signed in after confirming the email.
        options: { emailRedirectTo: `${location.origin}/auth/callback?confirmed=1` },
      });
      if (error) {
        setError(friendlyError(error.message));
        setLoading(false);
        return;
      }
      // An already-registered email comes back with no identities and no email sent.
      if (data.user && data.user.identities?.length === 0) {
        setError("This email already has an account. Sign in instead.");
        setMode("signin");
        setLoading(false);
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
        return;
      }
      setInfo("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
            <TrendingDown size={18} />
          </span>
          Pricewatch
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signup"
              ? "Start tracking prices in seconds."
              : "Sign in to your dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading
                ? "…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
                setInfo(null);
              }}
              className="font-medium text-emerald-600 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
