import type { NextConfig } from "next";
import { contentSecurityPolicy, securityHeaders } from "./src/lib/security/headers";
import { env } from "./src/lib/env";

void env; // Validate before serving, including production start.

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // One extra byte lets proxy distinguish an oversized body from a valid 16 KB one.
  experimental: { proxyClientMaxBodySize: 16 * 1024 + 1 },
  // Nonces require request-time rendering; a prerendered shell cannot carry a fresh nonce.
  cacheComponents: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      ...securityHeaders,
      { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    ] }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
