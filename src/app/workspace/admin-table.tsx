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
  AlertTriangle,
  ShieldAlert,
  Loader2,
  HelpCircle,
  Folder as FolderIcon,
  ChevronRight,
  Plus,
  Inbox,
} from "lucide-react";
import type { Project, Folder } from "@/db/schema";
import { GUEST_CLAIMED_EVENT } from "@/lib/storage/guest-claim";
import {
  togglePinAction,
  toggleGlobalPinAction,
  updateVisibilityAction,
  deleteProjectAction,
  createFolderAction,
  updateFolderAction,
  deleteFolderAction,
  batchMoveProjectsAction,
  batchUpdateVisibilityAction,
  batchDeleteProjectsAction,
} from "@/app/actions/manage";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { translations } from "@/lib/i18n/translations";
import { createAppealMailtoUrl } from "@/lib/moderation/types";
import { claimUserGuestProjects } from "@/app/actions/guest";
import StaticProjectPoster from "@/components/static-project-poster";
import WorkspaceFolderTree, { type WorkspaceScope } from "./workspace-folder-tree";
import BatchActionBar from "./batch-action-bar";
import MoveFolderDialog from "./move-folder-dialog";

interface AdminTableProps {
  initialProjects: Project[];
  initialFolders?: Folder[];
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

function ReviewStatusBadge({
  status,
  isOverlay = false,
  t,
}: {
  status?: string | null;
  isOverlay?: boolean;
  t: (typeof translations)["en"];
}) {
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
        {t.moderation?.statusRejected || "Rejected"}
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
        {t.moderation?.statusPending || "Pending"}
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
        {t.moderation?.statusFlagged || "Restricted"}
      </Badge>
    );
  }

  return null;
}

export default function AdminTable({
  initialProjects,
  initialFolders = [],
  isAdmin = false,
  currentUserId,
}: AdminTableProps) {
  const { t, locale } = useLanguage();
  const isZh = locale === "zh";
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [projects, setProjects] = useState(initialProjects);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [activeScope, setActiveScope] = useState<WorkspaceScope>({ type: "all" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialogs
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // Sync props changes
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  // Seamlessly refresh table data when projects are claimed by global reconciler
  useEffect(() => {
    const handleClaimed = () => {
      router.refresh();
    };

    window.addEventListener(GUEST_CLAIMED_EVENT, handleClaimed);
    return () => window.removeEventListener(GUEST_CLAIMED_EVENT, handleClaimed);
  }, [router]);

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
    return "table"; // Default to streamlined table view
  });

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [pendingPinAction, setPendingPinAction] = useState<{ id: string; type: "workspace" | "global" } | null>(null);

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

  // Compute item count per category in current scope
  const scopedProjects = useMemo(() => {
    return projects.filter((p) => {
      if (activeScope.type === "uncategorized") return !p.folderId;
      if (activeScope.type === "pinned") return p.isPinned;
      if (activeScope.type === "folder") return p.folderId === activeScope.folderId;
      return true;
    });
  }, [projects, activeScope]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: scopedProjects.length };
    scopedProjects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [scopedProjects]);

  // Filtered & sorted list
  const filtered = useMemo(() => {
    const list = scopedProjects.filter((p) => {
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
      if (p.isPinned) pinnedList.push(p);
      else unpinnedList.push(p);
    });

    const sortFn = (a: Project, b: Project) => {
      if (sortBy === "views") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    pinnedList.sort((a, b) => {
      const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    unpinnedList.sort(sortFn);

    return [...pinnedList, ...unpinnedList];
  }, [scopedProjects, categoryFilter, languageFilter, search, sortBy]);

  // Breadcrumbs computation
  const breadcrumbs = useMemo(() => {
    const root = { label: t.workspace?.allProjects || "全部项目", scope: { type: "all" } as WorkspaceScope };
    if (activeScope.type === "all") return [root];
    if (activeScope.type === "uncategorized") {
      return [root, { label: t.workspace?.uncategorized || "未归类", scope: { type: "uncategorized" } as WorkspaceScope }];
    }
    if (activeScope.type === "pinned") {
      return [root, { label: t.workspace?.pinnedFilter || "已置顶", scope: { type: "pinned" } as WorkspaceScope }];
    }
    if (activeScope.type === "folder") {
      const chain: { label: string; scope: WorkspaceScope }[] = [];
      let currentId: string | null = activeScope.folderId;
      while (currentId) {
        const f = folders.find((item) => item.id === currentId);
        if (f) {
          chain.unshift({ label: f.name, scope: { type: "folder", folderId: f.id } });
          currentId = f.parentId;
        } else {
          break;
        }
      }
      return [root, ...chain];
    }
    return [root];
  }, [activeScope, folders, t]);

  // Multi-selection logic
  const isAllSelected = filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Folder Operations
  const handleCreateFolder = async (name: string, parentId?: string | null) => {
    startTransition(async () => {
      try {
        const created = await createFolderAction(name, parentId);
        setFolders((prev) => [...prev, created]);
        setToastMessage({ text: "文件夹创建成功", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || "创建文件夹失败", type: "error" });
      }
    });
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    startTransition(async () => {
      try {
        const updated = await updateFolderAction(folderId, { name });
        setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
        setToastMessage({ text: "重命名成功", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || "重命名失败", type: "error" });
      }
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    startTransition(async () => {
      try {
        await deleteFolderAction(folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentId !== folderId));
        // Safe unlink in local projects state
        setProjects((prev) =>
          prev.map((p) => (p.folderId === folderId ? { ...p, folderId: null } : p))
        );
        setToastMessage({ text: "文件夹已删除，内部项目已安全解绑至未归类", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || "删除文件夹失败", type: "error" });
      }
    });
  };

  // Batch Operations
  const handleBatchMoveConfirm = async (targetFolderId: string | null) => {
    startTransition(async () => {
      try {
        await batchMoveProjectsAction(selectedIds, targetFolderId);
        setProjects((prev) =>
          prev.map((p) => (selectedIds.includes(p.id) ? { ...p, folderId: targetFolderId } : p))
        );
        setSelectedIds([]);
        setToastMessage({ text: t.workspace?.batchActionSuccess || "批量移动成功！", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || t.workspace?.batchActionFailed || "批量操作失败", type: "error" });
      }
    });
  };

  const handleBatchVisibility = (visibility: "public" | "private") => {
    startTransition(async () => {
      try {
        await batchUpdateVisibilityAction(selectedIds, visibility);
        setProjects((prev) =>
          prev.map((p) => (selectedIds.includes(p.id) ? { ...p, visibility } : p))
        );
        setSelectedIds([]);
        setToastMessage({ text: t.workspace?.batchActionSuccess || "可见性已批量更新！", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || t.workspace?.batchActionFailed || "批量操作失败", type: "error" });
      }
    });
  };

  const handleBatchDeleteConfirm = async () => {
    startTransition(async () => {
      try {
        await batchDeleteProjectsAction(selectedIds);
        setProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        setBatchDeleteDialogOpen(false);
        setToastMessage({ text: "选中的项目已批量删除", type: "success" });
        router.refresh();
      } catch (err: any) {
        setToastMessage({ text: err?.message || "批量删除失败", type: "error" });
      }
    });
  };

  // Single Project Actions
  const handleTogglePin = (id: string, currentPinned: boolean) => {
    setPendingPinAction({ id, type: "workspace" });
    startTransition(async () => {
      try {
        await togglePinAction(id, currentPinned);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, isPinned: !currentPinned, pinnedAt: !currentPinned ? new Date() : null }
              : p
          )
        );
        setToastMessage({
          text: !currentPinned
            ? t.workspace?.pinWorkspaceSuccess || "已将项目置顶至工作区首行"
            : t.workspace?.unpinWorkspaceSuccess || "已取消工作区置顶",
          type: "success",
        });
      } catch {
        setToastMessage({ text: t.workspace?.pinFail || "置顶操作失败", type: "error" });
      } finally {
        setPendingPinAction(null);
      }
    });
  };

  const handleToggleGlobalPin = (id: string, currentGlobalPinned: boolean) => {
    setPendingPinAction({ id, type: "global" });
    startTransition(async () => {
      try {
        await toggleGlobalPinAction(id, currentGlobalPinned);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isGlobalPinned: !currentGlobalPinned,
                  globalPinnedAt: !currentGlobalPinned ? new Date() : null,
                }
              : p
          )
        );
        setToastMessage({
          text: !currentGlobalPinned
            ? t.workspace?.pinGlobalSuccess || "已置顶至全站公共推荐！"
            : t.workspace?.unpinGlobalSuccess || "已取消全站推荐",
          type: "success",
        });
      } catch {
        setToastMessage({ text: t.workspace?.globalPinForbidden || "操作失败", type: "error" });
      } finally {
        setPendingPinAction(null);
      }
    });
  };

  const handleUpdateVisibility = (id: string, visibility: "public" | "private") => {
    startTransition(async () => {
      try {
        await updateVisibilityAction(id, visibility);
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, visibility } : p)));
        setToastMessage({ text: `项目已转为${visibility === "public" ? "公开" : "私有"}`, type: "success" });
      } catch {
        setToastMessage({ text: "修改可见性失败", type: "error" });
      }
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteProjectAction(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        setDeleteTarget(null);
        setToastMessage({ text: t.workspace?.deleteSuccessToast || "项目已删除", type: "success" });
        router.refresh();
      } catch (err: any) {
        setDeleteError(err?.message || t.workspace?.deleteFailToast || "删除失败");
      } finally {
        setDeletingId(null);
      }
    });
  };

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

  const handleShare = async (slug: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
      setToastMessage({ text: "运行链接已复制至剪贴板", type: "success" });
    } catch {
      // Ignore
    }
  };

  // Determine current active folder ID for context-aware upload
  const uploadHref = useMemo(() => {
    if (activeScope.type === "folder") {
      return `/workspace/upload?folderId=${encodeURIComponent(activeScope.folderId)}`;
    }
    return "/workspace/upload";
  }, [activeScope]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-3.5 py-2 rounded-md shadow-lg text-xs font-medium border flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toastMessage.type === "success"
              ? "bg-foreground text-background border-border"
              : "bg-destructive text-destructive-foreground border-destructive"
          )}
        >
          {toastMessage.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* DUAL-PANE WORKSPACE LAYOUT */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* LEFT PANE: Hierarchical Folder Navigation Tree */}
        <WorkspaceFolderTree
          folders={folders}
          projects={projects}
          activeScope={activeScope}
          onSelectScope={(scope) => {
            setActiveScope(scope);
            setSelectedIds([]);
          }}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          isPending={isPending}
        />

        {/* RIGHT PANE: Scoped Projects Management Surface */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Breadcrumb & Upload Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              {breadcrumbs.map((b, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/60" />}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveScope(b.scope);
                        setSelectedIds([]);
                      }}
                      className={cn(
                        "transition-colors cursor-pointer hover:text-foreground",
                        isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {b.label}
                    </button>
                  </div>
                );
              })}
              <span className="text-[11px] font-mono text-muted-foreground ml-1.5">
                ({filtered.length} 项)
              </span>
            </div>

            {/* Context-aware Upload Button */}
            <Button size="sm" asChild className="h-8 px-3 text-xs gap-1.5 shrink-0 self-start sm:self-auto">
              <Link href={uploadHref}>
                <Plus className="w-3.5 h-3.5" />
                <span>{t.gallery?.uploadNow || "+ 发布新作品"}</span>
              </Link>
            </Button>
          </div>

          {/* Search, Language Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索项目标题、Slug、标签..."
                aria-label="搜索项目标题、Slug、标签"
                className="pl-8 text-xs bg-muted/20 border-border"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Language toggle pills */}
              <div className="inline-flex items-center rounded-md border border-border bg-muted/20 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguageFilter("all")}
                  className={cn(
                    "px-2 py-0.5 rounded-sm text-xs font-medium transition-colors cursor-pointer",
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
                    "px-2 py-0.5 rounded-sm text-xs font-medium transition-colors cursor-pointer",
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
                    "px-2 py-0.5 rounded-sm text-xs font-medium transition-colors cursor-pointer",
                    languageFilter === "en"
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.gallery?.languageEn || "English"}
                </button>
              </div>

              {/* Sort selector */}
              <Select
                aria-label={t.gallery?.sortBy || "排序方式"}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "views" | "alpha")}
                className="text-xs h-7 px-2 py-0.5 bg-muted/20 border-border w-auto"
              >
                <option value="newest">{t.gallery?.sortNewest || "最新发布"}</option>
                <option value="views">{t.gallery?.sortViews || "最多浏览"}</option>
                <option value="alpha">{t.gallery?.sortAlpha || "名称 A-Z"}</option>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/20">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6 rounded-sm"
                  onClick={() => handleViewModeChange("table")}
                  title="紧凑表格视图 (Table)"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-6 w-6 rounded-sm"
                  onClick={() => handleViewModeChange("grid")}
                  title="卡片网格视图 (Grid)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: COMPACT TABLE VIEW (With Checkbox & Pure Static 16:9 Thumbnail Poster) */}
          {viewMode === "table" ? (
            <div className="overflow-x-auto border border-border/80 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-medium text-muted-foreground bg-muted/20">
                    <th className="py-2.5 px-3 w-8 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        aria-label="全选项目"
                      />
                    </th>
                    <th className="py-2.5 px-2 w-8 text-center">{t.workspace?.tableHeaderPin || "置顶"}</th>
                    {isAdmin && <th className="py-2.5 px-2 w-8 text-center">{t.workspace?.tableHeaderGlobal || "全站"}</th>}
                    <th className="py-2.5 px-3 w-16">预览</th>
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
                      <td colSpan={isAdmin ? 10 : 9} className="py-16 text-center text-muted-foreground space-y-1">
                        <Inbox className="w-6 h-6 mx-auto opacity-50 mb-1" />
                        <p>{t.workspace?.noProjectsFound || "暂无匹配的 HTML 项目。"}</p>
                        <p className="text-[11px] text-muted-foreground/60">可尝试切换左侧文件夹或调整搜索条件。</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const cat = categoryMap[item.category] || categoryMap["tools"];
                      const CategoryIcon = cat?.icon || Layers;
                      const isSelected = selectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "hover:bg-muted/30 transition-all duration-150",
                            isSelected && "bg-muted/40",
                            deletingId === item.id && "opacity-40 pointer-events-none"
                          )}
                        >
                          {/* Multi-select Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.id)}
                              aria-label={`选择 ${item.title}`}
                            />
                          </td>

                          {/* Workspace Pin toggle */}
                          <td className="py-2.5 px-2 text-center">
                            {(() => {
                              const isOwner = isProjectOwner(item);
                              const isPendingThis = pendingPinAction?.id === item.id && pendingPinAction?.type === "workspace";
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={!isOwner || isPending || isPendingThis}
                                  onClick={() => handleTogglePin(item.id, item.isPinned)}
                                  className={cn(
                                    "h-6 w-6 rounded-sm",
                                    !isOwner
                                      ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                      : item.isPinned
                                      ? "text-foreground bg-muted hover:bg-muted/80"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title={
                                    !isOwner
                                      ? t.workspace?.onlyOwnerCanPinWorkspace || "仅项目所有者可置顶"
                                      : item.isPinned
                                      ? t.workspace?.unpinWorkspaceTitle || "取消工作区置顶"
                                      : t.workspace?.pinWorkspaceTitle || "置顶至工作区首位"
                                  }
                                >
                                  {isPendingThis ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Pin className={cn("w-3 h-3", item.isPinned && "fill-current")} />
                                  )}
                                </Button>
                              );
                            })()}
                          </td>

                          {/* Admin Global Pin toggle */}
                          {isAdmin && (
                            <td className="py-2.5 px-2 text-center">
                              {(() => {
                                const isPendingThis = pendingPinAction?.id === item.id && pendingPinAction?.type === "global";
                                return (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isPending || isPendingThis}
                                    onClick={() => handleToggleGlobalPin(item.id, item.isGlobalPinned ?? false)}
                                    className={cn(
                                      "h-6 w-6 rounded-sm",
                                      item.isGlobalPinned
                                        ? "text-foreground bg-foreground/15 border border-foreground/30 hover:bg-foreground/20"
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={
                                      item.isGlobalPinned
                                        ? t.workspace?.unpinGlobalTitle || "取消全站置顶"
                                        : t.workspace?.pinGlobalTitle || "设置全站置顶"
                                    }
                                  >
                                    {isPendingThis ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Globe className={cn("w-3 h-3", item.isGlobalPinned && "fill-current")} />
                                    )}
                                  </Button>
                                );
                              })()}
                            </td>
                          )}

                          {/* PURE STATIC 16:9 THUMBNAIL POSTER (No Sandbox Popovers) */}
                          <td className="py-2.5 px-3">
                            <StaticProjectPoster
                              slug={item.slug}
                              title={item.title}
                              category={item.category}
                              screenshotUrl={item.screenshotUrl}
                              icon={CategoryIcon}
                            />
                          </td>

                          {/* Title, slug & description */}
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                              <Link href={`/p/${item.slug}`} target="_blank" className="hover:underline truncate">
                                {item.title}
                              </Link>
                              <ReviewStatusBadge status={item.reviewStatus} t={t} />
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>/p/{item.slug}</span>
                              <Link href={`/p/${item.slug}`} target="_blank" className="hover:text-foreground">
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>

                          {/* Category & Language */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                                <CategoryIcon className="w-2.5 h-2.5 opacity-70" />
                                <span>{cat?.label || item.category}</span>
                              </Badge>
                              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono uppercase text-muted-foreground">
                                {item.language || "zh"}
                              </Badge>
                            </div>
                          </td>

                          {/* Views */}
                          <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                            {item.viewCount || 0}
                          </td>

                          {/* Visibility */}
                          <td className="py-2.5 px-3">
                            <Select
                              aria-label="修改可见性"
                              value={item.visibility}
                              onChange={(e) =>
                                handleUpdateVisibility(item.id, e.target.value as "public" | "private")
                              }
                              className="text-[11px] h-6 px-1.5 py-0 max-w-[100px]"
                            >
                              <option value="public">公开</option>
                              <option value="private">私有</option>
                            </Select>
                          </td>

                          {/* Created Time */}
                          <td className="py-2.5 px-3 text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>

                          {/* Operations */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(item.reviewStatus === "rejected" || item.reviewStatus === "flagged") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="h-6 w-6 text-amber-500 hover:text-amber-600"
                                  title="申诉复核"
                                >
                                  <a href={createAppealMailtoUrl(item)}>
                                    <HelpCircle className="w-3 h-3" />
                                  </a>
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleShare(item.slug, e)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="复制运行链接"
                              >
                                {copiedSlug === item.slug ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Share2 className="w-3 h-3" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={capturingId === item.id || isPending}
                                onClick={(e) => handleRegenerateScreenshot(item.id, e)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="重新生成截图"
                              >
                                {capturingId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-foreground" />
                                ) : (
                                  <Camera className="w-3 h-3" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                asChild
                              >
                                <Link href={`/workspace/projects/${item.id}/edit`} title="在线编辑代码">
                                  <Edit3 className="w-3 h-3" />
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
                                className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                title={t.workspace?.deleteTitle || "删除项目"}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-destructive" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
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
          ) : (
            /* VIEW MODE 2: CARD GRID VIEW (Enhanced with Checkboxes & Clean Cards) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-muted-foreground space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="font-medium text-foreground">没有找到匹配的 HTML 项目</p>
                  <p>请尝试调整搜索关键词或切换左侧文件夹。</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const cat = categoryMap[item.category] || categoryMap["tools"];
                  const CategoryIcon = cat?.icon || Layers;
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "group relative flex flex-col overflow-hidden border-border bg-card/80 hover:border-neutral-500 transition-all duration-200 shadow-xs",
                        isSelected && "border-foreground ring-1 ring-foreground/20",
                        deletingId === item.id && "opacity-40 scale-[0.98] pointer-events-none"
                      )}
                    >
                      {/* Top Poster Area */}
                      <div className="relative aspect-video w-full bg-neutral-950 border-b border-border/60 overflow-hidden">
                        <StaticProjectPoster
                          slug={item.slug}
                          title={item.title}
                          category={item.category}
                          screenshotUrl={item.screenshotUrl}
                          icon={CategoryIcon}
                          className="w-full h-full rounded-none border-0"
                        />

                        {/* Top-left Checkbox */}
                        <div className="absolute top-2.5 left-2.5 z-30">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="bg-black/60 border-neutral-400 data-[state=checked]:bg-foreground"
                          />
                        </div>

                        {/* Badges on top of card */}
                        <div className="absolute top-2.5 left-8 flex items-center gap-1.5 pointer-events-none z-20">
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
                          <ReviewStatusBadge status={item.reviewStatus} t={t} isOverlay />
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

                      {/* Card Body */}
                      <CardHeader className="p-3.5 pb-2 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/p/${item.slug}`} target="_blank" className="hover:underline">
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

                      {/* Card Bottom */}
                      <CardContent className="p-3.5 pt-0 pb-3 space-y-2.5 flex-1 flex flex-col justify-end">
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

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                          <Select
                            aria-label="修改可见性"
                            value={item.visibility}
                            onChange={(e) => handleUpdateVisibility(item.id, e.target.value as "public" | "private")}
                            className="text-[11px] h-7 px-2 py-0.5 max-w-[110px]"
                          >
                            <option value="public">公开 (Public)</option>
                            <option value="private">私有 (Private)</option>
                          </Select>

                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!isProjectOwner(item) || isPending}
                              onClick={() => handleTogglePin(item.id, item.isPinned)}
                              className={cn(
                                "h-7 w-7 rounded-sm",
                                item.isPinned ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
                              )}
                              title={item.isPinned ? "取消置顶" : "置顶至首位"}
                            >
                              <Pin className={cn("w-3.5 h-3.5", item.isPinned && "fill-current")} />
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
                              title="删除项目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BATCH ACTION BAR */}
      <BatchActionBar
        selectedCount={selectedIds.length}
        onMoveClick={() => setMoveDialogOpen(true)}
        onVisibilityChange={handleBatchVisibility}
        onDeleteClick={() => setBatchDeleteDialogOpen(true)}
        onClearSelection={() => setSelectedIds([])}
        isPending={isPending}
      />

      {/* BATCH MOVE TO FOLDER DIALOG */}
      <MoveFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        folders={folders}
        selectedCount={selectedIds.length}
        onConfirm={handleBatchMoveConfirm}
        isPending={isPending}
      />

      {/* BATCH DELETE CONFIRMATION DIALOG */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>{t.workspace?.batchDeleteConfirmTitle || "批量删除确认"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              {(t.workspace?.batchDeleteConfirmDesc || "确定要永久删除选中的 {count} 个项目吗？此操作不可逆！").replace(
                "{count}",
                String(selectedIds.length)
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(false)}
              className="text-xs h-8"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBatchDeleteConfirm}
              disabled={isPending}
              className="text-xs h-8"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              <span>确认批量删除</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SINGLE DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>{t.workspace?.deleteTitle || "删除项目"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              {t.workspace?.deleteConfirmText || "确定要永久删除此项目吗？此操作不可逆，将抹除所有存储资源。"}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {deleteError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs h-8"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              disabled={isPending}
              className="text-xs h-8"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              <span>{t.workspace?.confirmDelete || "确认永久删除"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
