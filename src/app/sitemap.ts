import type { MetadataRoute } from "next";
import { getAllProjects } from "@/db";
import { getSiteUrl } from "@/lib/site-url";
import { AI_TOOL_PAGES } from "@/data/ai-tools";

// Keep static route timestamps stable across ISR revalidations.
const SITE_CONTENT_UPDATED_AT = new Date("2026-10-30T00:00:00Z");
const EXPLORE_CATEGORIES = [
  "tools",
  "ai",
  "games",
  "creative",
  "visualization",
  "prototypes",
  "animations",
  "others",
];

// Revalidate sitemap every 60s so newly published projects are immediately crawlable
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // Base pillar routes for Hub & Spoke architecture
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  for (const tool of Object.values(AI_TOOL_PAGES)) {
    routes.push({
      url: `${baseUrl}/ai-tools/${tool.slug}`,
      lastModified: new Date(tool.lastVerified),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  try {
    // Quality Gate: Only expose public, non-test projects with descriptive metadata
    // Prevents low-quality placeholder pages from diluting crawl budget or triggering search penalties.
    const projects = await getAllProjects({ includePrivate: false });
    const publicCategories = new Set(
      projects
        .filter((project) => project.visibility === "public")
        .map((project) => project.category),
    );

    for (const category of EXPLORE_CATEGORIES) {
      if (!publicCategories.has(category)) continue;
      routes.push({
        url: `${baseUrl}/explore/${category}`,
        lastModified: SITE_CONTENT_UPDATED_AT,
        changeFrequency: "daily",
        priority: 0.85,
      });
    }

    const isTestSlugOrTitle = (slug: string, title?: string | null) => {
      const s = (slug || "").toLowerCase();
      const t = (title || "").toLowerCase();
      return /^(test-|ping-|auth-check)/.test(s) || /^(test|ping)\b/.test(t) || s.includes("api-test");
    };

    const publicProjects = projects.filter((p) => {
      if (p.visibility !== "public") return false;
      if (isTestSlugOrTitle(p.slug, p.title)) return false;
      // Require meaningful title and description
      const hasTitle = Boolean(p.title && p.title.trim().length >= 3);
      const hasDesc = Boolean(p.description && p.description.trim().length >= 10);
      return hasTitle && hasDesc;
    });

    for (const p of publicProjects) {
      routes.push({
        url: `${baseUrl}/p/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : SITE_CONTENT_UPDATED_AT,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("Failed to generate project sitemap entries:", error);
  }

  return routes;
}
