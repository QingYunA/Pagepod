"use client";

import { useState, useMemo } from "react";
import type { Folder, Project } from "@/db/schema";
import {
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Inbox,
  Layers,
  Pin,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/context";
import { cn, buildFolderHierarchy, type FolderTreeNode } from "@/lib/utils";

export type WorkspaceScope =
  | { type: "all" }
  | { type: "uncategorized" }
  | { type: "pinned" }
  | { type: "folder"; folderId: string };

interface WorkspaceFolderTreeProps {
  folders: Folder[];
  projects: Project[];
  activeScope: WorkspaceScope;
  onSelectScope: (scope: WorkspaceScope) => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  isPending?: boolean;
}

type TreeNode = FolderTreeNode<Folder>;

export default function WorkspaceFolderTree({
  folders,
  projects,
  activeScope,
  onSelectScope,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isPending = false,
}: WorkspaceFolderTreeProps) {
  const { t } = useLanguage();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);

  // Folders expanded state
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => {
    return new Set<string>();
  });

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Pre-calculate project counts
  const totalCount = projects.length;
  const uncategorizedCount = projects.filter((p) => !p.folderId).length;
  const pinnedCount = projects.filter((p) => p.isPinned).length;

  const folderCountMap = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      if (p.folderId) {
        map.set(p.folderId, (map.get(p.folderId) || 0) + 1);
      }
    });
    return map;
  }, [projects]);

  // Construct hierarchical folder tree using shared utility
  const tree = useMemo(() => buildFolderHierarchy(folders), [folders]);

  // Create folder handler
  const handleOpenCreate = (parentId: string | null = null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCreateParentId(parentId);
    setNewFolderName("");
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim(), createParentId);
    if (createParentId) {
      setExpandedFolderIds((prev) => new Set(prev).add(createParentId));
    }
    setCreateDialogOpen(false);
  };

  // Rename folder handler
  const handleOpenRename = (folder: Folder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameTarget(folder);
    setRenameValue(folder.name);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await onRenameFolder(renameTarget.id, renameValue.trim());
    setRenameDialogOpen(false);
  };

  // Delete folder handler
  const handleOpenDelete = (folder: Folder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteTarget(folder);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteFolder(deleteTarget.id);
    if (activeScope.type === "folder" && activeScope.folderId === deleteTarget.id) {
      onSelectScope({ type: "all" });
    }
    setDeleteDialogOpen(false);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode) => {
    const isSelected = activeScope.type === "folder" && activeScope.folderId === node.folder.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolderIds.has(node.folder.id);
    const count = folderCountMap.get(node.folder.id) || 0;

    return (
      <div key={node.folder.id} className="space-y-0.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectScope({ type: "folder", folderId: node.folder.id })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSelectScope({ type: "folder", folderId: node.folder.id });
            }
          }}
          style={{ paddingLeft: `${node.depth * 14 + 8}px` }}
          className={cn(
            "group flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer select-none transition-colors",
            isSelected
              ? "bg-secondary text-secondary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {/* Expand / Collapse toggle chevron */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.folder.id, e)}
                className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                title={isExpanded ? (t.workspace?.collapse || "折叠") : (t.workspace?.expand || "展开")}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}

            {isSelected ? (
              <FolderOpen className="w-3.5 h-3.5 text-foreground shrink-0" />
            ) : (
              <FolderIcon className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}

            <span className="truncate">{node.folder.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Project count pill */}
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-opacity",
                isSelected
                  ? "bg-background text-foreground font-semibold"
                  : "text-muted-foreground/80 group-hover:text-foreground"
              )}
            >
              {count}
            </span>

            {/* Folder options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 hover:bg-muted p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer transition-opacity"
                  title={t.workspace?.folders || "文件夹选项"}
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                <DropdownMenuItem
                  onClick={(e) => handleOpenCreate(node.folder.id, e)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{t.workspace?.newSubFolder || "新建子文件夹"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleOpenRename(node.folder, e)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t.workspace?.renameFolder || "重命名"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleOpenDelete(node.folder, e)}
                  className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.workspace?.deleteFolder || "删除文件夹"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Render nested children if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full md:w-60 lg:w-64 shrink-0 flex flex-col space-y-4">
      {/* System Virtual Views */}
      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted-foreground px-2 pb-1 uppercase tracking-wider">
          {t.workspace?.allProjects || "项目范围"}
        </div>

        {/* All Projects */}
        <button
          type="button"
          onClick={() => onSelectScope({ type: "all" })}
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer",
            activeScope.type === "all"
              ? "bg-secondary text-secondary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 opacity-80" />
            <span>{t.workspace?.allProjects || "全部项目"}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">{totalCount}</span>
        </button>

        {/* Uncategorized Projects */}
        <button
          type="button"
          onClick={() => onSelectScope({ type: "uncategorized" })}
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer",
            activeScope.type === "uncategorized"
              ? "bg-secondary text-secondary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5 opacity-80" />
            <span>{t.workspace?.uncategorized || "未归类"}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">{uncategorizedCount}</span>
        </button>

        {/* Pinned Projects */}
        <button
          type="button"
          onClick={() => onSelectScope({ type: "pinned" })}
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer",
            activeScope.type === "pinned"
              ? "bg-secondary text-secondary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 opacity-80" />
            <span>{t.workspace?.pinnedFilter || "已置顶"}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">{pinnedCount}</span>
        </button>
      </div>

      <div className="h-px bg-border/60 mx-1" />

      {/* User Custom Folders Tree */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t.workspace?.folders || "我的文件夹"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleOpenCreate(null, e)}
            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title={t.workspace?.newFolder || "新建文件夹"}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {folders.length === 0 ? (
          <div className="py-4 px-2 text-center text-xs text-muted-foreground/70 border border-dashed border-border/60 rounded-md">
            <p>{t.workspace?.noFoldersYet || "暂无自定义文件夹"}</p>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => handleOpenCreate(null, e)}
              className="h-auto p-0 text-xs text-foreground mt-1 cursor-pointer"
            >
              + {t.workspace?.newFolder || "新建文件夹"}
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4" />
              <span>{createParentId ? t.workspace?.newSubFolder || "新建子文件夹" : t.workspace?.newFolder || "新建文件夹"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t.workspace?.folderNamePlaceholder || "输入文件夹名称..."}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCreate();
              }}
              className="text-xs bg-muted/20 border-border"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              className="text-xs h-8"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCreate}
              disabled={isPending || !newFolderName.trim()}
              className="text-xs h-8"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              <span>{t.workspace?.confirmCreate || "确定创建"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Edit2 className="w-4 h-4" />
              <span>{t.workspace?.renameFolder || "重命名文件夹"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={t.workspace?.folderNamePlaceholder || "输入新名称..."}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmRename();
              }}
              className="text-xs bg-muted/20 border-border"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRenameDialogOpen(false)}
              className="text-xs h-8"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRename}
              disabled={isPending || !renameValue.trim()}
              className="text-xs h-8"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              <span>{t.workspace?.confirmRename || "确定重命名"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog (Safe Unlink Warning) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              <span>{t.workspace?.deleteFolderConfirmTitle || "删除文件夹确认"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              {t.workspace?.deleteFolderConfirmDesc ||
                "删除文件夹后，其中的所有项目将自动转为【未归类】，项目源码与数据绝对不会丢失。确定删除吗？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-xs h-8"
            >
              {t.workspace?.cancel || "取消"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="text-xs h-8"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              <span>{t.workspace?.confirmDelete || "确认删除"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
