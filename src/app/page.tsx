import Link from "next/link";
import { Bell, Check, LineChart, TrendingDown } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
            <TrendingDown size={18} />
          </span>
          Pricewatch
        </span>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Bell size={13} /> Never overpay again
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl">
          Track any price,{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            get alerted when it drops
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Paste a product URL, set your target price, and Pricewatch emails you
          the moment it drops or comes back in stock.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Start tracking free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: TrendingDown,
            title: "Price-drop alerts",
            body: "Set a target price and get notified the second a product goes below it.",
          },
          {
            icon: Bell,
            title: "Back-in-stock alerts",
            body: "Out of stock? We watch it and ping you when it is available again.",
          },
          {
            icon: LineChart,
            title: "Price history",
            body: "See how a product's price moved over time before you buy.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-slate-200 p-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            features={["3 monitors", "Daily checks", "Email alerts"]}
            cta="Get started"
          />
          <PlanCard
            name="Pro"
            price="$7"
            highlighted
            features={[
              "30 monitors",
              "Hourly checks",
              "Email + Telegram alerts",
              "Price history export",
            ]}
            cta="Start free, upgrade later"
          />
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        Pricewatch · built with Next.js, a Python worker, Supabase and Stripe
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  highlighted = false,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlighted
          ? "border-emerald-600 ring-1 ring-emerald-600"
          : "border-slate-200"
      }`}
    >
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-2 text-4xl font-extrabold">
        {price}
        <span className="text-base font-medium text-slate-500">/mo</span>
      </p>
      <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/login?mode=signup"
        className={`mt-8 block rounded-xl px-4 py-2.5 text-center font-semibold ${
          highlighted
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
