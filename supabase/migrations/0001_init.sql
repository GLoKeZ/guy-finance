-- ---------- v5: smart budgeting (locked categories) ----------
alter table public.budgets add column if not exists locked boolean not null default false;
