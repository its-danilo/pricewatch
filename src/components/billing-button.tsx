"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Plan } from "@/lib/types";

export function BillingButton({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);

  async function go(path: string) {
    setLoading(true);
    try {
      const res = await fetch(path, { method: "POST" });
      const { url } = await res.json();
      if (url) {
        location.href = url;
        return;
      }
    } catch {
      // fall through
    }
    setLoading(false);
  }

  if (plan === "pro") {
    return (
      <button
        onClick={() => go("/api/stripe/portal")}
        disabled={loading}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "…" : "Manage billing"}
      </button>
    );
  }

  return (
    <button
      onClick={() => go("/api/stripe/checkout")}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      <Sparkles size={14} /> {loading ? "…" : "Upgrade to Pro"}
    </button>
  );
}
