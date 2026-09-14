import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UploadLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <Button variant="ghost" size="sm" disabled className="h-9 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> 返回项目列表
          </Button>
          <Badge variant="outline" className="text-xs font-mono">
            upload hub
          </Badge>
        </div>

        {/* Page Title Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        {/* Form Card Skeleton */}
        <Card className="border-border p-6 space-y-6">
          <div className="flex gap-2 border-b border-border pb-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-44 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      </div>
    </div>
  );
}
