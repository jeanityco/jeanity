\"use server\";

import { createSupabaseServerClient } from \"@/lib/supabase/server\";

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get(\"email\") || \"\").trim();
  const password = String(formData.get(\"password\") || \"\").trim();
  const name = String(formData.get(\"name\") || \"\").trim();

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get(\"email\") || \"\").trim();
  const password = String(formData.get(\"password\") || \"\").trim();

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

