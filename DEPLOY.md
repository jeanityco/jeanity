# Deploying Jeanity on Vercel

## Prerequisites

- GitHub (or GitLab / Bitbucket) repo connected to [Vercel](https://vercel.com).
- A [Supabase](https://supabase.com) project with your database and `supabase/schema.sql` applied (SQL Editor → run the file).

## 1. Environment variables (required for a working site)

`npm run build` on Vercel **does not** require Supabase env (so the compile step can succeed).  
The **live app** needs Supabase credentials or pages that use auth/data will error in the browser.

Run **`npm run verify-env`** locally before pushing if you want the same checks Vercel used to run (fails when URL/key are missing).

In **Vercel → your project → Settings → Environment Variables**, add **both**:

1. **Project URL**  
2. **Public API key** (anon or publishable — **not** the `service_role` secret)

Use **any one** of these pairs (whichever matches your Supabase / Vercel setup):

| URL variable | Key variable |
|--------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` *(Vercel Marketplace)* |
| `SUPABASE_URL` | `SUPABASE_ANON_KEY` |
| `SUPABASE_URL` | `SUPABASE_PUBLISHABLE_KEY` |

Where to copy values: **Supabase Dashboard → Project Settings → API** (Project URL + anon / default publishable key).

**Important**

- Enable **Production** (and **Preview** if you use preview URLs) for each variable.
- After saving variables, trigger a **new deployment** (Redeploy). Changing env alone does not rebuild old deployments.

**Optional:** `SKIP_PUBLIC_ENV_CHECK=1` is only read by `npm run verify-env` (not by `next build`).

## 2. Connect the repo

1. Vercel → **Add New… → Project** → import `jeanityco/jeanity` (or your fork).
2. **Framework Preset:** Next.js (auto-detected).
3. **Root Directory:** repository root (default).
4. **Build Command:** `npm run build` (default).
5. **Output:** Next.js default (no static `out/` unless you change config).

## 3. Supabase + Vercel Marketplace (optional)

If you create Supabase through **Vercel Marketplace**, env vars are synced automatically (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, etc.). This repo accepts those names; no manual rename is required.

## 4. Database

Run `supabase/schema.sql` against your Supabase project so tables, RLS, and storage policies exist. Redeploy the app after schema changes only if you rely on build-time checks tied to the API; usually a DB migration is enough.

## 5. Verify locally before pushing

```bash
cp .env.example .env.local
# Edit .env.local with real values

npm install
npm run build
npm start
```

Optional: run `npm run verify-env` then `npm run build` to confirm Supabase env is present locally.

## 5b. Predeploy checklist (recommended)

- Run `npm run verify:release` and fix any failures before pushing.
- Re-run `supabase/schema.sql` in Supabase SQL Editor after DB changes.
- Confirm `increment_product_upvotes` and `get_ranked_feed_posts` exist in Supabase (SQL editor quick check) if feed/ranking changes were made.
- Confirm Vercel env vars are set for the target environment (Production, and Preview if used).
- Redeploy after changing environment variables.

## 6. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `npm run verify-env` fails | Vars missing locally; fix `.env.local` or export env before running it. |
| Site loads but Supabase errors in the console | Vercel env not set for Production, or redeploy needed after adding vars. |
| Site loads but errors about Supabase in the browser | Old deployment: redeploy after setting `NEXT_PUBLIC_*`. Hard-refresh or incognito. |
| Auth / storage 403 | RLS policies and Storage buckets from `schema.sql` not applied in Supabase. |

## Files to know

- `.env.example` — template for local `.env.local`.
- `next.config.ts` — maps `SUPABASE_*` / publishable names into `NEXT_PUBLIC_*` for the browser.
- `scripts/supabase-env-resolve.mjs` — single list of accepted env names (keep in sync if you add more).
