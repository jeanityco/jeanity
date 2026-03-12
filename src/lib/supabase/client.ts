import { createBrowserClient } from "@supabase/ssr";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

let browserClient = createSupabaseBrowserClient();

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;

