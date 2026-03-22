"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Clears the Supabase session cookies (e.g. from a Server Action after logout). */
export async function signOutServer() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
