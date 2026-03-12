import type { SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  return { path: filePath, publicUrl };
}

