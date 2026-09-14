import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient, isCloudMode } from "@/lib/supabase/server";
import type { UserIdentity } from "@supabase/supabase-js";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/workspace/settings");
  }

  const cloud = isCloudMode();
  let identities: UserIdentity[] = [];
  let hasPassword = false;

  if (cloud) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user: sbUser },
        } = await supabase.auth.getUser();
        if (sbUser) {
          identities = sbUser.identities || [];
          hasPassword = Boolean(
            sbUser.identities?.some((i) => i.provider === "email") ||
              sbUser.app_metadata?.providers?.includes("email")
          );
        }
      }
    } catch {
      // Non-fatal, fallback to empty identities
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-xs px-3 sm:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Link href="/workspace" prefetch={true}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck className="w-4 h-4 text-foreground shrink-0" />
            <span className="font-semibold text-sm tracking-tight truncate max-w-[130px] sm:max-w-none">
              Account & Security
            </span>
          </div>
          <span className="text-border">/</span>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {user.role === "admin" ? "admin" : "user"}
          </Badge>
          {user.planTier && user.planTier !== "free" && (
            <Badge variant="default" className="text-xs font-mono uppercase shrink-0">
              {user.planTier}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-3 text-xs gap-1.5 border-border"
          >
            <Link href="/api/docs" target="_blank">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">交互式 </span><span>API 文档</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <SettingsClient
          user={user}
          initialIdentities={identities}
          initialHasPassword={hasPassword}
          isCloud={cloud}
        />
      </main>
    </div>
  );
}
