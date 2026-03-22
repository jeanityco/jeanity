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

**Minimum for a green Vercel build:** set Supabase **URL + public key** on the project (Production scope) as described in `DEPLOY.md`, then redeploy.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (webpack; stable with Supabase auth) |
| `npm run build` | Production build (includes Supabase env check) |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |

## Requirements

- **Node.js** ≥ 20.9 (see `package.json` → `engines`)
