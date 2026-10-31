import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/explore/", "/raw/*/screenshot.png", "/raw/*/screenshot.webp"],
        disallow: ["/workspace/", "/admin/", "/api/", "/auth/", "/raw/"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Applebot-Extended"],
        allow: ["/", "/p/", "/explore/", "/raw/*/screenshot.png", "/raw/*/screenshot.webp"],
        disallow: ["/workspace/", "/admin/", "/api/", "/auth/", "/raw/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
