import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Bar Skeleton */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-xs px-3 sm:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button variant="ghost" size="icon" disabled className="h-8 w-8 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck className="w-4 h-4 text-foreground shrink-0" />
            <span className="font-semibold text-sm tracking-tight">Account & Security</span>
          </div>
          <span className="text-border">/</span>
          <Skeleton className="h-4 w-12" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>

        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    </div>
  );
}
