"use client";

import Link from "next/link";
import {
  Sparkles,
  Zap,
  ArrowRight,
  Layers,
  Globe,
  Eye,
  ShieldAlert,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/context";
import { isClientCloudMode } from "@/lib/supabase/client";
import ApiTokenGuideModal from "./api-token-guide";
import type { CurrentUser } from "@/lib/auth";

interface WorkspaceDashboardHeaderProps {
  currentUser?: CurrentUser | null;
  projectCount: number;
  publicCount: number;
  totalViews: number;
}

export function WorkspaceApiTokenHeaderButton() {
  const { t } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="h-9 text-sm gap-1.5 border-border hidden sm:inline-flex"
    >
      <Link href="/workspace/settings/tokens" prefetch={true}>
        <Key className="w-4 h-4" />
        <span>{t.nav.apiTokens}</span>
      </Link>
    </Button>
  );
}

export default function WorkspaceDashboardHeader({
  currentUser,
  projectCount,
  publicCount,
  totalViews,
}: WorkspaceDashboardHeaderProps) {
  const { t } = useLanguage();
  const isCloud = isClientCloudMode();
  const showPlanBanner = isCloud && currentUser?.id !== "selfhost-admin";

  return (
    <div className="space-y-6">
      {/* Membership Plan Banner (Cloud mode only) */}
      {showPlanBanner && (currentUser?.planTier === "pro" ? (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t.workspace.planBanner.proTitle}
                </h2>
                <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
                  {t.workspace.planBanner.proBadge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t.workspace.planBanner.proDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 text-sm border-border text-foreground hover:bg-muted"
            >
              <Link href="/workspace/settings">
                {t.workspace.planBanner.viewDetails}
              </Link>
            </Button>
          </div>
        </div>
      ) : currentUser?.planTier === "lite" ? (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t.workspace.planBanner.liteTitle}
                </h2>
                <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
                  {t.workspace.planBanner.liteBadge}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t.workspace.planBanner.liteDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" asChild className="h-9 text-sm gap-1.5">
              <Link href="/pricing">
                <span>{t.workspace.planBanner.upgradePro}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null)}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.workspace.metrics.totalProjects}
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold font-mono tracking-tight">
              {projectCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentUser?.role === "admin" && currentUser.id !== "selfhost-admin"
                ? t.workspace.metrics.totalProjectsDescAdmin
                : t.workspace.metrics.totalProjectsDescUser}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.workspace.metrics.publicProjects}
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold font-mono tracking-tight">
              {publicCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.workspace.metrics.publicProjectsDesc}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.workspace.metrics.totalViews}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold font-mono tracking-tight">
              {totalViews}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.workspace.metrics.totalViewsDesc}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Notice Banner */}
      <div className="rounded-xl border border-border bg-card/60 p-4.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">
              {t.workspace.privacyBanner.title}
            </strong>
            : {t.workspace.privacyBanner.desc}
          </span>
        </div>
        <ApiTokenGuideModal />
      </div>
    </div>
  );
}
