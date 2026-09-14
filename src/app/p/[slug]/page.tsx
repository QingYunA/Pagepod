import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getProjectBySlugCached } from "@/lib/db-cache";
import { incrementViewCount, getAllProjects } from "@/db";
import { getStorage } from "@/lib/storage";
import { getCurrentUser, isExactProjectCreator } from "@/lib/auth";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAppealMailtoUrl } from "@/lib/moderation/types";
import { verifyProjectAccessToken } from "@/lib/services/guest-upload";
import { TokenGateInput } from "@/components/token-gate-input";
import { getProjectSeoProfile } from "@/data/projects-seo/manifest";
import { ProjectSeoSection } from "@/components/project-seo-section";
import RunnerClient from "./runner-client";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    token?: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlugCached(slug);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found on Pagepod.",
      robots: { index: false, follow: false },
    };
  }

  // If private, unlisted, guest transient, or not yet approved, disallow search engine indexing
  if (
    project.visibility === "private" ||
    project.visibility === "unlisted" ||
    project.isGuestTransient ||
    project.reviewStatus === "rejected" ||
    project.reviewStatus === "pending"
  ) {
    return {
      title:
        project.reviewStatus === "rejected"
          ? "Project Removed / 项目已违规下架 - Pagepod"
          : project.isGuestTransient
          ? `${project.title || slug} (Guest Preview) - Pagepod`
          : project.visibility === "unlisted"
          ? "Unlisted Project / 未公开保护项目 - Pagepod"
          : "Private Project / 私有保护项目 - Pagepod",
      description: "Content is not publicly indexed on Pagepod.",
      robots: { index: false, follow: false },
    };
  }

  const profile = getProjectSeoProfile(slug, project);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
  const canonicalUrl = `${siteUrl}/p/${slug}`;
  const fullMetaTitle = `${profile.headline} | Pagepod`;
  const metaDesc = profile.summary.slice(0, 160);

  return {
    title: profile.headline, // Root layout template will append " | Pagepod"
    description: metaDesc,
    keywords: [
      profile.targetKeyword,
      ...profile.secondaryKeywords,
      project.category || "tool",
      "HTML web app",
      "HTML runner",
      "Pagepod",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullMetaTitle,
      description: metaDesc,
      url: canonicalUrl,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: fullMetaTitle,
      description: metaDesc,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

async function fetchRelatedProjects(slug: string, category?: string | null) {
  try {
    const allPublic = await getAllProjects({ category: category || undefined });
    let related = allPublic
      .filter((p) => p.slug !== slug && p.visibility === "public")
      .slice(0, 4);

    if (related.length < 3) {
      const moreProjects = await getAllProjects();
      const extra = moreProjects
        .filter((p) => p.slug !== slug && p.visibility === "public" && !related.some((r) => r.slug === p.slug))
        .slice(0, 4 - related.length);
      related = [...related, ...extra];
    }
    return related;
  } catch {
    return [];
  }
}

export default async function ProjectRunnerPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const token = resolvedSearchParams.token;
  const project = await getProjectBySlugCached(slug);

  if (!project) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  // Strict Ownership: Platform admins DO NOT have permission to decrypt or peek at another user's private/encrypted project.
  // Only the exact user who created the project is granted owner rights!
  const isExactCreator = isExactProjectCreator(currentUser, project);
  const isTokenValid = verifyProjectAccessToken(project, token, isExactCreator);

  // Record the view only after the response is sent, and never for unauthorized
  // requests to a private or unlisted project. This keeps a non-critical write off the render path.
  after(() => {
    if (
      (project.visibility === "public" || isExactCreator || (project.visibility === "unlisted" && isTokenValid)) &&
      project.visibility !== "private"
    ) {
      incrementViewCount(slug).catch(() => {});
    }
  });

  let sourceCode = "";
  const storage = getStorage();

  // 1. Compliance Hard Takedown: rejected projects are blocked for all visitors
  if (project.reviewStatus === "rejected") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20 font-mono font-bold text-sm">
          451
        </div>
        <h1 className="text-base font-semibold">Project Removed / 项目已违规下架</h1>
        <p className="text-xs text-muted-foreground max-w-md mt-2 mb-6 leading-relaxed">
          {project.moderationSummary ||
            "This project was removed due to content safety and policy violations. / 该项目因违反平台安全与合规准则已被下架封禁。"}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back to Showcase / 返回画廊</Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <a href={createAppealMailtoUrl(project)}>
              Appeal / 申诉复核
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // 2. Pending Review Gate: external visitors are informed that safety check is in progress
  if (project.reviewStatus === "pending" && !isExactCreator) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20 font-mono font-bold text-xs">
          REVIEW
        </div>
        <h1 className="text-base font-semibold">Content Review in Progress / 内容安全评估中</h1>
        <p className="text-xs text-muted-foreground max-w-sm mt-2 mb-6 leading-relaxed">
          This project was recently submitted and is undergoing automated safety inspection. Please check back shortly.
          <br />
          该项目刚刚提交或更新，系统正在进行自动化安全评估，请稍候刷新访问。
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Explore Other Projects / 浏览其他项目</Link>
        </Button>
      </div>
    );
  }

  // 3. If project is explicitly private, reject unauthenticated / unauthorized access directly
  if (project.visibility === "private" && !isExactCreator) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20 font-mono font-bold text-sm">
          403
        </div>
        <h1 className="text-base font-semibold">Private Resource / 私有资源受限</h1>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5 leading-relaxed">
          This project is protected by private access control. Only the project owner can access this content.
          <br />
          该 HTML 项目已被所有者设置为完全私有保护，仅创作者登录后可访问。
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/login?from=/p/${project.slug}`}>
            Sign In to Access / 登录账号访问
          </Link>
        </Button>
      </div>
    );
  }

  // 4. If project is unlisted, require valid access token (or creator ownership)
  if (project.visibility === "unlisted" && !isTokenValid) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center antialiased">
        <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center mb-4 border border-zinc-700 font-mono font-bold text-xs">
          <Lock className="w-5 h-5 text-zinc-400" />
        </div>
        <h1 className="text-base font-semibold">Protected Unlisted Project / 未公开保护项目</h1>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5 leading-relaxed">
          This project is unlisted and requires a valid access token to run and view.
          <br />
          该项目为未公开分享，需要持有专属访问口令（Access Token）方可运行查看。
        </p>
        <TokenGateInput slug={project.slug} />
      </div>
    );
  }

  if (project.assetType === "single_html") {
    try {
      const file = await storage.getFile(`${project.storagePrefix}/${project.entryPath}`);
      if (file) {
        sourceCode = file.data.toString("utf-8");
      }
    } catch {
      sourceCode = "";
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
  const profile = getProjectSeoProfile(slug, project);
  const isPublicAndApproved =
    project.visibility === "public" && project.reviewStatus === "approved";

  const jsonLd = isPublicAndApproved
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            "@id": `${siteUrl}/p/${slug}#software`,
            name: profile.headline,
            headline: profile.headline,
            description: profile.summary,
            applicationCategory: project.category || "UtilitiesApplication",
            operatingSystem: "All",
            url: `${siteUrl}/p/${slug}`,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            author: profile.author
              ? {
                  "@type": "Person",
                  name: profile.author.name,
                  url: profile.author.url,
                }
              : {
                  "@type": "Organization",
                  name: "Pagepod Community",
                  url: siteUrl,
                },
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${siteUrl}/p/${slug}#breadcrumb`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: profile.language === "zh" ? "首页" : "Home",
                item: siteUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: profile.language === "zh" ? "探索" : "Explore",
                item: `${siteUrl}/explore`,
              },
              ...(project.category
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: project.category,
                      item: `${siteUrl}/explore/${project.category}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 4,
                      name: profile.headline,
                      item: `${siteUrl}/p/${slug}`,
                    },
                  ]
                : [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: profile.headline,
                      item: `${siteUrl}/p/${slug}`,
                    },
                  ]),
            ],
          },
          {
            "@type": "FAQPage",
            "@id": `${siteUrl}/p/${slug}#faq`,
            mainEntity: profile.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
        ],
      }
    : null;

  // Fetch related public projects for internal linking & recommendations
  const relatedProjects = await fetchRelatedProjects(slug, project.category);

  // Safe JSON-LD serialization preventing </script> breakout & XSS
  const safeJsonLdString = jsonLd
    ? JSON.stringify(jsonLd)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029")
    : null;

  return (
    <>
      {safeJsonLdString && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdString }}
        />
      )}
      <RunnerClient
        project={project}
        initialSourceCode={sourceCode}
        isOwner={isExactCreator}
        relatedProjects={relatedProjects}
        token={token}
      />
      {isPublicAndApproved && (
        <ProjectSeoSection
          profile={profile}
          project={project}
          relatedProjects={relatedProjects}
          rawUrl={`/raw/${project.slug}/`}
        />
      )}
    </>
  );
}
