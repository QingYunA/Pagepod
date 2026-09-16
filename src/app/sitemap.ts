import type { MetadataRoute } from "next";
import { getAllProjects } from "@/db";
import { getSiteUrl } from "@/lib/site-url";

// Revalidate sitemap every 60s so newly published projects are immediately crawlable
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // Stable timestamp for static pillar routes: avoid advertising "changed now" on every crawl.
  const siteUpdatedAt = new Date();

  // Base pillar routes for Hub & Spoke architecture
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/explore/tools`,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/explore/games`,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/explore/visualization`,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/explore/prototypes`,
      lastModified: siteUpdatedAt,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: siteUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: siteUpdatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: siteUpdatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: siteUpdatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    // Quality Gate: Only expose public, non-test projects with descriptive metadata
    // Prevents low-quality placeholder pages from diluting crawl budget or triggering search penalties.
    const projects = await getAllProjects({ includePrivate: false });
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
        lastModified: p.updatedAt ? new Date(p.updatedAt) : siteUpdatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("Failed to generate project sitemap entries:", error);
  }

  return routes;
}
