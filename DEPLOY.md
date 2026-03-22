# Deploying Jeanity on Vercel

## Prerequisites

- GitHub (or GitLab / Bitbucket) repo connected to [Vercel](https://vercel.com).
- A [Supabase](https://supabase.com) project with your database and `supabase/schema.sql` applied (SQL Editor → run the file).

## 1. Environment variables (required)

The app **will not build** on Vercel until Supabase credentials are available at **build time**.

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

**Optional skip (not recommended):** set `SKIP_PUBLIC_ENV_CHECK=1` only to debug; the live app will still need real Supabase env to work.

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

`npm run build` runs a small check (`scripts/check-public-env.mjs`) that mirrors what Vercel needs.

## 6. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Build fails: “BUILD BLOCKED: Missing Supabase…” | Vars missing or wrong environment scope (Production unchecked). |
| Site loads but errors about Supabase in the browser | Old deployment: redeploy after setting `NEXT_PUBLIC_*`. Hard-refresh or incognito. |
| Auth / storage 403 | RLS policies and Storage buckets from `schema.sql` not applied in Supabase. |

## Files to know

- `.env.example` — template for local `.env.local`.
- `next.config.ts` — maps `SUPABASE_*` / publishable names into `NEXT_PUBLIC_*` for the browser.
- `scripts/supabase-env-resolve.mjs` — single list of accepted env names (keep in sync if you add more).
