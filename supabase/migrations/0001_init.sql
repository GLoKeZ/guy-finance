-- =========================================================
-- Guy Finance — initial schema (source of truth; already applied to prod)
-- All tables scoped per-user via RLS (auth.uid() = user_id)
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'ILS',
  monthly_salary numeric(12,2) not null default 0,
  salary_day int not null default 1,
  monthly_savings_target numeric(12,2) not null default 3000,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '📎',
  color text not null default '#4C8DFF',
  kind text not null check (kind in ('income','expense','savings','trading')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories_all_own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists categories_user_idx on public.categories(user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income','expense','savings')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'ILS',
  description text not null default '',
  merchant text,
  payment_method text,
  occurred_on date not null default current_date,
  is_recurring boolean not null default false,
  recurring_payment_id uuid,
  note text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "transactions_all_own" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index if not exists transactions_user_category_idx on public.transactions(user_id, category_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12,2) not null default 0,
  billing_day int not null default 1 check (billing_day between 1 and 31),
  active boolean not null default true,
  essential_level text not null default 'review' check (essential_level in ('essential','non_essential','review')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions_all_own" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  account_size numeric(12,2),
  cost numeric(12,2) not null default 0,
  purchase_date date not null default current_date,
  status text not null default 'active' check (status in ('active','passed','funded','failed','closed')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.trading_accounts enable row level security;
create policy "trading_accounts_all_own" on public.trading_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.trading_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  provider text not null,
  amount numeric(12,2) not null default 0,
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.trading_payouts enable row level security;
create policy "trading_payouts_all_own" on public.trading_payouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🏁',
  target_amount numeric(12,2) not null default 0,
  current_amount numeric(12,2) not null default 0,
  monthly_contribution numeric(12,2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'other' check (kind in ('stocks','crypto','real_estate','fund','other')),
  amount_invested numeric(12,2) not null default 0,
  current_value numeric(12,2) not null default 0,
  purchase_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.investments enable row level security;
create policy "investments_all_own" on public.investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12,2) not null default 0,
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  next_due_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.recurring_payments enable row level security;
create policy "recurring_payments_all_own" on public.recurring_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_all_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  storage_path text not null,
  ocr_status text not null default 'pending' check (ocr_status in ('pending','processing','done','failed','skipped')),
  ocr_merchant text,
  ocr_amount numeric(12,2),
  ocr_date date,
  ocr_raw_text text,
  created_at timestamptz not null default now()
);
alter table public.receipts enable row level security;
create policy "receipts_all_own" on public.receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_storage_own_select" on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts_storage_own_insert" on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts_storage_own_delete" on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, category_id)
);
alter table public.budgets enable row level security;
create policy "budgets_all_own" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- v2: personal targets ----------
alter table public.profiles add column if not exists investment_target numeric(12,2) not null default 0;
alter table public.profiles add column if not exists max_spending numeric(12,2) not null default 0;
alter table public.profiles add column if not exists emergency_fund_target numeric(12,2) not null default 10000;
