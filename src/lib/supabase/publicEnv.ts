/**
 * Public Supabase credentials (safe to expose in the browser via NEXT_PUBLIC_*).
 * Fails fast with a deploy-friendly message when env is missing (e.g. Vercel).
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase URL or anon key. In Vercel add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "or SUPABASE_URL + SUPABASE_ANON_KEY (Production scope), then redeploy. " +
        "Supabase → Project Settings → API.",
    );
  }
  return { url, anonKey };
}
