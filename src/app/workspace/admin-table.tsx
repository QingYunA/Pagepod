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
  AlertTriangle,
  ShieldAlert,
  Loader2,
  X,
  HelpCircle,
} from "lucide-react";
import type { Project } from "@/db/schema";
import { togglePinAction, updateVisibilityAction, deleteProjectAction } from "@/app/actions/manage";
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
}

import { translations } from "@/lib/i18n/translations";

const CATEGORY_ICONS = {
  all: Layers,
  tools: Wrench,
  games: Gamepad2,
  visualization: BarChart3,
  prototypes: Smartphone,
  animations: Sparkles,
  others: Boxes,
};

function ReviewStatusBadge({
  status,
  t,
  isOverlay = false,
}: {
  status?: string | null;
  t: (typeof translations)["zh"];
  isOverlay?: boolean;
}) {
  if (!status || status === "approved") return null;

  if (status === "rejected") {
    return (
      <Badge
        variant="outline"
        className={
          isOverlay
            ? "text-[10px] gap-1 backdrop-blur-md bg-destructive/80 border-destructive text-white font-medium"
            : "text-[10px] px-1 py-0 bg-destructive/10 border-destructive/30 text-destructive font-normal"
        }
      >
        <ShieldAlert className="w-2.5 h-2.5 mr-0.5" />
        {t.moderation?.statusRejected || "违规封禁"}
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className={
          isOverlay
            ? "text-[10px] gap-1 backdrop-blur-md bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium"
            : "text-[10px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-500 font-normal"
        }
      >
        {t.moderation?.statusPending || "审核中"}
      </Badge>
    );
  }

  if (status === "flagged") {
    return (
      <Badge
        variant="outline"
        className={
          isOverlay
            ? "text-[10px] gap-1 backdrop-blur-md bg-amber-600/20 border-amber-600/40 text-amber-300 font-medium"
            : "text-[10px] px-1 py-0 bg-amber-600/10 border-amber-600/30 text-amber-600 font-normal"
        }
      >
        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
        {t.moderation?.statusFlagged || "争议受限"}
      </Badge>
    );
  }

  return null;
}

export default function AdminTable({ initialProjects }: AdminTableProps) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
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
    { id: "games", label: t.categories.games || "互动游戏", icon: CATEGORY_ICONS.games },
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
    return projects.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [projects, categoryFilter, search]);


  const handleTogglePin = (id: string, current: boolean) => {
    startTransition(async () => {
      await togglePinAction(id, current);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPinned: !current } : p))
      );
    });
  };

  const handleUpdateVisibility = (id: string, next: "public" | "private") => {
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

      {/* Search Input Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
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
                        {item.isPinned && (
                          <Badge variant="default" className="text-[10px] gap-1 bg-amber-500/90 text-black font-semibold">
                            <Pin className="w-2.5 h-2.5 fill-black" />
                            <span>置顶</span>
                          </Badge>
                        )}
                        <ReviewStatusBadge status={item.reviewStatus} t={t} isOverlay />
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
                              e.target.value as "public" | "private"
                            )
                          }
                          className="text-[11px] h-7 px-2 py-0.5 max-w-[130px]"
                        >
                          <option value="public">公开 (Public)</option>
                          <option value="private">私有 (Private)</option>
                        </Select>

                        <div className="flex items-center gap-0.5">
                          {(item.reviewStatus === "rejected" || item.reviewStatus === "flagged") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-7 w-7 text-amber-500 hover:text-amber-600"
                              title="Appeal Review / 申诉复核"
                            >
                              <a
                                href={`mailto:support@pagepod.dev?subject=${encodeURIComponent(
                                  `[Appeal] Review request for project ${item.slug}`
                                )}&body=${encodeURIComponent(
                                  `Hello Pagepod Admin,\n\nI would like to request an appeal review for my project:\n- Project ID: ${item.id}\n- Slug: ${item.slug}\n- Title: ${item.title}\n- Current Status: ${item.reviewStatus}\n- Reason/Notes:\n`
                                )}`}
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => handleTogglePin(item.id, item.isPinned)}
                            className={`h-7 w-7 rounded-sm ${
                              item.isPinned
                                ? "text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title={item.isPinned ? "取消置顶" : "置顶推荐"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${item.isPinned ? "fill-current" : ""}`} />
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
                <th className="py-2.5 px-3 w-10 text-center">置顶</th>
                <th className="py-2.5 px-3 w-20">预览</th>
                <th className="py-2.5 px-3">项目</th>
                <th className="py-2.5 px-3">分类与格式</th>
                <th className="py-2.5 px-3">访问量</th>
                <th className="py-2.5 px-3">可见性</th>
                <th className="py-2.5 px-3">创建时间</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    暂无匹配的 HTML 项目。
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
                      {/* Pin toggle */}
                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => handleTogglePin(item.id, item.isPinned)}
                          className={`h-7 w-7 rounded-sm ${
                            item.isPinned
                              ? "text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={item.isPinned ? "取消置顶" : "置顶推荐"}
                        >
                          <Pin className={`w-3.5 h-3.5 ${item.isPinned ? "fill-current" : ""}`} />
                        </Button>
                      </td>

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
                        <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                          <ReviewStatusBadge status={item.reviewStatus} t={t} />
                        </div>
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

                      {/* Category and Asset Type */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                            <CategoryIcon className="w-2.5 h-2.5 opacity-70" />
                            <span>{cat?.label || item.category}</span>
                          </Badge>
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            {item.assetType === "single_html" ? (
                              <FileCode2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            ) : (
                              <FolderArchive className="w-3 h-3 text-amber-600 dark:text-amber-400" />
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
                              e.target.value as "public" | "private"
                            )
                          }
                          className="text-[11px] h-auto px-2 py-1"
                        >
                          <option value="public">公开 (Public)</option>
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
                          {(item.reviewStatus === "rejected" || item.reviewStatus === "flagged") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-7 w-7 text-amber-500 hover:text-amber-600"
                              title="Appeal Review / 申诉复核"
                            >
                              <a
                                href={`mailto:support@pagepod.dev?subject=${encodeURIComponent(
                                  `[Appeal] Review request for project ${item.slug}`
                                )}&body=${encodeURIComponent(
                                  `Hello Pagepod Admin,\n\nI would like to request an appeal review for my project:\n- Project ID: ${item.id}\n- Slug: ${item.slug}\n- Title: ${item.title}\n- Current Status: ${item.reviewStatus}\n- Reason/Notes:\n`
                                )}`}
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
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
