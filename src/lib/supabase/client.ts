import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/publicEnv";

/**
 * Single browser client for the whole app. Stored on globalThis so HMR does not
 * create a second GoTrueClient (which fights over the same storage lock).
 */
const globalForSupabase = globalThis as unknown as {
  __jeanitySupabaseClient?: ReturnType<typeof createBrowserClient>;
};

/**
 * In dev, React Strict Mode mounts → unmount → remount. GoTrue's default
 * `navigator.locks` mutex then often hits the 5s timeout ("orphaned lock").
 * A no-op lock removes that noise; production keeps the real lock for multi-tab safety.
 */
const browserClientOptions =
  process.env.NODE_ENV === "development"
    ? {
        auth: {
          lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) =>
            fn(),
        },
      }
    : undefined;

export function getSupabaseBrowserClient() {
  if (!globalForSupabase.__jeanitySupabaseClient) {
    const { url, anonKey } = getSupabasePublicEnv();
    globalForSupabase.__jeanitySupabaseClient = createBrowserClient(url, anonKey, browserClientOptions);
  }
  return globalForSupabase.__jeanitySupabaseClient;
}
