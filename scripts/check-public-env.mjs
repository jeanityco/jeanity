/**
 * Fails the build if public Supabase env is missing.
 * Next.js inlines NEXT_PUBLIC_* at build time — if they're empty on Vercel,
 * the deployed JS crashes in the browser. This surfaces the problem in build logs.
 *
 * Loads .env then .env.local (same order as Next) so local `npm run build` works.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(filename) {
  const p = join(root, filename);
  if (!existsSync(p)) return;
  const content = readFileSync(p, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

if (!process.env.SKIP_PUBLIC_ENV_CHECK) {
  applyEnvFile(".env");
  applyEnvFile(".env.local");
}

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("  BUILD BLOCKED: Missing Supabase environment variables");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error("  Add either pair (Vercel → Settings → Environment Variables):");
  console.error("    NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("  OR (common Supabase/Vercel template names):");
  console.error("    SUPABASE_URL + SUPABASE_ANON_KEY");
  console.error("");
  console.error('  Enable "Production" (and Preview if needed), save, then redeploy.');
  console.error("");
  console.error("  Supabase: Project Settings → API → Project URL + anon public key");
  console.error("  Do not use the service_role key in the app.");
  console.error("");
  process.exit(1);
}
