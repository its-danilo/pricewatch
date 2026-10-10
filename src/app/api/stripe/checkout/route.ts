import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PRO_PRICE_ID } from "@/lib/stripe";

/** Creates a Stripe Checkout session to subscribe to Pro. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let customerId: string | null = account?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    // Billing columns are not writable by the user (migration 0002).
    await createAdminClient()
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    // Ask for a card only when something is due: a 100%-off promotion code
    // then subscribes without one. Anyone paying the normal price still enters
    // a card, because the first invoice is not zero.
    payment_method_collection: "if_required",
    success_url: `${siteUrl}/dashboard?upgraded=1`,
    cancel_url: `${siteUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
