import assert from "node:assert/strict";
import { detectHtmlLanguage } from "../src/lib/parser/language-detector";
import { uploadPayloadSchema, updateProjectInputSchema, CATEGORIES_ENUM, LANGUAGE_ENUM } from "../src/lib/validation";
import { toggleGlobalPin, createProject, ProjectForbiddenError } from "../src/lib/services/project-service";
import type { CurrentUser } from "../src/lib/auth";

console.log("\n=== 1. Heuristic Language Detection Tests ===");

// 1.1 Explicit <html lang> attributes
assert.equal(detectHtmlLanguage('<html lang="zh-CN"><body>你好世界</body></html>'), "zh", "Should detect zh-CN as zh");
assert.equal(detectHtmlLanguage('<html lang="zh-TW"><body>繁體中文</body></html>'), "zh", "Should detect zh-TW as zh");
assert.equal(detectHtmlLanguage('<html lang="en"><body>Hello world</body></html>'), "en", "Should detect en");
assert.equal(detectHtmlLanguage('<html lang="en-US"><body>Welcome to Pagepod</body></html>'), "en", "Should detect en-US as en");
assert.equal(detectHtmlLanguage('<html lang="ja"><body>こんにちは</body></html>'), "other", "Should detect ja as other");
console.log("  ✓ Explicit <html lang> detection passed");

// 1.2 Meta tags
assert.equal(detectHtmlLanguage('<html><head><meta http-equiv="Content-Language" content="zh-CN"></head><body>Page</body></html>'), "zh", "Meta Content-Language zh");
assert.equal(detectHtmlLanguage('<html><head><meta http-equiv="content-language" content="en"></head><body>Page</body></html>'), "en", "Meta content-language en");
console.log("  ✓ Meta Content-Language detection passed");

// 1.3 CJK Character Density Fallback
const chinesePage = `<html><head><title>计算器</title></head><body>这是一个包含大量中文字符的网页，用于测试在没有明确声明语言代码时的智能回退推测机制。</body></html>`;
assert.equal(detectHtmlLanguage(chinesePage), "zh", "CJK density should identify Chinese");

const englishPage = `<html><head><title>Calculator</title></head><body>This is an interactive calculator application built with Tailwind and vanilla JavaScript.</body></html>`;
assert.equal(detectHtmlLanguage(englishPage), "en", "Latin character density should identify English");
console.log("  ✓ Heuristic text density fallback passed");

console.log("\n=== 2. Category & Language Schema Validation ===");

// 2.1 Expanded taxonomy
assert.ok(CATEGORIES_ENUM.includes("ai"), "Taxonomy must include 'ai'");
assert.ok(CATEGORIES_ENUM.includes("creative"), "Taxonomy must include 'creative'");
assert.ok(CATEGORIES_ENUM.includes("tools"), "Taxonomy must include 'tools'");
assert.ok(CATEGORIES_ENUM.includes("games"), "Taxonomy must include 'games'");
assert.ok(CATEGORIES_ENUM.includes("visualization"), "Taxonomy must include 'visualization'");
assert.ok(CATEGORIES_ENUM.includes("prototypes"), "Taxonomy must include 'prototypes'");
assert.ok(CATEGORIES_ENUM.includes("animations"), "Taxonomy must include 'animations'");
assert.ok(CATEGORIES_ENUM.includes("others"), "Taxonomy must include 'others'");
assert.equal(CATEGORIES_ENUM.length, 8, "Taxonomy must have exactly 8 categories");
console.log("  ✓ Expanded 8-category taxonomy verified");

// 2.2 Language enum
assert.deepEqual([...LANGUAGE_ENUM], ["zh", "en", "other"], "Language enum must be zh, en, other");
const validUpload = uploadPayloadSchema.safeParse({
  title: "AI 聊天演示",
  slug: "ai-chat-demo",
  category: "ai",
  language: "zh",
  visibility: "public",
});
assert.ok(validUpload.success, "Valid upload payload with ai category and zh language");
if (validUpload.success) {
  assert.equal(validUpload.data.category, "ai");
  assert.equal(validUpload.data.language, "zh");
}

const invalidCategory = uploadPayloadSchema.safeParse({
  title: "非法分类",
  slug: "invalid-cat",
  category: "unsupported-category",
});
assert.ok(!invalidCategory.success, "Invalid category should be rejected by categorySchema enum");

const invalidLanguage = updateProjectInputSchema.safeParse({
  title: "更新测试",
  description: "描述",
  category: "creative",
  language: "invalid-lang",
});
assert.ok(!invalidLanguage.success, "Invalid language should be rejected");
console.log("  ✓ Zod validation schemas strictly enforce category and language enums");

console.log("\n=== 3. Trending Decay Score Verification ===");

const calculateScore = (viewCount: number, ageInHours: number) => {
  return (viewCount + 1) / Math.pow(ageInHours + 2, 1.5);
};

// 3.1 Verify calculateTrendingScore pure function
import { calculateTrendingScore } from "../src/lib/scoring";

const now = new Date();
const oneHourAgo = new Date(now.getTime() - 1 * 3600 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
const fourDaysAgo = new Date(now.getTime() - 100 * 3600 * 1000);

// Item A: 100 views, 1 hour old (Hot & Fresh)
const scoreA = calculateTrendingScore(100, oneHourAgo, now);
// Item B: 120 views, 24 hours old (Older, slightly more views)
const scoreB = calculateTrendingScore(120, oneDayAgo, now);
// Item C: 200 views, 100 hours old (Very old popular item)
const scoreC = calculateTrendingScore(200, fourDaysAgo, now);

assert.ok(scoreA > scoreB, `Fresh hot item (${scoreA.toFixed(2)}) should rank higher than day-old item (${scoreB.toFixed(2)})`);
assert.ok(scoreB > scoreC, `Day-old item (${scoreB.toFixed(2)}) should rank higher than week-old item (${scoreC.toFixed(2)})`);
console.log("  ✓ Gravity time-decay trending formula verifies age-adjusted ranking");

// 3.2 Clock drift defense: future created_at must not produce NaN or throw
const futureTime = new Date(now.getTime() + 24 * 3600 * 1000);
const scoreFuture = calculateTrendingScore(50, futureTime, now);
assert.ok(Number.isFinite(scoreFuture) && scoreFuture > 0, "Future timestamp must be guarded and finite");
console.log("  ✓ Clock drift safety defense prevents NaN and non-positive root errors");

console.log("\n=== 4. Dual-Tier Pinning RBAC Authorization ===");

const regularUser: CurrentUser = {
  id: "user-regular-123",
  email: "user@example.com",
  role: "user",
};

// 4.1 Regular user cannot toggle global pin
let regularError: unknown = null;
try {
  await toggleGlobalPin(regularUser, "proj-1");
} catch (err) {
  regularError = err;
}
assert.ok(regularError instanceof ProjectForbiddenError, "Regular user must be forbidden from toggleGlobalPin");
assert.equal((regularError as ProjectForbiddenError).statusCode, 403, "Must return HTTP 403 status code");
console.log("  ✓ Non-admin users strictly forbidden from setting global pin (HTTP 403)");

// 4.2 Regular user cannot create project with isGlobalPinned: true
let createGlobalPinError: unknown = null;
try {
  await createProject(regularUser, {
    title: "Forbidden Global Pin",
    htmlContent: "<html><body>Hello</body></html>",
    isGlobalPinned: true,
  });
} catch (err) {
  createGlobalPinError = err;
}
assert.ok(createGlobalPinError instanceof ProjectForbiddenError, "Regular user must be forbidden from createProject with isGlobalPinned: true");
assert.equal((createGlobalPinError as ProjectForbiddenError).statusCode, 403, "Must return HTTP 403 status code");
console.log("  ✓ Non-admin users strictly forbidden from creating project with isGlobalPinned (HTTP 403)");

// 4.3 Auto language detection preservation in uploadPayloadSchema
const parsedWithoutLanguage = uploadPayloadSchema.parse({
  category: "tools",
});
assert.equal(parsedWithoutLanguage.language, undefined, "language must remain undefined when omitted to allow auto-detection");

const parsedWithExplicitLanguage = uploadPayloadSchema.parse({
  category: "tools",
  language: "en",
});
assert.equal(parsedWithExplicitLanguage.language, "en", "explicit language must be respected");
console.log("  ✓ uploadPayloadSchema preserves undefined for automatic heuristic detection");

console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
