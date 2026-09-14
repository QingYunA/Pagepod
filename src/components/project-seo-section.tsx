import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  Code2,
  ExternalLink,
  Sparkles,
  Command,
  HelpCircle,
  Play,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/db/schema";
import type { ProjectSeoProfile } from "@/data/projects-seo/types";

function GithubIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface ProjectSeoSectionProps {
  profile: ProjectSeoProfile;
  project: Project;
  relatedProjects?: Project[];
  rawUrl: string;
}

export function ProjectSeoSection({
  profile,
  project,
  relatedProjects = [],
  rawUrl,
}: ProjectSeoSectionProps) {
  const isZh = profile.language === "zh";

  const labels = isZh
    ? {
        home: "首页",
        explore: "探索",
        overview: "作品概览",
        useCasesTitle: "核心用途与使用场景",
        shortcutsTitle: "操作指南与快捷键",
        faqTitle: "常见问题解答 (FAQ)",
        provenanceTitle: "开源出处与合规授权",
        relatedTitle: "同类作品推荐",
        viewAll: "查看全部",
        play: "运行体验",
        embedSnippet: "嵌入代码",
        offlineBadge: "纯前端安全沙箱",
        zeroInstallBadge: "免安装秒开",
        authorPrefix: "原作者",
        upstreamPrefix: "开源仓库",
        licensePrefix: "开源许可",
        sourceInspection: "源码审查",
      }
    : {
        home: "Home",
        explore: "Explore",
        overview: "Overview",
        useCasesTitle: "Key Capabilities & Use Cases",
        shortcutsTitle: "How to Use & Shortcuts",
        faqTitle: "Frequently Asked Questions (FAQ)",
        provenanceTitle: "Open Source Provenance & License",
        relatedTitle: "Related Projects",
        viewAll: "View all in",
        play: "Play",
        embedSnippet: "Embed Snippet",
        offlineBadge: "Hardened Sandbox",
        zeroInstallBadge: "Zero-Install Instant Run",
        authorPrefix: "Author",
        upstreamPrefix: "Upstream Repository",
        licensePrefix: "License",
        sourceInspection: "Inspect Source",
      };

  const embedCode = `<iframe src="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev"}/raw/${project.slug}/" width="100%" height="600" frameborder="0" sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-modals" allow="fullscreen; clipboard-write" allowfullscreen></iframe>`;

  return (
    <section
      aria-label={labels.overview}
      className="w-full bg-background border-t border-border/80 py-12 px-4 sm:px-8 transition-colors"
    >
      <div className="max-w-5xl mx-auto space-y-12">
        {/* 1. Breadcrumbs for Google hierarchy */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            {labels.home}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href="/explore" className="hover:text-foreground transition-colors">
            {labels.explore}
          </Link>
          {project.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <Link
                href={`/explore/${project.category}`}
                className="hover:text-foreground transition-colors capitalize font-medium"
              >
                {project.category}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium truncate max-w-[220px]">
            {project.title}
          </span>
        </nav>

        {/* 2. Hero Header & Overview */}
        <div className="space-y-4 pb-8 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono uppercase">
              {project.category || "Tool"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {labels.offlineBadge}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {labels.zeroInstallBadge}
            </Badge>
            {profile.license && (
              <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                {profile.license}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {project.viewCount} views
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {profile.headline}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
            {profile.summary}
          </p>

          {/* Keywords pill row */}
          {profile.secondaryKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground font-mono mr-1">
                {isZh ? "相关检索:" : "Related keywords:"}
              </span>
              {profile.secondaryKeywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Key Capabilities & Use Cases */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{labels.useCasesTitle}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.useCases.map((uc, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-border bg-card/60 space-y-2 flex flex-col justify-start"
              >
                <div className="font-medium text-foreground text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{uc.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {uc.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 4. How to Use & Shortcuts (if applicable) */}
        {profile.shortcuts && profile.shortcuts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Command className="w-4 h-4 text-primary" />
              <span>{labels.shortcutsTitle}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {profile.shortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-card/40 flex items-center justify-between gap-3 text-xs"
                >
                  <kbd className="px-2 py-1 rounded bg-muted font-mono font-medium text-foreground border border-border/80 text-xs shrink-0 shadow-xs">
                    {sc.key}
                  </kbd>
                  <span className="text-muted-foreground text-right truncate">
                    {sc.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Frequently Asked Questions (Crawler-friendly Details Accordion) */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span>{labels.faqTitle}</span>
          </h2>
          <div className="divide-y divide-border border border-border rounded-xl bg-card/40 overflow-hidden">
            {profile.faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group p-4 sm:p-5 transition-colors hover:bg-muted/30 open:bg-muted/20"
              >
                <summary className="cursor-pointer list-none font-medium text-sm text-foreground flex items-center justify-between gap-4 select-none">
                  <span className="leading-snug">{faq.question}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90 shrink-0" />
                </summary>
                <div className="pt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 mt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* 6. Open Source Provenance & Compliance Card */}
        <div className="p-5 sm:p-6 rounded-xl border border-border bg-card/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Award className="w-4 h-4 text-emerald-500" />
              <span>{labels.provenanceTitle}</span>
            </div>
            {profile.license && (
              <Badge variant="outline" className="font-mono text-xs">
                {profile.license} License
              </Badge>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            {profile.author && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                <span className="text-muted-foreground font-mono">{labels.authorPrefix}</span>
                {profile.author.url ? (
                  <a
                    href={profile.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline inline-flex items-center gap-1 truncate"
                  >
                    <span>{profile.author.name}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-medium text-foreground truncate">
                    {profile.author.name}
                  </span>
                )}
              </div>
            )}

            {profile.upstreamUrl && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                <span className="text-muted-foreground font-mono">{labels.upstreamPrefix}</span>
                <a
                  href={profile.upstreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1 truncate"
                >
                  <GithubIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">GitHub Repository</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
              <span className="text-muted-foreground font-mono">{labels.sourceInspection}</span>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline inline-flex items-center gap-1 truncate"
              >
                <Code2 className="w-3 h-3 shrink-0" />
                <span>Raw Standalone HTML</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/50">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {isZh
                  ? "遵循开源许可证声明。由 Pagepod 自动化沙箱隔离提供安全托管。"
                  : "Compliant with upstream open-source licensing. Sandboxed and hosted on Pagepod."}
              </span>
            </span>
            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-sm">
              iframe sandbox=&quot;allow-scripts...&quot;
            </code>
          </div>
        </div>

        {/* 7. Related Projects Showcase (Internal Link Powerhouse) */}
        {relatedProjects.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>
                  {labels.relatedTitle}{" "}
                  <span className="capitalize font-normal text-muted-foreground">
                    ({project.category || "General"})
                  </span>
                </span>
              </h2>
              <Link
                href={project.category ? `/explore/${project.category}` : "/explore"}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-medium"
              >
                <span>
                  {labels.viewAll} {project.category || "All"}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProjects.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/p/${rel.slug}`}
                  className="group p-4 rounded-xl border border-border bg-card hover:border-foreground/30 transition-all flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <Badge variant="outline" className="text-xs uppercase font-mono mb-2">
                      {rel.category}
                    </Badge>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground line-clamp-1 mb-1">
                      {rel.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {rel.description ||
                        (isZh
                          ? "在 Pagepod 在线安全运行此交互式 HTML 应用。"
                          : "Interactive HTML project hosted and sandboxed on Pagepod.")}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="truncate max-w-[110px]">/p/{rel.slug}</span>
                    <span className="flex items-center gap-1 text-emerald-500 font-medium shrink-0">
                      <Play className="w-3 h-3 fill-emerald-500" />
                      {labels.play}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
