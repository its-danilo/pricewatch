-- Pricewatch — keep billing columns server-only
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- accounts_update_own let users update their whole row, so a signed-in user
-- could set plan = 'pro' (or someone else's stripe_customer_id) straight from
-- the browser. Every column of accounts is billing data, so users keep only
-- the insert of their own id (the getAccount() fallback); plan and the Stripe
-- columns are written by the service role (Stripe webhook and checkout route).

drop policy if exists "accounts_update_own" on public.accounts;

revoke insert, update on public.accounts from anon, authenticated;
grant insert (id) on public.accounts to authenticated;
