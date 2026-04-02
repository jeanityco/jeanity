/**
 * Public Supabase credentials (browser-safe). See scripts/supabase-env-resolve.mjs for names.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase URL or public API key. Configure env in Vercel (see DEPLOY.md), then redeploy.",
    );
  }
  return { url, anonKey };
}

export function getSupabasePublicEnvOrNull(): { url: string; anonKey: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
