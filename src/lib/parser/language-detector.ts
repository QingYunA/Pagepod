/**
 * Heuristic HTML interface language detector.
 * Identifies whether an HTML page's visible text and meta is predominantly Chinese (zh) or English (en).
 */

export type DetectedLanguage = "zh" | "en" | "other";

export function detectHtmlLanguage(html: string): DetectedLanguage {
  if (!html || typeof html !== "string") {
    return "zh";
  }

  // 1. Check <html lang="..."> attribute
  const langMatch = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  const declaredLang = langMatch ? langMatch[1].toLowerCase().trim() : "";

  // 1.1 Check <meta http-equiv="content-language" content="...">
  const metaMatch = html.match(/<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*http-equiv=["']content-language["']/i);
  const metaLang = metaMatch ? metaMatch[1].toLowerCase().trim() : "";
  const explicitLang = declaredLang || metaLang;

  // 2. Strip script, style, comments, and markup to inspect rendered text
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ");

  // 3. Count Chinese characters vs Latin words
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g) || [];
  const latinWords = cleanText.match(/[a-zA-Z]{2,}/g) || [];

  const chineseCount = chineseChars.length;
  const latinCount = latinWords.length;

  // If explicit declaration is a third language (neither Chinese nor English)
  if (explicitLang && !explicitLang.startsWith("zh") && !explicitLang.startsWith("cn") && !explicitLang.startsWith("en") && chineseCount < 5) {
    return "other";
  }

  // If there are a substantial number of Chinese characters, it's Chinese regardless of default templates
  if (chineseCount >= 8) {
    return "zh";
  }

  // If declared as Chinese and has any Chinese character
  if (explicitLang.startsWith("zh") || explicitLang.startsWith("cn")) {
    return "zh";
  }

  // If declared as English and very few Chinese characters
  if (explicitLang.startsWith("en") && chineseCount < 3) {
    return "en";
  }

  // Ratio comparison
  if (chineseCount > 0 && latinCount < 10) {
    return "zh";
  }

  if (latinCount >= 10 && chineseCount === 0) {
    return "en";
  }

  if (chineseCount > latinCount * 0.5) {
    return "zh";
  }

  return latinCount > 0 ? "en" : "zh";
}
