import type { Locale } from "./translations";
import { DEFAULT_LOCALE } from "./constants";

/**
 * Parses the HTTP Accept-Language header according to RFC 9110.
 * Handles optional whitespace around quality values (e.g. `; q=0.9` vs `;q=0.9`).
 */
export function parseAcceptLanguage(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const lower = acceptLanguage.toLowerCase();
  const parts = lower.split(",").map((item) => {
    // RFC 9110 allows whitespace around semicolon and equals: "; q=0.9"
    const [lang, qVal] = item.trim().split(/;\s*q=/i);
    let parsedQ = 1.0;
    if (qVal) {
      const num = parseFloat(qVal.trim());
      if (!isNaN(num)) {
        parsedQ = num;
      }
    }
    return {
      lang: lang.trim(),
      q: parsedQ,
    };
  });

  let maxZhQ = -1;
  let maxEnQ = -1;

  for (const part of parts) {
    if (part.lang.startsWith("zh") && part.q > maxZhQ) {
      maxZhQ = part.q;
    } else if (part.lang.startsWith("en") && part.q > maxEnQ) {
      maxEnQ = part.q;
    }
  }

  if (maxZhQ !== -1 && maxZhQ >= maxEnQ) {
    return "zh";
  }
  if (maxEnQ !== -1 && maxEnQ > maxZhQ) {
    return "en";
  }

  return DEFAULT_LOCALE;
}
