import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { getAccount } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { BillingButton } from "@/components/billing-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account } = await getAccount();

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-white">
              <TrendingDown size={15} />
            </span>
            <span className="hidden sm:inline">Pricewatch</span>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                account.plan === "pro"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {account.plan === "pro" ? "Pro" : "Free"}
            </span>
            <BillingButton plan={account.plan} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}
