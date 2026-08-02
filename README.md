# Guy Finance

A production personal finance system — Next.js 15, TypeScript, Tailwind, shadcn/ui-style components, Framer Motion, and Supabase (Postgres + Auth + Storage). Deployed on Vercel with CI/CD: every push to `main` triggers an automatic deployment.

## Stack

- **Next.js 15** (App Router, Server Actions)
- **TypeScript**, strict mode
- **Tailwind CSS** + hand-built shadcn-style component kit (`components/ui/*`) on top of Radix UI primitives
- **Framer Motion** for micro-animations and page transitions
- **Supabase**: Postgres (with row-level security on every table), Auth (Google + Email), Storage (receipts bucket)
- **Recharts** for charts, **react-hook-form + zod** for forms
- **PWA**: manifest + service worker, installable on iOS/Android home screens

## Project structure

```
app/
  (auth)/login/          — sign-in page (Google + Email)
  auth/callback/          — OAuth callback route
  (app)/                  — authenticated app shell (sidebar/bottomnav/topbar)
    dashboard/            — overview: stats, budget bars, charts, goals strip
    transactions/         — income/expense/savings ledger — search, filter, CRUD
    subscriptions/        — recurring charges, essential/non-essential tagging
    trading/              — prop accounts, payouts, ROI, net P&L
    savings/              — savings goals with progress + ETA
    investments/          — stocks/crypto/real estate tracking
    reports/              — top merchants/categories, averages, month comparisons
    settings/             — profile, budgets editor, recurring payments, CSV export
components/
  ui/                     — shadcn-style primitives (Button, Card, Dialog, Sheet, ...)
  app-shell/              — Sidebar, BottomNav, Topbar, MonthPicker, ThemeToggle
  charts/                 — Donut, MonthlyBar, Sparkline (Recharts wrappers)
  transactions/           — TransactionForm, TransactionList
lib/
  actions/                — all server actions (CRUD), one file per domain
  supabase/               — browser/server/middleware Supabase clients
  finance-calc.ts         — pure calculation helpers (totals, top-N, etc.)
  types.ts                — TypeScript types matching the DB schema
supabase/migrations/      — SQL schema (source of truth, already applied to prod)
```

## Environment variables

Set in Vercel (already configured for this project) and locally in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local development

```bash
npm install
npm run dev
```

## Enabling Google Sign-In

Email/password auth works out of the box. Google requires one manual step (can't be automated without your own Google Cloud project):

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create an OAuth 2.0 Client ID (Web application).
2. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
3. In Supabase Dashboard → Authentication → Providers → Google: paste the Client ID and Client Secret, enable the provider.

Once that's done, the "Continue with Google" button on the login page works immediately — no code changes needed.

## Database

All tables live in `supabase/migrations/0001_init.sql` and have already been applied to the connected Supabase project. Every table has row-level security scoped to `auth.uid()`, so each user only ever sees their own data. A trigger auto-creates a `profiles` row on signup, and default categories are seeded the first time a user has none.

## Roadmap

Shipped in this initial build: Dashboard, Transactions, Subscriptions, Trading, Savings Goals, Investments, Reports, Settings, Auth (Google + Email), PWA, dark/light, budgets, CSV export, recurring payments (basic).

Next phase: notifications (billing/budget alerts), receipt upload OCR processing (schema + upload flow already in place — `receipts` table + Storage bucket — OCR extraction itself is the next hook to wire up via a Supabase Edge Function or external OCR API), and AI-powered features.
