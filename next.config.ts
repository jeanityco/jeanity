import type { NextConfig } from "next";

/**
 * Map Supabase env into NEXT_PUBLIC_* for the browser. Vercel Marketplace uses
 * *_PUBLISHABLE_KEY; older setups use *_ANON_KEY. Never map SERVICE_ROLE here.
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
const supabasePublicApiKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "";

const publicEnv: Record<string, string> = {};
// Only inject when present. Injecting empty strings bakes "missing env" into the
// client bundle and can mask correct runtime configuration.
if (supabaseUrl) publicEnv.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
if (supabasePublicApiKey) publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabasePublicApiKey;

const nextConfig: NextConfig = {
  ...(Object.keys(publicEnv).length ? { env: publicEnv } : {}),
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
