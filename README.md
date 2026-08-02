# Guy Finance (המערכת הפיננסית שלי)

A personal finance system — Next.js 15, TypeScript, Tailwind, shadcn/ui-style components, Framer Motion, and Supabase (Postgres + Auth + Realtime + Storage). Fully Hebrew/RTL. Every user's data is private and stored server-side in Supabase from the moment they sign up — there is no localStorage/browser-only mode in this app.

## Stack

- **Next.js 15** (App Router, Server Actions)
- **Supabase**: Postgres (RLS on every table), Auth (Email/Password, Google prepared but disabled), Realtime (live cross-device sync), Storage
- **Tailwind CSS** + shadcn-style component kit on Radix UI
- **Framer Motion**, **Recharts**, **react-hook-form + zod**
- **PWA**: manifest + service worker, installable on iOS/Android

## How data storage actually works here

Every screen (Dashboard, Transactions, Subscriptions, Trading, Savings, Investments, Reports, Settings) reads and writes through Supabase via server actions (`lib/actions/*`). Nothing is kept in `localStorage`. Row Level Security policies on every table restrict every read/write to `auth.uid() = user_id`, so each account only ever sees its own data — this has been true since the app's first deployment.

## Environment variables

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Where to find these in Supabase:**
1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings → API**.
3. `NEXT_PUBLIC_SUPABASE_URL` = the value under **Project URL**.
4. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the value under **Project API keys → anon / public**.
5. `SUPABASE_SERVICE_ROLE_KEY` = the value under **Project API keys → service_role** — this one is **secret**, server-only, never exposed to the browser, and only used inside server actions/route handlers, never in client components.

**Where to add these in Vercel:**
1. Open your project on [vercel.com](https://vercel.com) → **Settings → Environment Variables**.
2. Add each of the three variables above for **Production**, **Preview**, and **Development**.
3. Redeploy (or push a commit) for the new values to take effect.

Never commit real values for these to GitHub — `.env.local` is already gitignored.

## Running the SQL migration

The full schema lives at `supabase/migrations/0001_init.sql` and has already been applied to the connected Supabase project. If you ever need to (re)apply it manually to a fresh project:
1. Open your Supabase project → **SQL Editor**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql`.
3. Click **Run**. It's idempotent (`create table if not exists`, `on conflict do nothing`, etc.) — safe to re-run.

## Testing authentication

1. Go to `/login`, switch to "צור חשבון" (create account), enter an email + password.
2. Supabase sends a confirmation email (if "Confirm email" is enabled in Authentication → Providers → Email, which is the default). Click the link.
3. You'll land back on the app already signed in.
4. To test password reset: on the login page click "שכחת סיסמה?", enter your email, check your inbox, click the reset link, set a new password.
5. Sign out from the avatar menu top-right, sign back in with email + password to confirm persistence.

## Verifying cross-device synchronization

Realtime is enabled on `transactions`, `budgets`, `subscriptions`, `goals`, `trading_accounts`, `trading_payouts`, and `investments`. To test:
1. Open the app in two browser windows (or your phone + computer), signed in as the same user.
2. Add a transaction in one window.
3. It should appear in the other window within a second or two, with no manual refresh.

**Honesty note on offline support:** the app shows an online/offline indicator (מסונכרן / אין חיבור) in the top bar, and the service worker caches static assets so the app shell loads instantly and works offline for *viewing*. However, since writes go through Server Actions (which require a live connection), there is currently **no offline write queue** — if you add a transaction while offline, it will not save until you're back online, and no false "אין חיבור" data loss will occur, but there's also no automatic replay of an offline-attempted write yet. Building true offline write-queueing (IndexedDB + background sync + conflict-free replay) is a larger feature that hasn't been built in this pass.

## Installing on iPhone (PWA)

1. Open **https://guy-finance.vercel.app** in Safari (must be Safari, not Chrome, for "Add to Home Screen" on iOS).
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name and tap **Add**.
5. Open the app from your Home Screen icon — it launches full-screen, no browser address bar, with your existing session.

## Local development

```bash
npm install
npm run dev
```

## Enabling Google Sign-In (deferred, prepared)

Email/password is the only enabled method right now, by design. Google can be added later without any code changes:
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → create an OAuth 2.0 Client ID (Web application) → add authorized redirect URI `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret → enable.
3. Re-add the "המשך עם Google" button and `signInWithOAuth` call to the login page (previously removed at the user's request; the logic is documented above in earlier commits).

## Database tables

`profiles`, `categories`, `transactions`, `budgets`, `subscriptions`, `trading_accounts`, `trading_payouts`, `goals`, `investments`, `recurring_payments`, `notifications`, `receipts`, `user_settings`, `merchant_rules`, `import_history` — every one scoped by RLS to `auth.uid() = user_id`.

## Roadmap / not yet built

- Offline write queue (see honesty note above)
- Reports PDF export (CSV export exists)
- `merchant_rules` and `import_history` tables exist in the schema but aren't yet wired into a CSV-import UI flow
- Receipt OCR (schema + upload flow exist; OCR extraction itself is the next hook — a Supabase Edge Function or external OCR API)
