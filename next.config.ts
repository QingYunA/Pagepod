import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack does not walk up to unrelated lockfiles
  // in parent directories (which produces a build warning in some setups).
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/((?!raw(?:/|$)).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/login",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "/workspace",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/workspace/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
