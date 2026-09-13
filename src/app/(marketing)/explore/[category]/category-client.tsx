"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  ArrowLeft,
  Wrench,
  Gamepad2,
  BarChart2,
  Layers,
  Bot,
  Sparkles,
  Boxes,
} from "lucide-react";
import type { Project } from "@/db/schema";

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  tools: Wrench,
  ai: Bot,
  games: Gamepad2,
  creative: Sparkles,
  visualization: BarChart2,
  prototypes: Layers,
  animations: Sparkles,
  others: Boxes,
};

interface CategoryClientProps {
  category: string;
  categoryName: string;
  projects: Project[];
}

export default function CategoryProjectsGrid({
  category,
  categoryName,
  projects,
}: CategoryClientProps) {
  const [selectedLang, setSelectedLang] = useState<"all" | "zh" | "en" | "other">("all");
  const Icon = CATEGORY_ICONS[category] || Wrench;

  const filteredProjects = projects.filter((p) => {
    if (selectedLang === "all") return true;
    return (p.language || "zh") === selectedLang;
  });

  return (
    <div className="mb-14">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Featured {categoryName} ({filteredProjects.length})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Language filter pills */}
          <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLang("all")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLang === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang("zh")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLang === "zh"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang("en")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLang === "en"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang("other")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLang === "other"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Other
            </button>
          </div>

          <Link
            href="/explore"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to all categories</span>
          </Link>
        </div>
      </div>

      {/* Projects Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/40">
          <Icon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground mb-4">
            No public projects uploaded in {categoryName} yet.
          </p>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href="/workspace/upload">Be the first to publish</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
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
  );
}
