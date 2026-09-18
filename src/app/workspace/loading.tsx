import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Navbar Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-xs px-3 sm:px-6 md:px-8 h-12 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-2 font-semibold tracking-tight text-sm text-foreground shrink-0">
              <BrandLogo size={24} className="w-6 h-6 shrink-0" />
              <span className="font-semibold">Pagepod</span>
            </div>

            {/* Desktop Navigation Skeleton */}
            <div className="hidden md:flex items-center gap-1">
              <Skeleton className="h-8 w-14 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Skeleton className="h-8 w-16 hidden sm:inline-block rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-20 hidden sm:inline-block rounded-md" />
            <Skeleton className="h-8 w-24 hidden sm:inline-block rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Privacy Boundary Banner Skeleton */}
        <div className="rounded-lg border border-border bg-card/60 p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0" />
        </div>

        {/* Projects Management Table Skeleton */}
        <div className="rounded-lg border border-border bg-card overflow-hidden space-y-0">
          {/* Table Header Filter Controls */}
          <div className="p-3.5 border-b border-border flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card/60">
            <Skeleton className="h-8 w-full lg:w-72 shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 flex-1 lg:justify-center">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-18 rounded-md shrink-0" />
              ))}
            </div>
            <Skeleton className="h-8 w-20 rounded-md shrink-0" />
          </div>

          {/* Grid Cards Skeleton */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-border bg-card/80">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-3.5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <div className="pt-2 border-t border-border/60 flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
