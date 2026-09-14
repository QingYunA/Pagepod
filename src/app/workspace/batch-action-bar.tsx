"use client";

import { Button } from "@/components/ui/button";
import { Folder, Globe, Lock, Trash2, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface BatchActionBarProps {
  selectedCount: number;
  onMoveClick: () => void;
  onVisibilityChange: (visibility: "public" | "private") => void;
  onDeleteClick: () => void;
  onClearSelection: () => void;
  isPending: boolean;
}

export default function BatchActionBar({
  selectedCount,
  onMoveClick,
  onVisibilityChange,
  onDeleteClick,
  onClearSelection,
  isPending,
}: BatchActionBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  const countText = (t.workspace?.batchBarSelected || "已选中 {count} 项").replace(
    "{count}",
    String(selectedCount)
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-950/90 text-neutral-100 border border-neutral-800 shadow-2xl backdrop-blur-md text-xs">
        {/* Selected count pill */}
        <span className="font-medium px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono text-xs select-none">
          {countText}
        </span>

        <div className="h-4 w-px bg-neutral-800 mx-0.5" />

        {/* Move to folder */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveClick}
          disabled={isPending}
          className="h-8 px-3 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
          title={t.workspace?.moveToFolder || "移动至文件夹"}
        >
          <Folder className="w-3.5 h-3.5 mr-1 text-neutral-400" />
          <span>{t.workspace?.batchMove || "移动"}</span>
        </Button>

        {/* Make Public */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onVisibilityChange("public")}
          disabled={isPending}
          className="h-8 px-3 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
          title={t.workspace?.batchMakePublic || "批量设为公开"}
        >
          <Globe className="w-3.5 h-3.5 mr-1 text-neutral-400" />
          <span>{t.workspace?.batchMakePublic || "设为公开"}</span>
        </Button>

        {/* Make Private */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onVisibilityChange("private")}
          disabled={isPending}
          className="h-8 px-3 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
          title={t.workspace?.batchMakePrivate || "批量设为私有"}
        >
          <Lock className="w-3.5 h-3.5 mr-1 text-neutral-400" />
          <span>{t.workspace?.batchMakePrivate || "设为私有"}</span>
        </Button>

        {/* Batch Delete */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDeleteClick}
          disabled={isPending}
          className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 cursor-pointer"
          title={t.workspace?.batchDelete || "批量删除"}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-400" />
          <span>{t.workspace?.batchDelete || "删除"}</span>
        </Button>

        <div className="h-4 w-px bg-neutral-800 mx-0.5" />

        {/* Clear selection */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          disabled={isPending}
          className="h-8 w-8 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
          title={t.workspace?.deselectAll || "取消全选"}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-300" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
