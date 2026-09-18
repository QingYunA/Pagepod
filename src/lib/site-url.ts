/**
 * Canonical Site URL Resolver & Origin Normalizer
 * 
 * Enforces https://www.pagepod.dev as the canonical production origin,
 * preventing circular 308 redirects in Next.js metadataBase, sitemap.xml,
 * robots.txt, and canonical link tags.
 */

export const DEFAULT_CANONICAL_ORIGIN = "https://www.pagepod.dev";

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!envUrl) {
    return DEFAULT_CANONICAL_ORIGIN;
  }

  // Strip trailing slash
  const cleanUrl = envUrl.replace(/\/+$/, "");

  // Prevent apex domain redirect loop for Pagepod
  // Vercel routes apex (pagepod.dev) -> 308 -> www.pagepod.dev
  if (
    cleanUrl === "https://pagepod.dev" ||
    cleanUrl === "http://pagepod.dev" ||
    cleanUrl === "//pagepod.dev"
  ) {
    return DEFAULT_CANONICAL_ORIGIN;
  }

  return cleanUrl;
}
