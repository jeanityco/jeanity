/**
 * Resolves Supabase URL + browser-safe API key from any common env name.
 * Keep in sync with next.config.ts and src/lib/supabase/publicEnv.ts.
 */
export function resolveSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || ""
  );
}

/** Anon (legacy) or publishable default key — never SUPABASE_SERVICE_ROLE_KEY. */
export function resolveSupabasePublicApiKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}
