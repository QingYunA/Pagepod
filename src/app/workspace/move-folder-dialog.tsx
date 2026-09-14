"use client";

import { useState, useMemo } from "react";
import { Folder as FolderType } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, Inbox, Loader2, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { cn, buildFolderHierarchy, flattenFolderHierarchy, type FolderTreeNode } from "@/lib/utils";

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderType[];
  selectedCount: number;
  onConfirm: (targetFolderId: string | null) => Promise<void>;
  isPending: boolean;
}

export default function MoveFolderDialog({
  open,
  onOpenChange,
  folders,
  selectedCount,
  onConfirm,
  isPending,
}: MoveFolderDialogProps) {
  const { t } = useLanguage();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Build tree hierarchy using shared utility
  const tree = useMemo(() => {
    const roots = buildFolderHierarchy(folders);
    return flattenFolderHierarchy(roots);
  }, [folders]);

  const handleConfirm = async () => {
    await onConfirm(selectedFolderId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Folder className="w-4 h-4 text-foreground" />
            <span>{t.workspace?.moveToFolder || "移动至文件夹"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.workspace?.selectTargetFolder || "选择目标文件夹"} ({selectedCount} 项)
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-1 py-2 border rounded-md border-border/80 bg-muted/10 p-1">
          {/* Root / Uncategorized Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs transition-colors text-left cursor-pointer",
              selectedFolderId === null
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 opacity-70" />
              <span>{t.workspace?.rootFolderOption || "未归类 / 根目录"}</span>
            </div>
            {selectedFolderId === null && <Check className="w-3.5 h-3.5 text-foreground" />}
          </button>

          {/* Folder Tree Options */}
          {tree.map((node) => {
            const isSelected = selectedFolderId === node.folder.id;
            return (
              <button
                key={node.folder.id}
                type="button"
                onClick={() => setSelectedFolderId(node.folder.id)}
                style={{ paddingLeft: `${node.depth * 16 + 10}px` }}
                className={cn(
                  "w-full flex items-center justify-between pr-2.5 py-1.5 rounded-sm text-xs transition-colors text-left cursor-pointer",
                  isSelected
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {isSelected ? (
                    <FolderOpen className="w-3.5 h-3.5 text-foreground shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  )}
                  <span className="truncate">{node.folder.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-foreground shrink-0" />}
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-sm h-9"
          >
            {t.workspace?.cancel || "取消"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isPending}
            className="text-sm h-9"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{t.workspace?.processing || "处理中..."}</span>
              </>
            ) : (
              <span>{t.workspace?.confirmMove || "确认移动"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
