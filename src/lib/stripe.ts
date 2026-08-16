import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily-created server-side Stripe client. Never import into a Client
 * Component. Lazy so the build never instantiates it without a key.
 * apiVersion is left as the SDK default to stay in sync with the types. */
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
  }
  return client;
}

export const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
