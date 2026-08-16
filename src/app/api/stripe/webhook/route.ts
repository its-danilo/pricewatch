import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

/** Receives Stripe events and keeps accounts.plan in sync with the subscription. */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  async function setPlan(customerId: string, plan: Plan, subscriptionId: string | null) {
    await admin
      .from("accounts")
      .update({ plan, stripe_subscription_id: subscriptionId })
      .eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.customer) {
        await setPlan(s.customer as string, "pro", (s.subscription as string) ?? null);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      await setPlan(sub.customer as string, active ? "pro" : "free", active ? sub.id : null);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setPlan(sub.customer as string, "free", null);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
