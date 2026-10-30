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

function read(relativePath: string): string {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

async function verify() {
  console.log("\n=== Verifying AI Tool Landing Pages (/ai-tools/[slug]) ===");

  const dataPath = path.join(process.cwd(), "src/data/ai-tools.ts");
  assert(fs.existsSync(dataPath), "src/data/ai-tools.ts exists");
  if (!fs.existsSync(dataPath)) return;

  const { AI_TOOL_PAGES } = await import("../src/data/ai-tools");
  const entries = Object.entries(AI_TOOL_PAGES);
  assert(entries.length > 0, "AI_TOOL_PAGES has at least one entry");
  assert("vidogrid" in AI_TOOL_PAGES, "vidogrid entry exists");

  for (const [key, page] of entries) {
    assert(page.slug === key, `[${key}] slug matches record key`);
    assert(/^[a-z0-9-]+$/.test(page.slug), `[${key}] slug is URL-safe`);
    assert(page.title.length > 0 && page.title.length <= 60, `[${key}] title is 1-60 chars`, `${page.title.length}: ${page.title}`);
    assert(
      page.description.length >= 70 && page.description.length <= 160,
      `[${key}] description is 70-160 chars`,
      `${page.description.length}: ${page.description}`,
    );
    assert(page.officialUrl.startsWith("https://"), `[${key}] officialUrl is https`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(page.lastVerified), `[${key}] lastVerified is an ISO date`);
    assert(page.keywords.length >= 3, `[${key}] has >= 3 keywords`);
    assert(page.features.length >= 3, `[${key}] has >= 3 features`);
    assert(page.howToUse.length >= 3, `[${key}] has >= 3 how-to steps`);
    assert(page.alternatives.length >= 2, `[${key}] has >= 2 alternatives`);
    assert(page.pagepodUseCase.steps.length >= 3, `[${key}] has >= 3 Pagepod use-case steps`);
    assert(page.faqs.length >= 3, `[${key}] has >= 3 FAQs`);
  }

  const pageSource = read("src/app/(marketing)/ai-tools/[slug]/page.tsx");
  assert(pageSource.length > 0, "ai-tools/[slug]/page.tsx exists");
  assert(pageSource.includes("generateStaticParams"), "page pre-renders slugs with generateStaticParams");
  assert(/dynamicParams\s*=\s*false/.test(pageSource), "page sets dynamicParams = false (unknown slugs 404)");
  assert(pageSource.includes("getSiteUrl"), "page uses getSiteUrl for canonical origin");
  // The root layout already emits a site-wide FAQPage; a second one per page is a duplicate in Search Console.
  assert(!pageSource.includes('"FAQPage"'), "page does not emit a second FAQPage JSON-LD");
  assert(pageSource.includes('"BreadcrumbList"'), "page emits BreadcrumbList JSON-LD");
  assert(!pageSource.includes("searchParams"), "page does not read searchParams (keeps static ISR)");

  const sitemapSource = read("src/app/sitemap.ts");
  assert(sitemapSource.includes("AI_TOOL_PAGES"), "sitemap includes AI_TOOL_PAGES entries");

  const robotsSource = read("src/app/robots.ts");
  assert((robotsSource.match(/"\/ai-tools\/"/g) ?? []).length >= 2, "robots allows /ai-tools/ for all crawler groups");
}

verify()
  .catch((error) => {
    failed++;
    console.error("  ✗ FAIL: verification threw", error);
  })
  .finally(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
