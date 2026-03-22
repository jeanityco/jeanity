import type { NextConfig } from "next";

/**
 * Vercel / Supabase templates sometimes use SUPABASE_URL + SUPABASE_ANON_KEY
 * without the NEXT_PUBLIC_ prefix. Next only inlines NEXT_PUBLIC_* into the
 * browser bundle, so we map the common names here at build time.
 * Never put SUPABASE_SERVICE_ROLE_KEY here.
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  // Strict Mode double-mounts every client component in dev → many parallel
  // Supabase getUser/getSession calls → GoTrue storage lock warnings + AbortError.
  reactStrictMode: false,

  // Turbopack HMR can log "Invalid message" / Object.keys(null) when the dev
  // socket sees non-JSON payloads (extensions, etc.). Use `npm run dev:webpack`
  // if HMR stays noisy; default dev script uses webpack below.

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
