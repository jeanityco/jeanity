#!/usr/bin/env node
/**
 * One-time fix for HTTP 431: removes oversized avatar (data URLs) from
 * Supabase auth user_metadata so session cookies stay small.
 *
 * Run once: node scripts/fix-431.mjs
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error(".env.local not found. Create it with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const MAX_AVATAR_LENGTH = 2000; // URLs are short; data URLs are huge

function shouldClearAvatar(avatar) {
  if (avatar == null || typeof avatar !== "string") return false;
  if (avatar.startsWith("data:")) return true;
  return avatar.length > MAX_AVATAR_LENGTH;
}

async function main() {
  console.log("Listing users...");
  let page = 1;
  const perPage = 1000;
  let totalFixed = 0;

  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers error:", error.message);
      process.exit(1);
    }
    if (!users?.length) break;

    for (const user of users) {
      const meta = user.user_metadata || {};
      const avatar = meta.avatar;
      if (!shouldClearAvatar(avatar)) continue;

      const { avatar: _, ...rest } = meta;
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...rest },
      });
      if (updateError) {
        console.error("Update failed for", user.id, updateError.message);
        continue;
      }
      console.log("Cleared oversized avatar for:", user.email || user.id);
      totalFixed++;
    }

    if (users.length < perPage) break;
    page++;
  }

  console.log("\nDone. Fixed", totalFixed, "user(s).");
  console.log("Have affected users sign out and sign back in (or clear cookies for localhost).");
}

main();
