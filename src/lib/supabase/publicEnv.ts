/**
 * Public Supabase credentials (safe to expose in the browser via NEXT_PUBLIC_*).
 * Fails fast with a deploy-friendly message when env is missing (e.g. Vercel).
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add both in Vercel → Project → Settings → Environment Variables (enable for Production), then redeploy. " +
        "Values: Supabase Dashboard → Project Settings → API → Project URL and anon public key.",
    );
  }
  return { url, anonKey };
}
