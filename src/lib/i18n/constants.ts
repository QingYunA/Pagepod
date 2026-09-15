import type { Locale } from "./translations";

export const LOCALE_COOKIE_NAME = "html_manager_locale";
export const LOCALE_HEADER_NAME = "x-locale";
export const LOCALE_COOKIE_MAX_AGE = 31536000; // 1 year
export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: readonly Locale[] = ["zh", "en"] as const;
