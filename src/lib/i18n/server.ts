import { cookies, headers } from "next/headers";
import type { Locale } from "./translations";
import { LOCALE_COOKIE_NAME, LOCALE_HEADER_NAME, DEFAULT_LOCALE } from "./constants";
import { parseAcceptLanguage } from "./parser";

/**
 * Resolves the preferred locale on the server during SSR for dynamic routes.
 * Priority:
 * 1. Explicit user cookie `html_manager_locale`
 * 2. Downstream header `x-locale` (injected by edge middleware)
 * 3. Browser `accept-language` weighted comparison
 * 4. Fallback default: "en"
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (cookieLocale === "zh" || cookieLocale === "en") {
      return cookieLocale;
    }

    const headerStore = await headers();
    const edgeLocale = headerStore.get(LOCALE_HEADER_NAME);
    if (edgeLocale === "zh" || edgeLocale === "en") {
      return edgeLocale;
    }

    const acceptLanguage = headerStore.get("accept-language");
    return parseAcceptLanguage(acceptLanguage);
  } catch {
    // Graceful fallback during static build when cookies/headers cannot be resolved
  }

  return DEFAULT_LOCALE;
}
