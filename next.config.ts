import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
