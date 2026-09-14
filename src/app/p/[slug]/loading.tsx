import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Monitor, Tablet, Smartphone, RotateCw, Code2, Share2, Info, Loader2 } from "lucide-react";

export default function RunnerLoading() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Top Header Controls Bar Skeleton */}
      <header className="h-12 border-b border-border px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 bg-background/95 backdrop-blur-xs z-10">
        {/* Left: Back & Project Title Skeleton */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground/40">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <Skeleton className="h-4 w-28 sm:w-40" />
            <Skeleton className="h-4 w-12 hidden sm:inline-block rounded-full" />
            <div className="h-6 w-6 flex items-center justify-center text-muted-foreground/30">
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Center: Device Switcher Skeleton */}
        <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 opacity-70">
          <div className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Monitor className="w-4 h-4" />
            <span className="hidden md:inline">桌面</span>
          </div>
          <div className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50">
            <Tablet className="w-4 h-4" />
            <span className="hidden md:inline">平板</span>
          </div>
          <div className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50">
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:inline">手机</span>
          </div>
        </div>

        {/* Right Actions Skeleton */}
        <div className="flex items-center gap-1">
          <div className="h-8 w-8 flex items-center justify-center text-muted-foreground/40">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div className="h-8 w-8 flex items-center justify-center text-muted-foreground/40">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <div className="h-8 w-8 flex items-center justify-center text-muted-foreground/40">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md ml-1" />
          <Skeleton className="h-8 w-8 rounded-md ml-1" />
        </div>
      </header>

      {/* Main Viewport Skeleton */}
      <div className="flex-1 bg-background flex items-center justify-center overflow-hidden relative">
        <div className="w-full h-full bg-card/60 dark:bg-neutral-950 flex flex-col items-center justify-center gap-3">
          {/* Top hairline shimmer bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] w-full overflow-hidden bg-muted/40">
            <div className="h-full bg-foreground dark:bg-zinc-200 animate-pulse w-full" />
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">正在加载运行环境...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
