import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

async function runFeedbackLoop() {
  console.log("\n=== Diagnosing & Verifying Category Navigation on /explore ===");

  const exploreClientPath = path.resolve(__dirname, "../src/app/(marketing)/explore/explore-client.tsx");
  const content = fs.readFileSync(exploreClientPath, "utf-8");

  // 1. Check for illegal nested interactive controls: <button> containing <Link>
  const hasButtonWrapper = /categoryCards\.map\(\(cat\)\s*=>\s*\{[\s\S]*?<button[\s\S]*?key=\{cat\.id\}/.test(content);
  const hasNestedLinkInsideButton = /<button[\s\S]*?<Link[^>]*href=\{`\/explore\/\$\{cat\.id\}`\}[\s\S]*?<\/button>/.test(content);
  
  assert(!hasButtonWrapper, "Category card root element should NOT be a <button>", 
    hasButtonWrapper ? "Found <button> wrapping category card which traps clicks and prevents natural link navigation." : undefined);

  assert(!hasNestedLinkInsideButton, "Category card must NOT nest <Link> inside <button> (DOM nesting violation)",
    hasNestedLinkInsideButton ? "Found <Link> nested inside <button>, violating HTML5 interactive content rules." : undefined);

  // 2. The entire category card should navigate to /explore/${cat.id} so clicking anywhere (titles, desc, body) works
  const hasCardLink = /<Link[^>]*key=\{cat\.id\}[^>]*href=\{`\/explore\/\$\{cat\.id\}`\}/.test(content) ||
                      /<Link[^>]*href=\{`\/explore\/\$\{cat\.id\}`\}[^>]*key=\{cat\.id\}/.test(content);

  assert(hasCardLink, "The entire category card must be a <Link> navigating to /explore/${cat.id}",
    !hasCardLink ? "Category card is not a full-area Link; users cannot click 'tools', 'games' text to navigate." : undefined);

  // 3. Check that titles and body don't have conflicting event handlers preventing navigation
  const hasClickSuppression = /onClick=\{[^\}]*setSelectedCategory/.test(content);
  assert(!hasClickSuppression, "Category card should navigate directly instead of intercepting clicks with local state suppression",
    hasClickSuppression ? "Found onClick setSelectedCategory intercepting card clicks." : undefined);

  // 4. Verify category IDs match the routes defined in /explore/[category]
  const categoryPagePath = path.resolve(__dirname, "../src/app/(marketing)/explore/[category]/page.tsx");
  const categoryPageContent = fs.readFileSync(categoryPagePath, "utf-8");

  const expectedCategories = ["ai", "tools", "creative", "games", "visualization", "prototypes"];
  for (const catId of expectedCategories) {
    const isSupportedInMap = categoryPageContent.includes(`${catId}: {`);
    assert(isSupportedInMap, `Category '${catId}' is formally supported in /explore/[category] route map`);
  }

  // 5. Visual indicator & hover feedback exists
  const hasHoverEffect = /group-hover:translate-x/.test(content);
  assert(hasHoverEffect, "Category card contains responsive hover micro-motion on arrow indicator");

  // 6. Category detail page must be fully static ISR (No searchParams de-opt)
  const hasSearchParamsDeOpt = /searchParams/.test(categoryPageContent);
  assert(!hasSearchParamsDeOpt, "/explore/[category]/page.tsx must NOT access searchParams (preserves Static/ISR caching)",
    hasSearchParamsDeOpt ? "Found searchParams in page.tsx which forces dynamic SSR and bypasses CDN caching." : undefined);

  const hasGenerateStaticParams = /export\s+function\s+generateStaticParams/.test(categoryPageContent);
  assert(hasGenerateStaticParams, "/explore/[category]/page.tsx exports generateStaticParams for SSG");

  const hasRevalidate = /export\s+const\s+revalidate\s*=\s*60/.test(categoryPageContent);
  assert(hasRevalidate, "/explore/[category]/page.tsx exports revalidate = 60 for ISR");

  // 7. DB Cold Start Guard: autoApproveLegacyProjects must not run proactive ensurePostgresTables()
  const dbIndexContent = fs.readFileSync(path.resolve(__dirname, "../src/db/index.ts"), "utf-8");
  const autoApproveStart = dbIndexContent.indexOf("export async function autoApproveLegacyProjects");
  const autoApproveEnd = dbIndexContent.indexOf("async function ensurePostgresTables");
  const autoApproveChunk = dbIndexContent.slice(autoApproveStart, autoApproveEnd);
  const hasColdStartDDLInAutoApprove = /await\s+ensurePostgresTables\(\)/.test(autoApproveChunk);
  assert(!hasColdStartDDLInAutoApprove, "autoApproveLegacyProjects must NOT proactively execute ensurePostgresTables() (0 Cold Start DDL)",
    hasColdStartDDLInAutoApprove ? "Found await ensurePostgresTables() call in autoApproveLegacyProjects, which blocks cold start." : undefined);

  console.log(`\nFeedback loop test summary: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runFeedbackLoop().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
