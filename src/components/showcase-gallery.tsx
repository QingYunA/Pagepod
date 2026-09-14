"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  LayoutGrid,
  List,
  Pin,
  Eye,
  ExternalLink,
  Share2,
  Check,
  FileCode2,
  FolderArchive,
  Play,
  SlidersHorizontal,
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  Layers,
  Bot,
  Palette,
  X,
} from "lucide-react";
import type { Project } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/context";
import { calculateTrendingScore } from "@/lib/scoring";
import HoverSandboxPreview from "@/components/hover-sandbox-preview";

interface ShowcaseGalleryProps {
  initialProjects: Project[];
}

const CATEGORY_ICONS = {
  all: Layers,
  tools: Wrench,
  ai: Bot,
  games: Gamepad2,
  creative: Palette,
  visualization: BarChart3,
  prototypes: Smartphone,
  animations: Sparkles,
  others: Layers,
};

const PAGE_SIZE = 24;

export default function ShowcaseGallery({ initialProjects }: ShowcaseGalleryProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState<"all" | "zh" | "en" | "other">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"trending" | "newest" | "views" | "alpha">("trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categories = [
    { id: "all", label: t.categories.all, icon: CATEGORY_ICONS.all },
    { id: "tools", label: t.categories.tools, icon: CATEGORY_ICONS.tools },
    { id: "ai", label: t.categories.ai || "AI 应用", icon: CATEGORY_ICONS.ai },
    { id: "games", label: t.categories.games, icon: CATEGORY_ICONS.games },
    { id: "creative", label: t.categories.creative || "创意与 3D", icon: CATEGORY_ICONS.creative },
    { id: "visualization", label: t.categories.visualization, icon: CATEGORY_ICONS.visualization },
    { id: "prototypes", label: t.categories.prototypes, icon: CATEGORY_ICONS.prototypes },
    { id: "animations", label: t.categories.animations, icon: CATEGORY_ICONS.animations },
    { id: "others", label: t.categories.others, icon: CATEGORY_ICONS.others },
  ];

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    initialProjects.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((tag) => set.add(tag));
      }
    });
    return Array.from(set);
  }, [initialProjects]);

  // Filtered & Ranked projects
  const filteredProjects = useMemo(() => {
    const matched = initialProjects.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedLanguage !== "all" && (p.language || "zh") !== selectedLanguage) return false;
      if (selectedTag && (!Array.isArray(p.tags) || !p.tags.includes(selectedTag))) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        const matchSlug = p.slug.toLowerCase().includes(q);
        const matchTag = Array.isArray(p.tags) && p.tags.some((tag) => tag.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchSlug || matchTag;
      }
      return true;
    });

    const pinnedList: Project[] = [];
    const unpinnedList: Project[] = [];

    matched.forEach((p) => {
      if (p.isGlobalPinned) {
        pinnedList.push(p);
      } else {
        unpinnedList.push(p);
      }
    });

    // Pinned projects sorted by globalPinnedAt DESC
    pinnedList.sort((a, b) => {
      const aTime = a.globalPinnedAt ? new Date(a.globalPinnedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.globalPinnedAt ? new Date(b.globalPinnedAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    // Unpinned projects sorted by sortBy
    const now = Date.now();

    unpinnedList.sort((a, b) => {
      if (sortBy === "trending") {
        return calculateTrendingScore(b.viewCount, b.createdAt, now) - calculateTrendingScore(a.viewCount, a.createdAt, now);
      }
      if (sortBy === "views") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return [...pinnedList, ...unpinnedList];
  }, [initialProjects, selectedCategory, selectedLanguage, selectedTag, search, sortBy]);

  // Sliced projects for DOM virtualization / high scalability
  const displayedProjects = useMemo(() => {
    return filteredProjects.slice(0, visibleCount);
  }, [filteredProjects, visibleCount]);

  const handleShare = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full min-w-0 max-w-full border-b border-border">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedTag(null);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Control Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input + Language Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={t.gallery.searchPlaceholder}
              aria-label={t.gallery.searchPlaceholder}
              className="pl-9 text-sm bg-muted/20 border-border h-9"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="清除搜索"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language Toggle */}
          <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs self-start sm:self-auto">
            <button
              onClick={() => {
                setSelectedLanguage("all");
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLanguage === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.gallery.languageAll || "全部语言"}
            </button>
            <button
              onClick={() => {
                setSelectedLanguage("zh");
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLanguage === "zh"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.gallery.languageZh || "中文"}
            </button>
            <button
              onClick={() => {
                setSelectedLanguage("en");
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLanguage === "en"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.gallery.languageEn || "English"}
            </button>
            <button
              onClick={() => {
                setSelectedLanguage("other");
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                selectedLanguage === "other"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.gallery.languageOther || "Other"}
            </button>
          </div>
        </div>

        {/* Right: Sort Dropdown + Count + View Mode */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="flex items-center gap-1.5">
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-auto h-9 text-xs sm:text-sm bg-muted/20 border-border py-1 px-3"
              aria-label={t.gallery.sortBy || "排序方式"}
            >
              <option value="trending">{t.gallery.sortTrending || "热度推荐"}</option>
              <option value="newest">{t.gallery.sortNewest || "最新发布"}</option>
              <option value="views">{t.gallery.sortViews || "最多浏览"}</option>
              <option value="alpha">{t.gallery.sortAlpha || "名称 A-Z"}</option>
            </Select>
          </div>

          <span className="text-xs sm:text-sm text-muted-foreground hidden lg:inline whitespace-nowrap">
            {t.gallery.totalCount.replace("{count}", String(filteredProjects.length))}
          </span>

          <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setViewMode("grid")}
              title="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setViewMode("list")}
              title="List"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selected tag chip & Tag cloud */}
      {(selectedTag || allTags.length > 0) && (
        <div className="flex items-center gap-2 w-full overflow-x-auto text-xs min-w-0 max-w-full pb-1 scrollbar-none">
          {selectedTag ? (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
              <span>#{selectedTag}</span>
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="移除标签筛选"
                className="hover:text-foreground ml-1 cursor-pointer"
              >
                ×
              </button>
            </Badge>
          ) : (
            allTags.slice(0, 8).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                role="button"
                tabIndex={0}
                aria-pressed={selectedTag === tag}
                className="cursor-pointer hover:bg-muted/60 transition-colors text-muted-foreground px-2.5 py-1 text-xs"
                onClick={() => {
                  setSelectedTag(tag);
                  setVisibleCount(PAGE_SIZE);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTag(tag);
                    setVisibleCount(PAGE_SIZE);
                  }
                }}
              >
                #{tag}
              </Badge>
            ))
          )}
        </div>
      )}

      {/* Grid or List View */}
      {filteredProjects.length === 0 ? (
        <Card className="py-16 text-center border-dashed border-border/80">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{t.gallery.noProjectsTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {t.gallery.noProjectsDesc}
              </p>
            </div>
            <Button asChild size="default" variant="outline" className="mt-3">
              <Link href="/workspace/upload">{t.gallery.uploadNow}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW: High-end card with live sandboxed miniature thumbnail */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedProjects.map((p) => {
            const cat = categoryMap[p.category] || categoryMap["tools"];
            const CategoryIcon = cat.icon;

            return (
              <Card
                key={p.id}
                className="group relative flex flex-col overflow-hidden border-border bg-card/80 hover:border-neutral-400 dark:hover:border-neutral-600 transition-[border-color,box-shadow,transform] duration-200 ease-out"
              >
                {/* Miniature Thumbnail Viewport with Hover-Activated Sandbox */}
                <div className="relative aspect-video w-full bg-neutral-950 border-b border-border/60 overflow-hidden">
                  <HoverSandboxPreview
                    slug={p.slug}
                    title={p.title}
                    category={p.category}
                    fileSize={p.fileSize || 0}
                    screenshotUrl={p.screenshotUrl}
                    openRunnerText={t.gallery.openRunner}
                  />

                  {/* Badges on top of thumbnail */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-20">
                    <Badge variant="subtle" className="text-xs gap-1.5 backdrop-blur-md bg-black/60 border-neutral-800 text-neutral-200">
                      <CategoryIcon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </Badge>
                    <Badge variant="subtle" className="text-xs px-2 backdrop-blur-md bg-black/60 border-neutral-800 text-neutral-300 font-mono uppercase">
                      {p.language || "zh"}
                    </Badge>
                    {p.isGlobalPinned && (
                      <Badge variant="outline" className="text-xs gap-1.5 backdrop-blur-md bg-black/75 border-white/20 text-white font-medium">
                        <Pin className="w-3 h-3 fill-current" />
                        <span>{t.gallery.pinned || "PIN"}</span>
                      </Badge>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleShare(p.slug, e)}
                    title={t.runner.copyLink}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors cursor-pointer z-20"
                  >
                    {copiedSlug === p.slug ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Card Body */}
                <CardHeader className="p-4 pb-2 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/p/${p.slug}`}>
                      <CardTitle className="text-base font-semibold hover:underline truncate">
                        {p.title}
                      </CardTitle>
                    </Link>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    /p/{p.slug}
                  </div>
                  <CardDescription className="line-clamp-2 text-sm leading-relaxed pt-1">
                    {p.description || ""}
                  </CardDescription>
                </CardHeader>

                {/* Tags */}
                {Array.isArray(p.tags) && p.tags.length > 0 && (
                  <CardContent className="p-4 pt-0 pb-3 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((tag) => (
                      <Badge
                        key={tag}
                        variant="subtle"
                        role="button"
                        tabIndex={0}
                        aria-label={`按标签 #${tag} 筛选`}
                        className="text-xs px-2 py-0.5 cursor-pointer hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(tag);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTag(tag);
                          }
                        }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                    {p.tags.length > 4 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{p.tags.length - 4}
                      </span>
                    )}
                  </CardContent>
                )}

                {/* Card Footer */}
                <CardFooter className="p-4 pt-2.5 mt-auto border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" /> {p.viewCount || 0}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      {p.assetType === "single_html" ? (
                        <>
                          <FileCode2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> {t.gallery.singleHtml}
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t.gallery.zipBundle}
                        </>
                      )}
                    </span>
                  </div>

                  <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-xs font-medium">
                    <Link href={`/p/${p.slug}`}>
                      {t.gallery.openDirect} <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW: Clean tabular rows */
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {displayedProjects.map((p) => {
            const cat = categoryMap[p.category] || categoryMap["tools"];
            const CategoryIcon = cat.icon;
            return (
              <div
                key={p.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                    <CategoryIcon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/p/${p.slug}`}
                        className="font-medium text-sm text-foreground hover:underline truncate"
                      >
                        {p.title}
                      </Link>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono uppercase text-muted-foreground border-border">
                        {p.language || "zh"}
                      </Badge>
                      {p.isGlobalPinned && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1 border-foreground/30 bg-foreground/10 text-foreground font-medium">
                          <Pin className="w-3 h-3 fill-current" />
                          <span>{t.gallery.pinned || "PIN"}</span>
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-muted-foreground hidden md:inline">
                        /p/{p.slug}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-xl mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {p.viewCount || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="default" size="sm" className="h-8 text-xs gap-1.5 px-3" asChild>
                      <Link href={`/p/${p.slug}`}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t.gallery.openRunner}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* High-Scale Pagination / Load More (Seamlessly scales to 10,000+ items) */}
      {filteredProjects.length > visibleCount && (
        <div className="flex flex-col items-center justify-center pt-8 pb-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="h-10 px-6 text-sm font-mono border-border/80 hover:bg-muted/50 transition-all cursor-pointer shadow-xs"
          >
            <span>加载更多项目 · Load More</span>
            <span className="text-xs text-muted-foreground ml-2 font-sans">
              ({displayedProjects.length} / {filteredProjects.length})
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
