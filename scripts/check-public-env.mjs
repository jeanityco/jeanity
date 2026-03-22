/**
 * Fails the build if Supabase public env is missing (avoids shipping a broken client bundle).
 * Loads .env / .env.local like local dev; on Vercel, variables come from the dashboard.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { resolveSupabasePublicApiKey, resolveSupabaseUrl } from "./supabase-env-resolve.mjs";

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

const url = resolveSupabaseUrl();
const apiKey = resolveSupabasePublicApiKey();

if (!url || !apiKey) {
  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("  BUILD BLOCKED: Missing Supabase environment variables");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error("  Set in Vercel → Project → Settings → Environment Variables");
  console.error('  (check Production and Preview), then redeploy.');
  console.error("");
  console.error("  Any ONE of these pairs is enough:");
  console.error("    • NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("    • NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (Vercel Marketplace)");
  console.error("    • SUPABASE_URL + SUPABASE_ANON_KEY");
  console.error("    • SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY");
  console.error("");
  console.error("  Values: Supabase → Project Settings → API (Project URL + anon/publishable key).");
  console.error("  Never use SUPABASE_SERVICE_ROLE_KEY in the app client.");
  console.error("");
  console.error("  Local: copy .env.example → .env.local");
  console.error("");
  process.exit(1);
}
