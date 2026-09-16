import { getSiteUrl, DEFAULT_CANONICAL_ORIGIN } from "../src/lib/site-url";
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

async function verify() {
  console.log("\n=== Verifying Canonical Origin & URL Normalization ===");

  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    // Test 1: Empty / undefined falls back to default canonical origin
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert(getSiteUrl() === DEFAULT_CANONICAL_ORIGIN, "Empty env falls back to www.pagepod.dev");

    // Test 2: Apex domain pagepod.dev is normalized to www.pagepod.dev to prevent 308 redirect loop
    process.env.NEXT_PUBLIC_SITE_URL = "https://pagepod.dev";
    assert(getSiteUrl() === "https://www.pagepod.dev", "Apex https://pagepod.dev is normalized to https://www.pagepod.dev");

    process.env.NEXT_PUBLIC_SITE_URL = "https://pagepod.dev/";
    assert(getSiteUrl() === "https://www.pagepod.dev", "Trailing slash apex https://pagepod.dev/ is normalized");

    // Test 3: Preserves local development URLs
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert(getSiteUrl() === "http://localhost:3000", "Local dev URL is preserved without alteration");

    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/";
    assert(getSiteUrl() === "http://localhost:3000", "Trailing slash removed for local dev URL");

    // Test 4: Preserves self-hosted custom domains
    process.env.NEXT_PUBLIC_SITE_URL = "https://my-custom-portal.org";
    assert(getSiteUrl() === "https://my-custom-portal.org", "Custom self-hosted domain is preserved");

    // Test 5: Verify sitemap.ts imports and uses getSiteUrl
    const sitemapPath = path.resolve(__dirname, "../src/app/sitemap.ts");
    const sitemapCode = fs.readFileSync(sitemapPath, "utf-8");
    assert(sitemapCode.includes("getSiteUrl"), "sitemap.ts imports and uses getSiteUrl");

    // Test 6: Verify robots.ts imports and uses getSiteUrl
    const robotsPath = path.resolve(__dirname, "../src/app/robots.ts");
    const robotsCode = fs.readFileSync(robotsPath, "utf-8");
    assert(robotsCode.includes("getSiteUrl"), "robots.ts imports and uses getSiteUrl");

    // Test 7: Verify layout.tsx imports and uses getSiteUrl
    const layoutPath = path.resolve(__dirname, "../src/app/layout.tsx");
    const layoutCode = fs.readFileSync(layoutPath, "utf-8");
    assert(layoutCode.includes("getSiteUrl"), "layout.tsx imports and uses getSiteUrl");

  } finally {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  }

  console.log("\n========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

verify();
