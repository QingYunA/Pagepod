import fs from "node:fs";
import path from "node:path";
import { PROJECT_SEO_MANIFEST } from "../src/data/projects-seo/manifest";
import { getAllProjects, getProjectBySlug, updateProject as dbUpdateProject } from "../src/db";
import { createProject } from "../src/lib/services/project-service";
import { getProjectStorage } from "../src/lib/storage";
import type { CurrentUser } from "../src/lib/auth";

const SEARCH_DIRS = ["examples/opensource", "examples/curated", "examples"];

function resolveHtmlFile(slug: string): string | null {
  const cwd = process.cwd();
  for (const dir of SEARCH_DIRS) {
    const directMatch = path.join(cwd, dir, `${slug}.html`);
    if (fs.existsSync(directMatch)) {
      return directMatch;
    }
  }

  // Alias checks
  if (slug === "matrix-digital-rain") {
    const alias = path.join(cwd, "examples/matrix-rain.html");
    if (fs.existsSync(alias)) return alias;
  }

  return null;
}

async function ingestAll() {
  console.log("🚀 Starting Ingestion of Scaled Catalog (45 Authentic Open-Source Projects)...");

  const actor: CurrentUser = {
    id: "selfhost-admin",
    role: "admin",
    planTier: "pro",
  };

  const slugs = Object.keys(PROJECT_SEO_MANIFEST);
  console.log(`Found ${slugs.length} projects in SEO manifest.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const slug of slugs) {
    const profile = PROJECT_SEO_MANIFEST[slug];
    const htmlPath = resolveHtmlFile(slug);

    if (!htmlPath) {
      console.error(`❌ Missing HTML file for slug: ${slug}`);
      process.exit(1);
    }

    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    const existing = await getProjectBySlug(slug);

    if (existing) {
      // Ensure storage entry file is present
      const projectStorage = getProjectStorage(slug);
      await projectStorage.writeEntryFile(htmlContent, "index.html");

      // Update metadata & approve
      await dbUpdateProject(existing.id, {
        title: profile.headline,
        description: profile.summary,
        category: profile.category,
        language: profile.language,
        visibility: "public",
        reviewStatus: "approved",
      });

      console.log(`  ✓ Updated existing project: ${slug}`);
      updatedCount++;
    } else {
      // Ingest new project
      const newProj = await createProject(
        actor,
        {
          title: profile.headline,
          slug: profile.slug,
          description: profile.summary,
          category: profile.category,
          language: profile.language,
          tags: [profile.category, profile.language, "opensource", "curated"],
          htmlContent,
          visibility: "public",
          isPinned: false,
        },
        { skipRevalidate: true }
      );

      // Explicitly mark approved
      await dbUpdateProject(newProj.id, {
        reviewStatus: "approved",
        visibility: "public",
      });

      console.log(`  + Ingested new project: ${slug}`);
      createdCount++;
    }
  }

  console.log("\n==========================================");
  console.log(`🎉 Ingestion Complete!`);
  console.log(`  Created: ${createdCount}`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Total Catalog: ${createdCount + updatedCount} projects`);
  console.log("==========================================");

  // Verification assert
  const allProjects = await getAllProjects({ includePrivate: true });
  console.log(`Verified DB projects count: ${allProjects.length}`);
  process.exit(0);
}

ingestAll().catch((err) => {
  console.error("Fatal error during catalog ingestion:", err);
  process.exit(1);
});
