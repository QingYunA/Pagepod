import type { ModerationFinding } from "../types";

/**
 * Phishing and malicious credential harvesting heuristic detector.
 */

const TARGETED_BRANDS = [
  "google",
  "apple",
  "apple id",
  "icloud",
  "microsoft",
  "office 365",
  "outlook",
  "metamask",
  "binance",
  "coinbase",
  "telegram",
  "whatsapp",
  "facebook",
  "instagram",
  "paypal",
];

const CRYPTO_DRAINER_SIGNATURES = [
  "eth_sendtransaction",
  "eth_sign",
  "personal_sign",
  "permit2",
  "wallet_watchasset",
];

export function detectPhishingHeuristics(html: string): ModerationFinding | null {
  if (!html || html.trim().length === 0) {
    return null;
  }

  const lower = html.toLowerCase();

  // 1. Check for cryptocurrency drainer patterns
  for (const sig of CRYPTO_DRAINER_SIGNATURES) {
    if (lower.includes(sig) && (lower.includes("ethereum") || lower.includes("requestaccounts") || lower.includes("connect wallet"))) {
      return {
        category: "phishing",
        severity: "critical_block",
        reason: `Detected suspected cryptocurrency wallet transaction drainer script (${sig})`,
        matchedKeywords: [sig],
      };
    }
  }

  // 2. Check for password input fields
  const hasPasswordInput = /<input[^>]*type\s*=\s*["']password["'][^>]*>/i.test(html);
  if (!hasPasswordInput) {
    return null;
  }

  // 3. If password input exists, check if page impersonates a known brand login
  const matchedBrands: string[] = [];
  for (const brand of TARGETED_BRANDS) {
    if (lower.includes(brand)) {
      matchedBrands.push(brand);
    }
  }

  // Suspicious login keywords
  const hasLoginContext =
    lower.includes("sign in") ||
    lower.includes("log in") ||
    lower.includes("login") ||
    lower.includes("verify your account") ||
    lower.includes("security checkpoint") ||
    lower.includes("enter password");

  if (matchedBrands.length > 0 && hasLoginContext) {
    return {
      category: "phishing",
      severity: "critical_block",
      reason: `Detected suspected brand impersonation phishing login form targeting: ${matchedBrands.join(", ")}`,
      matchedKeywords: matchedBrands,
    };
  }

  return null;
}
