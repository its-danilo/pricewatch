"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_LIMITS, type Monitor, type Plan } from "@/lib/types";

function statusBadge(status: string | null) {
  switch (status) {
    case "in_stock":
      return { label: "In stock", cls: "bg-emerald-50 text-emerald-700" };
    case "out_of_stock":
      return { label: "Out of stock", cls: "bg-amber-50 text-amber-700" };
    case "error":
      return { label: "Check failed", cls: "bg-red-50 text-red-700" };
    default:
      return { label: "Pending first check", cls: "bg-slate-100 text-slate-500" };
  }
}

export function MonitorsManager({
  initialMonitors,
  userId,
  plan,
}: {
  initialMonitors: Monitor[];
  userId: string;
  plan: Plan;
}) {
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const limit = PLAN_LIMITS[plan].maxMonitors;
  const atLimit = monitors.length >= limit;

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (atLimit) return;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setError("Enter a valid URL, including https://");
      return;
    }

    const { data, error: err } = await supabase
      .from("monitors")
      .insert({
        user_id: userId,
        url: parsed.toString(),
        label: label.trim() || parsed.hostname,
        target_price: target ? Number(target) : null,
      })
      .select()
      .single();

    if (err) {
      setError("Could not add the monitor. Please try again.");
      return;
    }
    if (data) {
      setMonitors((prev) => [data as Monitor, ...prev]);
      setUrl("");
      setLabel("");
      setTarget("");
    }
  }

  async function remove(id: string) {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("monitors").delete().eq("id", id);
  }

  async function toggle(id: string, active: boolean) {
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active } : m)),
    );
    await supabase.from("monitors").update({ active }).eq("id", id);
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Add a product</h2>
        <form onSubmit={addMonitor} className="mt-4 space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://store.com/product"
            className="input"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="input"
            />
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              placeholder="Target price (optional)"
              className="input sm:max-w-[200px]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {atLimit ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You reached the {limit}-monitor limit of the Free plan. Upgrade to
              Pro for up to {PLAN_LIMITS.pro.maxMonitors}.
            </p>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} /> Add monitor
            </button>
          )}
        </form>
      </section>

      {/* List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-slate-900">
            Monitors{" "}
            <span className="text-sm font-normal text-slate-400">
              ({monitors.length}
              {limit === Infinity ? "" : ` / ${limit}`})
            </span>
          </h2>
        </div>

        {monitors.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            No monitors yet. Add your first product above.
          </p>
        )}

        {monitors.map((m) => {
          const badge = statusBadge(m.last_status);
          const price = m.last_price != null ? Number(m.last_price) : null;
          const targetPrice =
            m.target_price != null ? Number(m.target_price) : null;
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">
                      {m.label}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400 hover:text-slate-600"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{m.url}</span>
                  </a>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  className="shrink-0 text-slate-300 hover:text-red-500"
                  aria-label="Delete monitor"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {price != null
                      ? `${m.currency ?? "USD"} ${price.toFixed(2)}`
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {targetPrice != null
                      ? `Target ${m.currency ?? "USD"} ${targetPrice.toFixed(2)}`
                      : "No target set"}
                    {m.last_checked
                      ? ` · checked ${new Date(m.last_checked).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  {m.active ? "Active" : "Paused"}
                  <input
                    type="checkbox"
                    checked={m.active}
                    onChange={(e) => toggle(m.id, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-5 w-9 rounded-full bg-slate-200 p-0.5 transition peer-checked:bg-emerald-600">
                    <span className="block h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
