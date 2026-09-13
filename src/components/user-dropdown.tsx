"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/context";
import { logoutAdmin } from "@/app/actions/auth";
import { createSupabaseClient, isClientCloudMode } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Key,
  Plus,
  LogOut,
  Sparkles,
  Zap,
  ExternalLink,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface UserDropdownProps {
  currentUser: CurrentUser;
}

export function UserDropdown({ currentUser }: UserDropdownProps) {
  const { t } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1. Client-side Supabase sign-out with timeout (scope: local clears tokens immediately without hanging)
      try {
        const supabase = createSupabaseClient();
        if (supabase) {
          await Promise.race([
            supabase.auth.signOut({ scope: "local" }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("SignOut timeout")), 1200)
            ),
          ]);
        }
      } catch (err) {
        console.warn("Client Supabase signOut warning:", err);
      }

      // 2. Clear browser client storage
      try {
        if (typeof window !== "undefined") {
          for (let i = window.localStorage.length - 1; i >= 0; i--) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
              window.localStorage.removeItem(key);
            }
          }
          for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
            const key = window.sessionStorage.key(i);
            if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
              window.sessionStorage.removeItem(key);
            }
          }
        }
      } catch {
        // ignore
      }

      // 3. Server-side session teardown (clears SSR cookies and admin session)
      try {
        await logoutAdmin();
      } catch (err) {
        console.warn("Server logout warning:", err);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // 4. Hard navigate to login page to completely purge all in-memory client state
      window.location.href = "/login";
    }
  };

  const isCloud = isClientCloudMode();
  const isSelfhostOwner = currentUser.id === "selfhost-admin" || !isCloud;
  const displayName =
    (isSelfhostOwner ? (t.nav.workspaceOwner || "Workspace Owner") : currentUser.fullName) ||
    currentUser.email?.split("@")[0] ||
    (currentUser.role === "admin" ? (t.nav.workspaceOwner || "Owner") : "User");

  const initialLetter = isSelfhostOwner ? "O" : displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-1.5 sm:px-2 rounded-full border border-border/60 hover:bg-muted/70 transition-colors data-[state=open]:bg-muted shrink-0"
        >
          {/* Avatar / Initial badge */}
          <div className="w-5.5 h-5.5 rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold tracking-tighter shrink-0 border border-border">
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initialLetter}</span>
            )}
          </div>

          <span className="text-xs font-medium max-w-[120px] truncate hidden sm:inline-block">
            {displayName}
          </span>

          {/* Plan Tier Badge */}
          {currentUser.planTier === "pro" && (
            <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-mono font-bold tracking-wider gap-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              <span>PRO</span>
            </Badge>
          )}
          {currentUser.planTier === "lite" && (
            <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-mono font-bold tracking-wider gap-0.5 shrink-0">
              <Zap className="w-2.5 h-2.5" />
              <span>LITE</span>
            </Badge>
          )}

          <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-60"
        align="end"
        sideOffset={6}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* User Identity Header */}
        <DropdownMenuLabel className="font-normal p-2 pb-1.5">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">
                {displayName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border bg-muted text-muted-foreground uppercase">
                {isSelfhostOwner ? "OWNER" : currentUser.role}
              </span>
            </div>
            {currentUser.email && !isSelfhostOwner && (
              <p className="text-[11px] text-muted-foreground truncate">
                {currentUser.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        {/* Membership Perks Showcase (Cloud SaaS only) */}
        {isCloud && !isSelfhostOwner && (
          currentUser.planTier === "pro" ? (
            <div className="mx-2 my-1.5 p-2.5 rounded-lg border border-border bg-muted/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 tracking-wide">
                  <Sparkles className="w-3 h-3" />
                  {t.nav.proLifetime}
                </span>
                <Badge variant="outline" className="text-[8px] font-mono uppercase px-1 py-0 h-4">
                  {t.nav.lifetimeBadge}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t.nav.proLifetimePerks}
              </p>
            </div>
          ) : currentUser.planTier === "lite" ? (
            <div className="mx-2 my-1.5 p-2.5 rounded-lg border border-border bg-muted/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 tracking-wide">
                  <Zap className="w-3 h-3" />
                  {t.nav.liteLifetime}
                </span>
                <Badge variant="outline" className="text-[8px] font-mono uppercase px-1 py-0 h-4">
                  {t.nav.lifetimeBadge}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t.nav.liteLifetimePerks}
              </p>
            </div>
          ) : (
            <div className="mx-2 my-1.5 p-2 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t.nav.starterPlan}</span>
              <Link
                href="/pricing"
                className="text-[10px] font-medium text-foreground hover:underline flex items-center gap-0.5"
              >
                <span>{t.nav.upgradePlan}</span>
                <Sparkles className="w-2.5 h-2.5" />
              </Link>
            </div>
          )
        )}

        <DropdownMenuSeparator />

        {/* Primary Shortcuts */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/workspace" prefetch={true} className="cursor-pointer gap-2">
              <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.nav.workspace}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/workspace/upload" prefetch={true} className="cursor-pointer gap-2">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.nav.publish}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/workspace/settings" className="cursor-pointer gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.nav.accountSettings}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/workspace/settings/tokens" className="cursor-pointer gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.nav.apiTokens}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* External & Public Hub */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/api/docs" target="_blank" className="cursor-pointer gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span>OpenAPI 文档</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out Action */}
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 w-full"
        >
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            onSelect={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            className="flex items-center gap-2 w-full text-left"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isLoggingOut ? "..." : t.nav.logout}</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
