import type { ModerationFinding, ModerationResult } from "./types";
import { checkGeopoliticalRedlines } from "./rules/geopolitical";
import { detectPhishingHeuristics } from "./rules/phishing";
import { checkOpenAIModeration } from "./providers/openai";

export interface ProjectModerationInput {
  slug: string;
  title?: string;
  html: string;
  screenshotBuffer?: Buffer | null;
}

/**
 * Strips markup, tags, scripts, and styles to extract visible readable text from HTML documents.
 */
export function extractVisibleText(html: string): string {
  if (!html) return "";

  // 1. Remove scripts, styles, and comments
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // 2. Extract <title> and <meta name="description"> content with priority
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // 3. Remove all remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // 4. Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // 5. Compress multiple whitespace/newlines
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return `${title} ${cleaned}`.trim();
}

/**
 * Unified Multimodal Moderation Seam.
 * Executes deterministic local defense rules (phishing & geopolitical redlines)
 * and orchestrates asynchronous cloud AI safety evaluation.
 */
export async function moderateProjectContent(
  input: ProjectModerationInput
): Promise<ModerationResult> {
  const { title = "", html, screenshotBuffer } = input;
  const visibleText = `${title} ${extractVisibleText(html)}`.trim();

  // --- Step 1: Phishing & Credential Theft Heuristics (Instant Local Defense) ---
  const phishingFinding = detectPhishingHeuristics(html);
  if (phishingFinding) {
    return {
      action: "critical_block",
      reviewStatus: "rejected",
      category: phishingFinding.category,
      reason: phishingFinding.reason,
      matchedKeywords: phishingFinding.matchedKeywords,
    };
  }

  // --- Step 2: High-Risk Geopolitical & Subversion Redlines (Instant Local Defense) ---
  const geopoliticalFinding = checkGeopoliticalRedlines(visibleText);
  if (geopoliticalFinding) {
    return {
      action: "flagged_controversy",
      reviewStatus: "flagged",
      category: geopoliticalFinding.category,
      reason: geopoliticalFinding.reason,
      matchedKeywords: geopoliticalFinding.matchedKeywords,
    };
  }

  // --- Step 3: Cloud Multimodal AI Moderation (OpenAI / omni-moderation-latest) ---
  const screenshotBase64 = screenshotBuffer ? screenshotBuffer.toString("base64") : undefined;
  const aiFinding = await checkOpenAIModeration(visibleText, screenshotBase64);
  if (aiFinding) {
    if (aiFinding.severity === "warning_remedial") {
      return {
        action: "flagged_controversy",
        reviewStatus: "flagged",
        category: aiFinding.category,
        reason: aiFinding.reason,
        matchedKeywords: aiFinding.matchedKeywords,
      };
    }
    return {
      action: "critical_block",
      reviewStatus: "rejected",
      category: aiFinding.category,
      reason: aiFinding.reason,
      matchedKeywords: aiFinding.matchedKeywords,
    };
  }

  // --- Step 4: Approved ---
  return {
    action: "pass",
    reviewStatus: "approved",
  };
}
