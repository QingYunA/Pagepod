"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  Edit3,
  Trash2,
  Pin,
  Camera,
  FileCode2,
  FolderArchive,
  Eye,
  Calendar,
  Share2,
  Check,
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  Layers,
  Boxes,
  Bot,
  Palette,
  Globe,
  ArrowUpDown,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import type { Project } from "@/db/schema";
import {
  togglePinAction,
  toggleGlobalPinAction,
  updateVisibilityAction,
  deleteProjectAction,
} from "@/app/actions/manage";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import HoverSandboxPreview from "@/components/hover-sandbox-preview";

interface AdminTableProps {
  initialProjects: Project[];
  isAdmin?: boolean;
  currentUserId?: string | null;
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
  others: Boxes,
};

export default function AdminTable({ initialProjects, isAdmin = false, currentUserId }: AdminTableProps) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState(initialProjects);

  const isProjectOwner = (p: Project) => {
    if (!currentUserId || currentUserId === "selfhost-admin") return true;
    if (!p.userId) return isAdmin;
    return p.userId === currentUserId;
  };
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "views" | "alpha">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pagepod_admin_view_mode");
        if (saved === "grid" || saved === "table") return saved;
      } catch {
        // Ignore
      }
    }
    return "grid";
  });
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [pendingPinAction, setPendingPinAction] = useState<{ id: string; type: "workspace" | "global" } | null>(null);
  const router = useRouter();

  const handleRegenerateScreenshot = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (capturingId) return;
    setCapturingId(id);
    try {
      const res = await fetch(`/api/projects/${id}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "capture" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToastMessage({ text: data.error || "生成截图失败", type: "error" });
      } else {
        setToastMessage({ text: "静态实景截图已更新！", type: "success" });
        router.refresh();
      }
    } catch {
      setToastMessage({ text: "网络异常，生成截图失败", type: "error" });
    } finally {
      setCapturingId(null);
    }
  };

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("pagepod_admin_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  const categories = useMemo(() => [
    { id: "all", label: t.categories.all || "全部", icon: CATEGORY_ICONS.all },
    { id: "tools", label: t.categories.tools || "实用工具", icon: CATEGORY_ICONS.tools },
    { id: "ai", label: t.categories.ai || "AI 应用", icon: CATEGORY_ICONS.ai },
    { id: "games", label: t.categories.games || "互动游戏", icon: CATEGORY_ICONS.games },
    { id: "creative", label: t.categories.creative || "创意与 3D", icon: CATEGORY_ICONS.creative },
    { id: "visualization", label: t.categories.visualization || "数据可视化", icon: CATEGORY_ICONS.visualization },
    { id: "prototypes", label: t.categories.prototypes || "页面原型", icon: CATEGORY_ICONS.prototypes },
    { id: "animations", label: t.categories.animations || "动效演示", icon: CATEGORY_ICONS.animations },
    { id: "others", label: t.categories.others || "其他", icon: CATEGORY_ICONS.others },
  ], [t]);

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // Compute item count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    projects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const filtered = useMemo(() => {
    const list = projects.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (languageFilter !== "all" && (p.language || "zh") !== languageFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });

    const pinnedList: Project[] = [];
    const unpinnedList: Project[] = [];

    list.forEach((p) => {
      if (p.isPinned) {
        pinnedList.push(p);
      } else {
        unpinnedList.push(p);
      }
    });

    pinnedList.sort((a, b) => {
      const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    unpinnedList.sort((a, b) => {
      if (sortBy === "views") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return [...pinnedList, ...unpinnedList];
  }, [projects, categoryFilter, languageFilter, search, sortBy]);

  const handleTogglePin = (id: string, current: boolean) => {
    setPendingPinAction({ id, type: "workspace" });
    startTransition(async () => {
      try {
        await togglePinAction(id, current);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, isPinned: !current, pinnedAt: !current ? new Date() : null }
              : p
          )
        );
        setToastMessage({
          text: !current
            ? t.workspace?.pinWorkspaceSuccess || "已将项目置顶至工作区首行"
            : t.workspace?.unpinWorkspaceSuccess || "已取消工作区置顶",
          type: "success",
        });
      } catch (err: unknown) {
        setToastMessage({
          text: (err as Error)?.message || t.workspace?.pinFail || "置顶操作失败",
          type: "error",
        });
      } finally {
        setPendingPinAction(null);
      }
    });
  };

  const handleToggleGlobalPin = (id: string, current: boolean) => {
    setPendingPinAction({ id, type: "global" });
    startTransition(async () => {
      try {
        await toggleGlobalPinAction(id, current);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, isGlobalPinned: !current, globalPinnedAt: !current ? new Date() : null }
              : p
          )
        );
        setToastMessage({
          text: !current
            ? t.workspace?.pinGlobalSuccess || "已将该项目置顶至全站公共首页与探索页！"
            : t.workspace?.unpinGlobalSuccess || "已取消全站置顶",
          type: "success",
        });
      } catch (err: unknown) {
        setToastMessage({
          text: (err as Error)?.message || t.workspace?.globalPinForbidden || "操作失败，仅管理员可设置全站置顶",
          type: "error",
        });
      } finally {
        setPendingPinAction(null);
      }
    });
  };

  const handleUpdateVisibility = (id: string, next: "public" | "unlisted" | "private") => {
    startTransition(async () => {
      await updateVisibilityAction(id, next);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, visibility: next } : p))
      );
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || isPending) return;
    const targetId = deleteTarget.id;
    const targetTitle = deleteTarget.title;
    setDeletingId(targetId);
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteProjectAction(targetId);
        setProjects((prev) => prev.filter((p) => p.id !== targetId));
        setDeleteTarget(null);
        setToastMessage({
          text: (t.workspace?.deleteSuccessToast || "项目 \"{title}\" 已成功删除").replace("{title}", targetTitle),
          type: "success",
        });
      } catch (err: unknown) {
        console.error("Delete project failed:", err);
        const msg = (err as Error)?.message || t.workspace?.deleteFailToast || "删除项目失败，请稍后重试";
        setDeleteError(msg);
        setToastMessage({
          text: msg,
          type: "error",
        });
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleShare = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setToastMessage({
      text: t.runner?.copied || "已复制链接",
      type: "success",
    });
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Category Pills & View Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border w-full min-w-0 max-w-full overflow-hidden">
        {/* Category Pills with Counters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full min-w-0 max-w-full">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-background/20 text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline font-mono">
            {filtered.length} / {projects.length} 项
          </span>
          <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => handleViewModeChange("grid")}
              title="卡片沙箱视图 (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => handleViewModeChange("table")}
              title="紧凑表格视图 (Table)"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search, Language Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索项目标题、Slug、标签..."
            aria-label="搜索项目标题、Slug、标签"
            className="pl-8 text-xs bg-muted/20 border-border"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Language toggle pills */}
          <div className="inline-flex items-center rounded-md border border-border bg-muted/20 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLanguageFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer",
                languageFilter === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.gallery?.languageAll || "全部语言"}
            </button>
            <button
              type="button"
              onClick={() => setLanguageFilter("zh")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer",
                languageFilter === "zh"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.gallery?.languageZh || "中文"}
            </button>
            <button
              type="button"
              onClick={() => setLanguageFilter("en")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer",
                languageFilter === "en"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.gallery?.languageEn || "English"}
            </button>
            <button
              type="button"
              onClick={() => setLanguageFilter("other")}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer",
                languageFilter === "other"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.gallery?.languageOther || "Other"}
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <Select
              aria-label={t.gallery?.sortBy || "排序方式"}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "views" | "alpha")}
              className="text-xs h-8 px-2.5 py-1 bg-muted/20 border-border w-auto"
            >
              <option value="newest">{t.gallery?.sortNewest || "最新发布"}</option>
              <option value="views">{t.gallery?.sortViews || "最多浏览"}</option>
              <option value="alpha">{t.gallery?.sortAlpha || "名称 A-Z"}</option>
            </Select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: VISUAL GRID VIEW (Card with 16:9 Miniature Live Sandbox) */}
      {viewMode === "grid" ? (
        <div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="font-medium text-foreground">没有找到匹配的 HTML 项目</p>
              <p>请尝试调整搜索关键词或分类筛选条件。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const cat = categoryMap[item.category] || categoryMap["tools"];
                const CategoryIcon = cat?.icon || Layers;

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden border-border bg-card/80 hover:border-neutral-500 transition-all duration-200 shadow-xs",
                      deletingId === item.id && "opacity-40 scale-[0.98] pointer-events-none"
                    )}
                  >
                    {/* Miniature 16:9 Sandbox Viewport with Hover-Activated Sandbox */}
                    <div className="relative aspect-video w-full bg-neutral-950 border-b border-border/60 overflow-hidden">
                      <HoverSandboxPreview
                        slug={item.slug}
                        title={item.title}
                        category={item.category}
                        fileSize={item.fileSize || 0}
                        screenshotUrl={item.screenshotUrl}
                        openRunnerText="在线运行"
                      />

                      {/* Badges on top of miniature viewport */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-20">
                        <Badge variant="subtle" className="text-[10px] gap-1 backdrop-blur-md bg-black/70 border-neutral-800 text-neutral-200">
                          <CategoryIcon className="w-3 h-3" />
                          <span>{cat?.label || item.category}</span>
                        </Badge>
                        <Badge variant="subtle" className="text-[10px] px-1.5 backdrop-blur-md bg-black/70 border-neutral-800 text-neutral-300 font-mono uppercase">
                          {item.language || "zh"}
                        </Badge>
                        {item.isPinned && (
                          <Badge variant="outline" className="text-[10px] gap-1 backdrop-blur-md bg-black/75 border-neutral-400 text-neutral-100 font-medium">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            <span>{t.workspace?.workspacePinned || "工作区置顶"}</span>
                          </Badge>
                        )}
                        {item.isGlobalPinned && (
                          <Badge variant="outline" className="text-[10px] gap-1 backdrop-blur-md bg-black/75 border-white/20 text-white font-medium">
                            <Globe className="w-2.5 h-2.5" />
                            <span>{t.workspace?.globalPinned || "全站推荐"}</span>
                          </Badge>
                        )}
                        {item.visibility === "private" && (
                          <Badge variant="outline" className="text-[10px] gap-1 backdrop-blur-md bg-black/70 border-red-900/50 text-red-300">
                            私有
                          </Badge>
                        )}
                      </div>

                      {/* Top right quick share button */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(item.slug, e)}
                        title="复制运行链接"
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors cursor-pointer z-20"
                      >
                        {copiedSlug === item.slug ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Card Body: Title, Slug, Description */}
                    <CardHeader className="p-3.5 pb-2 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/p/${item.slug}`} className="hover:underline">
                          <CardTitle className="text-sm font-semibold truncate text-foreground leading-snug">
                            {item.title}
                          </CardTitle>
                        </Link>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground truncate">
                        /p/{item.slug}
                      </div>
                      {item.description ? (
                        <CardDescription className="line-clamp-2 text-xs leading-relaxed pt-0.5 text-muted-foreground">
                          {item.description}
                        </CardDescription>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic pt-0.5">暂无描述</p>
                      )}
                    </CardHeader>

                    {/* Card Bottom: Metadata & Management Controls */}
                    <CardContent className="p-3.5 pt-0 pb-3 space-y-2.5 flex-1 flex flex-col justify-end">
                      {/* Meta stats */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-2 border-t border-border/60">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{item.viewCount || 0} 次加载</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {/* Management Row: Visibility Select & Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <Select
                          aria-label="修改可见性"
                          value={item.visibility}
                          onChange={(e) =>
                            handleUpdateVisibility(
                              item.id,
                              e.target.value as "public" | "unlisted" | "private"
                            )
                          }
                          className="text-[11px] h-7 px-2 py-0.5 max-w-[130px]"
                        >
                          <option value="public">公开 (Public)</option>
                          <option value="unlisted">仅链接 (Unlisted)</option>
                          <option value="private">私有 (Private)</option>
                        </Select>

                        <div className="flex items-center gap-0.5">
                          {(() => {
                            const isOwner = isProjectOwner(item);
                            const isPendingThisWorkspace = pendingPinAction?.id === item.id && pendingPinAction?.type === "workspace";
                            const isPendingThisGlobal = pendingPinAction?.id === item.id && pendingPinAction?.type === "global";
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={!isOwner || isPending || isPendingThisWorkspace}
                                  onClick={() => handleTogglePin(item.id, item.isPinned)}
                                  className={`h-7 w-7 rounded-sm ${
                                    !isOwner
                                      ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                      : item.isPinned
                                      ? "text-foreground bg-muted hover:bg-muted/80"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  title={
                                    !isOwner
                                      ? t.workspace?.onlyOwnerCanPinWorkspace || "仅项目所有者可切换个人工作区置顶"
                                      : item.isPinned
                                      ? t.workspace?.unpinWorkspaceTitle || "取消工作区置顶"
                                      : t.workspace?.pinWorkspaceTitle || "置顶至工作区首位"
                                  }
                                >
                                  {isPendingThisWorkspace ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Pin className={`w-3.5 h-3.5 ${item.isPinned ? "fill-current" : ""}`} />
                                  )}
                                </Button>

                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isPending || isPendingThisGlobal}
                                    onClick={() => handleToggleGlobalPin(item.id, item.isGlobalPinned ?? false)}
                                    className={`h-7 w-7 rounded-sm ${
                                      item.isGlobalPinned
                                        ? "text-foreground bg-foreground/15 border border-foreground/30 hover:bg-foreground/20"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title={
                                      item.isGlobalPinned
                                        ? t.workspace?.unpinGlobalTitle || "取消全站置顶 (公共首页推荐)"
                                        : t.workspace?.pinGlobalTitle || "设置全站置顶 (公共首页推荐)"
                                    }
                                  >
                                    {isPendingThisGlobal ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Globe className={`w-3.5 h-3.5 ${item.isGlobalPinned ? "fill-current" : ""}`} />
                                    )}
                                  </Button>
                                )}
                              </>
                            );
                          })()}

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={capturingId === item.id || isPending}
                            onClick={(e) => handleRegenerateScreenshot(item.id, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="重新生成高清静态截图"
                          >
                            {capturingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link href={`/workspace/projects/${item.id}/edit`} title="在线编辑代码">
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(item);
                            }}
                            disabled={deletingId === item.id || isPending}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            title={t.workspace?.deleteTitle || "删除项目"}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: TABLE VIEW (Enhanced with 16:9 Thumbnail Column & Loading Skeleton) */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium text-muted-foreground bg-muted/20">
                <th className="py-2.5 px-3 w-10 text-center">{t.workspace?.tableHeaderPin || "置顶"}</th>
                {isAdmin && <th className="py-2.5 px-3 w-10 text-center">{t.workspace?.tableHeaderGlobal || "全站"}</th>}
                <th className="py-2.5 px-3 w-20">预览</th>
                <th className="py-2.5 px-3">项目</th>
                <th className="py-2.5 px-3">{t.workspace?.tableHeaderCategoryLang || "分类与语言"}</th>
                <th className="py-2.5 px-3">访问量</th>
                <th className="py-2.5 px-3">可见性</th>
                <th className="py-2.5 px-3">创建时间</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-muted-foreground">
                    {t.workspace?.noProjectsFound || "暂无匹配的 HTML 项目。"}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cat = categoryMap[item.category] || categoryMap["tools"];
                  const CategoryIcon = cat?.icon || Layers;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-muted/30 transition-all duration-200",
                        deletingId === item.id && "opacity-40 pointer-events-none"
                      )}
                    >
                      {/* Workspace Pin toggle */}
                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const isOwner = isProjectOwner(item);
                          const isPendingThisWorkspace = pendingPinAction?.id === item.id && pendingPinAction?.type === "workspace";
                          return (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!isOwner || isPending || isPendingThisWorkspace}
                              onClick={() => handleTogglePin(item.id, item.isPinned)}
                              className={`h-7 w-7 rounded-sm ${
                                !isOwner
                                  ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                  : item.isPinned
                                  ? "text-foreground bg-muted hover:bg-muted/80"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              title={
                                !isOwner
                                  ? t.workspace?.onlyOwnerCanPinWorkspace || "仅项目所有者可切换个人工作区置顶"
                                  : item.isPinned
                                  ? t.workspace?.unpinWorkspaceTitle || "取消工作区置顶"
                                  : t.workspace?.pinWorkspaceTitle || "置顶至工作区首位"
                              }
                            >
                              {isPendingThisWorkspace ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Pin className={`w-3.5 h-3.5 ${item.isPinned ? "fill-current" : ""}`} />
                              )}
                            </Button>
                          );
                        })()}
                      </td>

                      {/* Admin Global Pin toggle */}
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          {(() => {
                            const isPendingThisGlobal = pendingPinAction?.id === item.id && pendingPinAction?.type === "global";
                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isPending || isPendingThisGlobal}
                                onClick={() => handleToggleGlobalPin(item.id, item.isGlobalPinned ?? false)}
                                className={`h-7 w-7 rounded-sm ${
                                  item.isGlobalPinned
                                    ? "text-foreground bg-foreground/15 border border-foreground/30 hover:bg-foreground/20"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title={
                                  item.isGlobalPinned
                                    ? t.workspace?.unpinGlobalTitle || "取消全站置顶 (公共首页推荐)"
                                    : t.workspace?.pinGlobalTitle || "设置全站置顶 (公共首页推荐)"
                                }
                              >
                                {isPendingThisGlobal ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Globe className={`w-3.5 h-3.5 ${item.isGlobalPinned ? "fill-current" : ""}`} />
                                )}
                              </Button>
                            );
                          })()}
                        </td>
                      )}

                      {/* Hover-to-Activate Sandbox Preview Thumbnail */}
                      <td className="py-3 px-3">
                        <HoverSandboxPreview
                          slug={item.slug}
                          title={item.title}
                          category={item.category}
                          fileSize={item.fileSize || 0}
                          screenshotUrl={item.screenshotUrl}
                          variant="table-cell"
                          icon={CategoryIcon}
                          openRunnerText="在线运行"
                        />
                      </td>

                      {/* Title, slug & description */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-foreground truncate">{item.title}</div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>/p/{item.slug}</span>
                          <Link href={`/p/${item.slug}`} target="_blank" className="hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Category, Language and Asset Type */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                            <CategoryIcon className="w-2.5 h-2.5 opacity-70" />
                            <span>{cat?.label || item.category}</span>
                          </Badge>
                          <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono uppercase text-muted-foreground">
                            {item.language || "zh"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            {item.assetType === "single_html" ? (
                              <FileCode2 className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <FolderArchive className="w-3 h-3 text-muted-foreground" />
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Views */}
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3 text-muted-foreground" /> {item.viewCount || 0}
                        </span>
                      </td>

                      {/* Visibility selector */}
                      <td className="py-3 px-3">
                        <Select
                          aria-label="修改可见性"
                          value={item.visibility}
                          onChange={(e) =>
                            handleUpdateVisibility(
                              item.id,
                              e.target.value as "public" | "unlisted" | "private"
                            )
                          }
                          className="text-[11px] h-auto px-2 py-1"
                        >
                          <option value="public">公开 (Public)</option>
                          <option value="unlisted">仅链接 (Unlisted)</option>
                          <option value="private">私有 (Private)</option>
                        </Select>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-muted-foreground text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
                            <Link href={`/p/${item.slug}`} target="_blank" title="在新标签页运行">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
                            <Link href={`/workspace/projects/${item.id}/edit`} title="在线编辑代码">
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={capturingId === item.id || isPending}
                            onClick={(e) => handleRegenerateScreenshot(item.id, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="重新生成高清静态截图"
                          >
                            {capturingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(item);
                            }}
                            disabled={deletingId === item.id || isPending}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            title={t.workspace?.deleteTitle || "删除项目"}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive pb-1">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                {t.workspace?.deleteTitle || "删除项目"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1 space-y-2">
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {t.workspace?.deleteConfirmText || "确定要永久删除此项目吗？此操作不可逆，将永久抹除数据库元数据及关联的所有存储资源与静态文件。"}
              </span>
              {deleteTarget && (
                <span className="block rounded-md border border-border/60 bg-muted/40 p-2.5 space-y-1 font-mono text-[11px] text-foreground">
                  <span className="block font-sans font-medium text-xs text-foreground truncate">
                    {deleteTarget.title}
                  </span>
                  <span className="block text-muted-foreground truncate">
                    /p/{deleteTarget.slug}
                  </span>
                </span>
              )}
              <span className="block text-[11px] text-destructive/85 font-normal">
                {t.workspace?.deleteWarningNote || "请谨慎操作：删除后该路由对应的页面将立刻下线，外部访问链接将无法访问。"}
              </span>
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div role="alert" className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate">{deleteError}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              className="h-8 text-xs cursor-pointer"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmDelete}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>{t.workspace?.deleting || "正在删除..."}</span>
                </>
              ) : (
                t.workspace?.confirmDelete || "确认永久删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg text-xs font-medium backdrop-blur-md",
              toastMessage.type === "success"
                ? "bg-card/95 border-border text-foreground shadow-black/10"
                : "bg-destructive/15 border-destructive/30 text-destructive shadow-destructive/10"
            )}
          >
            {toastMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span className="max-w-xs sm:max-w-sm truncate">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-0.5"
              aria-label="关闭提示"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
