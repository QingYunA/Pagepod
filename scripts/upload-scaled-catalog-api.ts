#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { PROJECT_SEO_MANIFEST } from "../src/data/projects-seo/manifest";

// Configure undici proxy agent if local proxy is active
const proxyUrl =
  process.env.https_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.HTTP_PROXY;

if (proxyUrl) {
  try {
    const { setGlobalDispatcher, ProxyAgent } = require("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch {
    // Non-fatal if undici is not available
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let endpoint = process.env.PAGEPOD_ENDPOINT || "https://www.pagepod.dev";
  let token = process.env.PAGEPOD_TOKEN || "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) {
      token = args[++i];
    } else if (args[i] === "--endpoint" && args[i + 1]) {
      endpoint = args[++i];
    }
  }

  return { endpoint, token };
}

const SEARCH_DIRS = ["examples/opensource", "examples/curated", "examples"];

function resolveHtmlFile(slug: string): string | null {
  const cwd = process.cwd();
  for (const dir of SEARCH_DIRS) {
    const directMatch = path.join(cwd, dir, `${slug}.html`);
    if (fs.existsSync(directMatch)) return directMatch;
  }
  if (slug === "matrix-digital-rain") {
    const alias = path.join(cwd, "examples/matrix-rain.html");
    if (fs.existsSync(alias)) return alias;
  }
  return null;
}

async function apiRequest(endpoint: string, apiPath: string, token: string, options: RequestInit = {}, retries = 3) {
  const url = `${endpoint}${apiPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore
      }

      return { status: res.status, ok: res.ok, data };
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  [Network warning] Attempt ${attempt} failed (${(err as any)?.message || err}), retrying in 2s...`);
      await sleep(2000);
    }
  }
  return { status: 500, ok: false, data: null };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { endpoint, token } = parseArgs();

  console.log("==================================================");
  console.log("🚀 Pagepod API Catalog Ingestion Pipeline");
  console.log(`Endpoint : ${endpoint}`);
  console.log(`Token    : ${token ? `${token.slice(0, 10)}...${token.slice(-6)}` : "(NONE)"}`);
  console.log("==================================================\n");

  if (!token) {
    console.error("❌ Error: Missing API token. Run with --token pp_live_...");
    process.exit(1);
  }

  // 1. Verify User Session & Entitlement
  console.log("[1/3] Verifying API Token...");
  const meRes = await apiRequest(endpoint, "/api/user/me", token);
  if (!meRes.ok || !meRes.data?.authenticated) {
    console.error("❌ Authentication failed:", meRes.data || meRes.status);
    process.exit(1);
  }

  const user = meRes.data.user;
  console.log(`✓ Authenticated as: ${user.id} (Role: ${user.role}, Plan: ${user.planTier})\n`);

  // 2. Fetch Existing Projects
  console.log("[2/3] Fetching Existing Projects...");
  const listRes = await apiRequest(endpoint, "/api/projects?limit=100", token);
  const existingMap = new Map<string, any>();
  if (listRes.ok && Array.isArray(listRes.data?.projects)) {
    for (const p of listRes.data.projects) {
      existingMap.set(p.slug, p);
    }
    console.log(`Found ${existingMap.size} existing projects on account.\n`);
  } else {
    console.warn("⚠️ Warning: Could not list existing projects. Proceeding with caution...\n");
  }

  // 3. Process all 45 projects from manifest
  const slugs = Object.keys(PROJECT_SEO_MANIFEST);
  console.log(`[3/3] Ingesting & Verifying ${slugs.length} Projects in SEO Manifest...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const profile = PROJECT_SEO_MANIFEST[slug];
    const prefix = `[${String(i + 1).padStart(2, "0")}/${slugs.length}] [${slug}]`;

    const htmlPath = resolveHtmlFile(slug);
    if (!htmlPath) {
      console.error(`  ❌ Missing local HTML file for: ${slug}`);
      failedCount++;
      continue;
    }
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");

    const existing = existingMap.get(slug);
    if (existing) {
      // Already exists on this account, update metadata & HTML content to match latest version
      console.log(`${prefix} Updating HTML & metadata (${(htmlContent.length / 1024).toFixed(1)} KB)...`);
      const patchRes = await apiRequest(endpoint, `/api/projects/${existing.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          title: profile.headline,
          description: profile.summary,
          category: profile.category,
          language: profile.language,
          tags: [profile.category, profile.language, "opensource", "curated"],
          visibility: "public",
          htmlCode: htmlContent,
        }),
      });

      if (patchRes.ok && patchRes.data?.success) {
        console.log(`  ✓ Updated HTML & metadata successfully: ${endpoint}/p/${slug}`);
        updatedCount++;
      } else {
        console.log(`  ~ Exists (Patch status: ${patchRes.status})`);
        updatedCount++;
      }
      continue;
    }

    // New project to upload
    console.log(`${prefix} Uploading new project (${(htmlContent.length / 1024).toFixed(1)} KB)...`);

    const uploadRes = await apiRequest(endpoint, "/api/upload", token, {
      method: "POST",
      body: JSON.stringify({
        title: profile.headline,
        slug: profile.slug,
        description: profile.summary,
        category: profile.category,
        language: profile.language,
        tags: [profile.category, profile.language, "opensource", "curated"],
        visibility: "public",
        htmlContent,
      }),
    });

    if (uploadRes.ok && uploadRes.data?.success) {
      const actualSlug = uploadRes.data.slug || uploadRes.data.project?.slug || slug;
      if (actualSlug !== slug) {
        console.warn(`  ⚠️ Warning: Slug collision, actual slug is: ${actualSlug}`);
      }
      console.log(`  ✓ Created & Published: ${endpoint}/p/${actualSlug}`);
      createdCount++;
    } else {
      console.error(`  ❌ Upload failed:`, uploadRes.data?.error || uploadRes.status);
      failedCount++;
    }

    // Gentle pacing
    await sleep(250);
  }

  console.log("\n==================================================");
  console.log("🎉 Ingestion Run Finished!");
  console.log(`Total Target: ${slugs.length}`);
  console.log(`New Created : ${createdCount}`);
  console.log(`Updated     : ${updatedCount}`);
  console.log(`Failed      : ${failedCount}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal ingestion error:", err);
  process.exit(1);
});
