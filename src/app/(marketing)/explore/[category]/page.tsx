import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllProjects } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play, Wrench, Gamepad2, BarChart2, Layers, ArrowLeft, Bot, Sparkles, Boxes } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

const CATEGORY_MAP: Record<
  string,
  {
    nameEn: string;
    nameZh: string;
    desc: string;
    icon: typeof Wrench;
    keywords: string[];
  }
> = {
  tools: {
    nameEn: "AI Tools & Utilities",
    nameZh: "实用工具与计算器",
    desc: "Interactive calculators, text formatters, image converters, and daily AI developer utilities. Fast sandboxed execution.",
    icon: Wrench,
    keywords: ["AI Tools Online", "Free Calculators", "Web Utilities", "HTML Tools", "Developer Utilities"],
  },
  ai: {
    nameEn: "AI & Intelligent Agents",
    nameZh: "AI 与大模型应用",
    desc: "Interactive LLM web wrappers, prompt engineering sandboxes, conversational UI mockups, and AI agents.",
    icon: Bot,
    keywords: ["AI Web Apps", "LLM Frontend", "Agent Sandbox", "AI Tools Online", "Prompt Studio"],
  },
  games: {
    nameEn: "Web Mini Games & Canvas",
    nameZh: "网页微游戏与交互",
    desc: "Play fun canvas mini games, puzzles, arcade retro games, and interactive web animations created with AI.",
    icon: Gamepad2,
    keywords: ["Free Web Games", "HTML5 Mini Games", "Canvas Games Sandbox", "AI Generated Games"],
  },
  creative: {
    nameEn: "Creative Coding & 3D",
    nameZh: "创意编程与 3D",
    desc: "WebGL experiments, Three.js shaders, generative generative canvas art, and creative visual simulations.",
    icon: Sparkles,
    keywords: ["Creative Coding", "WebGL Sandbox", "Three.js Demos", "Generative Art", "Shader Art"],
  },
  visualization: {
    nameEn: "Data Visualizations & Charts",
    nameZh: "数据可视化与仪表盘",
    desc: "Dynamic charts, financial statistics dashboards, interactive graphs, and 3D visual experiments.",
    icon: BarChart2,
    keywords: ["Data Visualization", "Interactive Charts", "Web Dashboards", "Statistics Graphics"],
  },
  prototypes: {
    nameEn: "UI Prototypes & Mockups",
    nameZh: "页面原型与交互演示",
    desc: "Frontend interface prototypes, responsive mockups, landing page designs, and micro-interactions.",
    icon: Layers,
    keywords: ["UI Prototypes", "Web Mockups", "Frontend Demos", "AI Landing Page Prototypes"],
  },
  animations: {
    nameEn: "Motion & Interactive Demos",
    nameZh: "动效演示与交互设计",
    desc: "Fluid CSS/SVG animations, micro-interactions, canvas transitions, and UI motion studies.",
    icon: Sparkles,
    keywords: ["Web Animations", "CSS Motion", "SVG Effects", "Interactive Demos"],
  },
  others: {
    nameEn: "Showcase Collections",
    nameZh: "其他精选作品",
    desc: "Explore miscellaneous creative web applications, experimental single-page tools, and shared sandboxes.",
    icon: Boxes,
    keywords: ["HTML Sandbox", "Web Apps", "Static Hosting", "Pagepod Showcase"],
  },
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((category) => ({ category }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const catInfo = CATEGORY_MAP[category];

  if (!catInfo) {
    return {
      title: "Category Not Found",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
  const title = `${catInfo.nameEn} - Online AI Sandbox`;

  return {
    title,
    description: catInfo.desc,
    keywords: catInfo.keywords,
    alternates: {
      canonical: `/explore/${category}`,
      languages: {
        "en-US": `/explore/${category}`,
        "zh-CN": `/explore/${category}`,
      },
    },
    openGraph: {
      title: `${title} | Pagepod`,
      description: catInfo.desc,
      url: `${siteUrl}/explore/${category}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pagepod`,
      description: catInfo.desc,
    },
  };
}

export const revalidate = 60;

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const catInfo = CATEGORY_MAP[category];

  if (!catInfo) {
    notFound();
  }

  const allProjects = await getAllProjects({ includePrivate: false, category });
  const publicProjects = allProjects.filter((p) => p.visibility === "public");
  const Icon = catInfo.icon;

  const otherCategories = Object.entries(CATEGORY_MAP).filter(([k]) => k !== category);

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 w-full">
        {/* Breadcrumb Navigation for SEO */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href="/explore" className="hover:text-foreground transition-colors">
            Explore
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">{catInfo.nameEn}</span>
        </nav>

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-10 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-foreground text-background">
                <Icon className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {catInfo.nameEn}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {catInfo.desc}
            </p>
          </div>

          <Button asChild size="sm" className="h-8 text-xs shrink-0 font-medium">
            <Link href="/workspace/upload">
              Upload in {category}
            </Link>
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-foreground">
              Featured {catInfo.nameEn} ({publicProjects.length})
            </h2>
            <Link href="/explore" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              <span>Back to all categories</span>
            </Link>
          </div>

          {publicProjects.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/40">
              <Icon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground mb-4">
                No public projects uploaded in {catInfo.nameEn} yet.
              </p>
              <Button asChild size="sm" className="h-8 text-xs">
                <Link href="/workspace/upload">Be the first to publish</Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {publicProjects.map((project) => (
                <div
                  key={project.id}
                  className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-foreground/30 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {project.category}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {project.viewCount} views
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground line-clamp-1 mb-1.5">
                      <Link href={`/p/${project.slug}`}>
                        {project.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                      {project.description || "Interactive AI single-page application hosted on Pagepod."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/80">
                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">
                      /p/{project.slug}
                    </span>

                    <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1 px-2.5">
                      <Link href={`/p/${project.slug}`}>
                        <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                        <span>Play</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other Categories Cross-linking (Internal Links Powerhouse) */}
        <div className="pt-8 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-mono">
            Explore Other Categories
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {otherCategories.map(([key, item]) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={key}
                  href={`/explore/${key}`}
                  className="p-3.5 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-foreground/30 transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{item.nameEn}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                </Link>
              );
            })}
          </div>
        </div>
      </main>
  );
}
