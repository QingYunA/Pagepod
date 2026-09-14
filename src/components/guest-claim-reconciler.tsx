"use client";

import React, { useEffect, useState, useRef } from "react";
import { reconcileGuestProjectsAction } from "@/app/actions/guest";
import { useLanguage } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";

const LOCAL_STORAGE_KEY = "pagepod_guest_claims";

export function GuestClaimReconciler() {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const [toastNotification, setToastNotification] = useState<{
    count: number;
    visible: boolean;
  } | null>(null);

  const isReconcilingRef = useRef(false);

  const runReconciliation = async () => {
    if (isReconcilingRef.current) return;
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return;

      const claims: Array<{ slug: string; claimToken: string }> = JSON.parse(stored);
      if (!Array.isArray(claims) || claims.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }

      isReconcilingRef.current = true;
      const res = await reconcileGuestProjectsAction(claims);

      if (res.authenticated) {
        // Purge resolved slugs (claimed or invalid/stale) from localStorage
        if (Array.isArray(res.resolvedSlugs) && res.resolvedSlugs.length > 0) {
          const remaining = claims.filter((c) => !res.resolvedSlugs.includes(c.slug));
          if (remaining.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remaining));
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }

        if (res.claimedCount > 0) {
          // Trigger global custom event for workspace table or headers to react
          window.dispatchEvent(
            new CustomEvent("pagepod:claimed", {
              detail: {
                claimedCount: res.claimedCount,
                resolvedSlugs: res.resolvedSlugs,
              },
            })
          );

          // Display subtle feedback toast
          setToastNotification({
            count: res.claimedCount,
            visible: true,
          });
        }
      }
    } catch {
      // Non-fatal client reconciliation error
    } finally {
      isReconcilingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial mount check
    runReconciliation();

    // Re-check when window gains focus (e.g. user logged in via another tab / OAuth redirect)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        runReconciliation();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  // Auto-dismiss notification after 4.5s
  useEffect(() => {
    if (!toastNotification?.visible) return;
    const timer = setTimeout(() => {
      setToastNotification((prev) => (prev ? { ...prev, visible: false } : null));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastNotification?.visible]);

  if (!toastNotification?.visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border/80 bg-background/95 backdrop-blur-md shadow-lg text-foreground transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      </div>

      <div className="text-xs">
        <p className="font-medium text-foreground">
          {isZh ? "游客作品已自动同步" : "Guest Projects Synchronized"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isZh
            ? `已成功将你在本机上传的 ${toastNotification.count} 个 HTML 应用绑定至当前账户。`
            : `Successfully attached ${toastNotification.count} guest HTML app${
                toastNotification.count > 1 ? "s" : ""
              } to your account.`}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setToastNotification(null)}
        className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
