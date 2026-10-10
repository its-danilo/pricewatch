# Setup

Everything needed to run Pricewatch (web app + worker) and deploy it. Free tiers
cover all of this.

## 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor**: run each file in `supabase/migrations/` in order.
   `0001_init.sql` creates the tables, RLS policies and the trigger that
   auto-creates an account on signup; `0002_lock_billing_columns.sql` keeps
   `plan` and the Stripe columns server-only.
3. (Optional) Google login: **Authentication > Providers > Google**.
4. Copy from **Project Settings > API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (server only, keep secret).

## 2. Stripe
1. Create an account and stay in **Test mode**.
2. **Products > Add product**: "Pricewatch Pro", recurring monthly price (for
   example US$7). Copy the **Price ID** into `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`.
3. **Developers > API keys**: copy the **Secret key** into `STRIPE_SECRET_KEY`.

## 3. Resend (email alerts)
1. Create an account at [resend.com](https://resend.com) and copy an API key.
2. Put it in `worker/.env` as `RESEND_API_KEY`. In test mode you can send from
   `onboarding@resend.dev` to your own address; for real sending, verify a domain.

## 4. Run locally
Web app:
```bash
cp .env.example .env.local   # fill Supabase + Stripe
npm install
npm run dev
```
Stripe webhooks (second terminal):
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`. Test card `4242 4242 4242 4242`.

Worker:
```bash
cd worker
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env         # fill Supabase + Resend
python check_prices.py
```

## 5. Deploy
- **Web app (Vercel)**: import the repo, add all env vars, set
  `NEXT_PUBLIC_SITE_URL` to the Vercel URL, and add a live Stripe webhook to
  `https://your-app.vercel.app/api/stripe/webhook`.
- **Worker (GitHub Actions)**: already scheduled in
  `.github/workflows/check-prices.yml` (hourly). In the repo, add
  **Settings > Secrets and variables > Actions**: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL` and, optionally,
  `OWNER_EMAILS` (same value as in Vercel: accounts that get Pro without a
  subscription).
  Trigger a manual run from the Actions tab to test.
