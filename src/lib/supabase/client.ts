import { createBrowserClient } from "@supabase/ssr";

/**
 * Single browser client for the whole app. Stored on globalThis so HMR does not
 * create a second GoTrueClient (which fights over the same storage lock).
 */
const globalForSupabase = globalThis as unknown as {
  __jeanitySupabaseClient?: ReturnType<typeof createBrowserClient>;
};

export function getSupabaseBrowserClient() {
  if (!globalForSupabase.__jeanitySupabaseClient) {
    globalForSupabase.__jeanitySupabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return globalForSupabase.__jeanitySupabaseClient;
}
