"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Wrench, Gamepad2, BarChart2, Layers, Sparkles, ArrowRight, ExternalLink, Play, Bot, Palette } from "lucide-react";
import type { Project } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/context";

interface ExploreClientProps {
  projects: Project[];
}

export default function ExploreClient({ projects }: ExploreClientProps) {
  const { t, locale } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<"all" | "zh" | "en" | "other">("all");

  const categoryCards = [
    {
      id: "ai",
      label: t.categories.ai,
      icon: Bot,
      count: projects.filter((p) => p.category === "ai").length,
      desc:
        locale === "zh"
          ? "LLM 客户端、Prompt 提示词生成器与 AI 对话微前端"
          : "LLM web clients, Agent prompts, and generative AI micro-apps",
    },
    {
      id: "tools",
      label: t.categories.tools,
      icon: Wrench,
      count: projects.filter((p) => p.category === "tools").length,
      desc:
        locale === "zh"
          ? "计算器、文本转换、正则与日常开发小工具"
          : "Calculators, text converters, formatters, and utilities",
    },
    {
      id: "creative",
      label: t.categories.creative,
      icon: Palette,
      count: projects.filter((p) => p.category === "creative").length,
      desc:
        locale === "zh"
          ? "Three.js、Canvas 实验、着色器 Shader 与交互设计探索"
          : "Three.js, Canvas experiments, shaders, and 3D visual designs",
    },
    {
      id: "games",
      label: t.categories.games,
      icon: Gamepad2,
      count: projects.filter((p) => p.category === "games").length,
      desc:
        locale === "zh"
          ? "2048、街机、益智解谜与各种微型网页游戏"
          : "2048, arcade, puzzles, and interactive web games",
    },
    {
      id: "visualization",
      label: t.categories.visualization,
      icon: BarChart2,
      count: projects.filter((p) => p.category === "visualization").length,
      desc:
        locale === "zh"
          ? "动态图表、数据看板与 WebGL / SVG 动效"
          : "Interactive charts, live dashboards, and WebGL experiments",
    },
    {
      id: "prototypes",
      label: t.categories.prototypes,
      icon: Layers,
      count: projects.filter((p) => p.category === "prototypes").length,
      desc:
        locale === "zh"
          ? "临时搭建的落地页、交互原型与设计稿"
          : "Landing page mockups, interactive UI demos, and prototypes",
    },
  ];

  const popularTags = [
    { label: "Claude Artifacts", query: "claude" },
    { label: "ChatGPT Canvas", query: "canvas" },
    { label: "v0.dev", query: "v0" },
    { label: "Tailwind CSS", query: "tailwind" },
    { label: "React / Vue CDN", query: "react" },
    { label: "Three.js / WebGL", query: "3d" },
  ];

  const filteredProjects = projects.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (selectedLanguage !== "all" && (p.language || "zh") !== selectedLanguage) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 md:py-16">
      {/* Hero Intro */}
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {t.explore.title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.explore.desc}
        </p>
      </div>

      {/* Category Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {categoryCards.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
              className={`p-5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-foreground bg-card shadow-sm"
                  : "border-border bg-card/60 hover:border-foreground/30 hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${isSelected ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {cat.count} {t.explore.itemsCount}
                  </Badge>
                  <Link
                    href={`/explore/${cat.id}`}
                    onClick={(e) => e.stopPropagation()}
                    title="View dedicated page"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {cat.label}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {cat.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Popular Tags Section */}
      <div className="p-5 rounded-xl border border-border bg-muted/20 mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-foreground" />
            <span>{t.explore.popularTags}</span>
          </span>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/" className="gap-1">
              <span>{t.explore.viewAll}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag, idx) => (
            <Link
              key={idx}
              href={`/?q=${encodeURIComponent(tag.query)}`}
              className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              #{tag.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Filtered Projects Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {selectedCategory === "all" ? t.categories.all : categoryCards.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              ({filteredProjects.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Orthogonal Filter Pills */}
            <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedLanguage("all")}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  selectedLanguage === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.gallery?.languageAll || "全部语言"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage("zh")}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  selectedLanguage === "zh"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.gallery?.languageZh || "中文"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage("en")}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  selectedLanguage === "en"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.gallery?.languageEn || "English"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage("other")}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  selectedLanguage === "other"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.gallery?.languageOther || "Other"}
              </button>
            </div>

            {selectedCategory !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {locale === "zh" ? "显示全部专题" : "View all topics"}
              </Button>
            )}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Compass className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground mb-4">
              {locale === "zh" ? "该专题下暂无公开项目" : "No public projects under this topic yet"}
            </p>
            <Button size="sm" asChild className="h-8 text-xs">
              <Link href="/workspace/upload">
                {locale === "zh" ? "+ 上传首个作品至该专题" : "+ Publish first work here"}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-foreground/30 transition-all shadow-xs"
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
                    {project.description || "Interactive web application hosted on Pagepod."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/80">
                  <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">
                    /p/{project.slug}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1 px-2.5">
                      <Link href={`/p/${project.slug}`}>
                        <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                        <span>{t.gallery.openRunner}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link back to Showcase Gallery */}
        <div className="mt-14 p-6 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {locale === "zh" ? "想看全部作品？" : "Looking for all works?"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "zh" ? "前往画廊浏览全部列表，支持快速搜索与鼠标悬停即时试玩。" : "Visit the showcase to browse everything with instant search and hover previews."}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 h-8 text-xs">
            <Link href="/" className="gap-1.5">
              <span>{t.explore.viewAll}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
