-- Pricewatch — initial schema + Row-Level Security
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Accounts (one per auth user, auto-created on signup)
-- ---------------------------------------------------------------------------

create table if not exists public.accounts (
  id                      uuid primary key references auth.users (id) on delete cascade,
  plan                    text not null default 'free',   -- 'free' | 'pro'
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Monitors
-- ---------------------------------------------------------------------------

create table if not exists public.monitors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  url           text not null,
  label         text,
  target_price  numeric(12, 2),
  selector      text,
  currency      text default 'USD',
  active        boolean not null default true,
  last_checked  timestamptz,
  last_price    numeric(12, 2),
  last_status   text,            -- 'in_stock' | 'out_of_stock' | 'error'
  created_at    timestamptz not null default now()
);
create index if not exists monitors_user_idx on public.monitors (user_id);
create index if not exists monitors_active_idx on public.monitors (active) where active;

create table if not exists public.price_history (
  id          bigint generated always as identity primary key,
  monitor_id  uuid not null references public.monitors (id) on delete cascade,
  price       numeric(12, 2),
  in_stock    boolean not null default true,
  checked_at  timestamptz not null default now()
);
create index if not exists price_history_monitor_idx
  on public.price_history (monitor_id, checked_at);

create table if not exists public.alerts (
  id          bigint generated always as identity primary key,
  monitor_id  uuid not null references public.monitors (id) on delete cascade,
  type        text not null,             -- 'drop' | 'restock'
  price       numeric(12, 2),
  channel     text not null default 'email',
  sent_at     timestamptz not null default now()
);
create index if not exists alerts_monitor_idx on public.alerts (monitor_id, sent_at);

-- ---------------------------------------------------------------------------
-- Row-Level Security (owner-only; the worker uses the service role key)
-- ---------------------------------------------------------------------------

alter table public.accounts      enable row level security;
alter table public.monitors      enable row level security;
alter table public.price_history enable row level security;
alter table public.alerts        enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = id);
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = id);
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "monitors_all_own" on public.monitors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "price_history_select_own" on public.price_history
  for select using (
    exists (
      select 1 from public.monitors m
      where m.id = price_history.monitor_id and m.user_id = auth.uid()
    )
  );

create policy "alerts_select_own" on public.alerts
  for select using (
    exists (
      select 1 from public.monitors m
      where m.id = alerts.monitor_id and m.user_id = auth.uid()
    )
  );
