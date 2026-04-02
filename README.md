# Jeanity

Next.js app (App Router) with Supabase auth, feeds, and spaces.

## Local development

```bash
npm install
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or publishable key pair)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

See **[DEPLOY.md](./DEPLOY.md)** for environment variables, Supabase setup, and troubleshooting.

**Vercel build** can succeed without Supabase env; **auth and data need** URL + public key on the project (see `DEPLOY.md`). Use `npm run verify-env` locally to confirm env before release.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (webpack; stable with Supabase auth) |
| `npm run build` | Production build |
| `npm run verify-env` | Fail if Supabase URL/key missing (optional CI / pre-push) |
| `npm run verify:release` | Run env check + lint + production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |

## Requirements

- **Node.js** ≥ 20.9 (see `package.json` → `engines`)

## Project structure conventions

- Keep route files in `src/app` aligned with URL paths; avoid renaming route segments unless behavior changes are intended.
- Use `PascalCase.tsx` for React components and `camelCase.ts` for data mappers/utilities.
- Keep feature-local code under `src/features/<feature>` and prefer colocating related UI, context, and mappers there.
- Use `@/*` imports for cross-folder references and keep relative imports for same-folder modules.
- Use local `index.ts` barrel files only at stable folder boundaries (for example: `src/features/feeds`, `src/features/spaces`, `src/components/shell`).
