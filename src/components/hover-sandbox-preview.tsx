"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Play,
  Loader2,
  ExternalLink,
  X,
  AlertTriangle,
  RotateCcw,
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  Layers,
  FileCode2,
  Bot,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsSandboxActive, sandboxPool } from "@/lib/sandbox-pool";
import { useLanguage } from "@/lib/i18n/context";

interface HoverSandboxPreviewProps {
  slug: string;
  title: string;
  category?: string;
  fileSize?: number;
  screenshotUrl?: string | null;
  openRunnerText?: string;
  variant?: "card" | "table-cell";
  icon?: React.ComponentType<{ className?: string }>;
}

const CHARGE_DURATION_MS = 600;
const TIMEOUT_DURATION_MS = 6500; // 6.5s timeout guard

const CARD_RADIUS = 12;
const CARD_CIRCUMFERENCE = 2 * Math.PI * CARD_RADIUS; // ~75.4

const CELL_RADIUS = 9;
const CELL_CIRCUMFERENCE = 2 * Math.PI * CELL_RADIUS; // ~56.55

const CATEGORY_BACKGROUND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tools: Wrench,
  ai: Bot,
  games: Gamepad2,
  creative: Palette,
  visualization: BarChart3,
  prototypes: Smartphone,
  animations: Sparkles,
  others: Layers,
};

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HoverSandboxPreview({
  slug,
  title,
  category = "tools",
  fileSize = 0,
  screenshotUrl,
  openRunnerText,
  variant = "card",
  icon: CustomIcon,
}: HoverSandboxPreviewProps) {
  const { t } = useLanguage();
  const isPoolActive = useIsSandboxActive(slug);
  const [isCharging, setIsCharging] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [hasScriptError, setHasScriptError] = useState(false);
  const [showLargeFileConfirm, setShowLargeFileConfirm] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // For table-cell floating popover: tracks active popover locally so it doesn't overlap forever
  const [isCellActive, setIsCellActive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const effectiveScreenshot = screenshotUrl || `/screenshots/${slug}.png`;
  const activeScreenshot = !imgFailed ? effectiveScreenshot : null;

  const chargeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isOverPopoverRef = useRef(false);

  // Large file threshold: > 2.0 MB
  const isLargeFile = fileSize > 2 * 1024 * 1024;
  const formattedFileSize = formatSize(fileSize);

  const defaultOpenText = openRunnerText || t.gallery.openDirect || "打开";
  const previewText = t.gallery.preview || "预览";

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearChargeTimer = useCallback(() => {
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
  }, []);

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // Reset states whenever sandbox is evicted or closed
  useEffect(() => {
    if (!isPoolActive) {
      setIframeLoaded(false);
      setHasTimedOut(false);
      setHasScriptError(false);
      setShowLargeFileConfirm(false);
      clearTimeoutTimer();
    }
  }, [isPoolActive, clearTimeoutTimer]);

  // Launch timeout guard when sandbox becomes active
  useEffect(() => {
    if (isPoolActive && !iframeLoaded) {
      clearTimeoutTimer();
      timeoutTimerRef.current = setTimeout(() => {
        setHasTimedOut(true);
      }, TIMEOUT_DURATION_MS);
    }
    return () => clearTimeoutTimer();
  }, [isPoolActive, iframeLoaded, clearTimeoutTimer, iframeKey]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      clearChargeTimer();
      clearTimeoutTimer();
    };
  }, [clearChargeTimer, clearTimeoutTimer]);

  const updatePopoverPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 170;
    const popoverWidth = 288;

    const top = rect.top > popoverHeight + 16 ? rect.top - popoverHeight - 8 : rect.bottom + 8;
    const left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.left));
    setPopoverPos({ top, left });
  };

  // Perform activation into pool
  const triggerActivation = () => {
    if (isLargeFile && !showLargeFileConfirm) {
      setShowLargeFileConfirm(true);
      return;
    }
    setHasTimedOut(false);
    setHasScriptError(false);
    setShowLargeFileConfirm(false);
    sandboxPool.activate(slug);
  };

  // Button hover: charge to activate
  const handlePreviewHoverStart = () => {
    if (isPoolActive) return;
    setIsCharging(true);
    clearChargeTimer();

    chargeTimerRef.current = setTimeout(() => {
      setIsCharging(false);
      triggerActivation();
    }, CHARGE_DURATION_MS);
  };

  const handlePreviewHoverEnd = () => {
    clearChargeTimer();
    setIsCharging(false);
  };

  const handleManualClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearChargeTimer();
    clearTimeoutTimer();
    if (variant === "card") {
      sandboxPool.deactivate(slug);
    } else {
      setIsCellActive(false);
    }
    setIframeLoaded(false);
    setHasTimedOut(false);
    setHasScriptError(false);
    setShowLargeFileConfirm(false);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHasTimedOut(false);
    setHasScriptError(false);
    setIframeLoaded(false);
    setIframeKey((prev) => prev + 1);
  };

  const isCardActive = variant === "card" && isPoolActive;
  const BackgroundIcon = CATEGORY_BACKGROUND_ICONS[category] || FileCode2;

  /* ----------------------------------------------------
   * VARIANT 1: TABLE CELL (Compact Miniature Row Preview)
   * ---------------------------------------------------- */
  if (variant === "table-cell") {
    const DisplayIcon = CustomIcon || Play;

    return (
      <div
        ref={triggerRef}
        onMouseEnter={() => {
          if (!isCellActive) {
            updatePopoverPosition();
            setIsCharging(true);
            clearChargeTimer();
            chargeTimerRef.current = setTimeout(() => {
              setIsCharging(false);
              setIsCellActive(true);
            }, CHARGE_DURATION_MS);
          }
        }}
        onMouseLeave={() => {
          clearChargeTimer();
          setIsCharging(false);
          setTimeout(() => {
            if (!isOverPopoverRef.current) {
              setIsCellActive(false);
              setIframeLoaded(false);
            }
          }, 50);
        }}
        className="w-14 aspect-video rounded overflow-hidden bg-neutral-900/90 border border-border/80 shrink-0 relative flex items-center justify-center cursor-pointer select-none group/cell shadow-2xs hover:border-neutral-500 transition-colors"
      >
        {activeScreenshot ? (
          <img
            src={activeScreenshot}
            alt=""
            aria-hidden="true"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-50 group-hover/cell:opacity-80 transition-opacity"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-950/40" />
        )}

        {/* Mini Progress Circle */}
        <svg
          className="w-7 h-7 -rotate-90 transform absolute"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r={CELL_RADIUS}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            className="text-neutral-800"
          />
          <circle
            cx="12"
            cy="12"
            r={CELL_RADIUS}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={CELL_CIRCUMFERENCE}
            strokeDashoffset={isCharging || isCellActive ? 0 : CELL_CIRCUMFERENCE}
            strokeLinecap="round"
            className="text-neutral-200 transition-all"
            style={{
              transitionDuration: isCharging ? `${CHARGE_DURATION_MS}ms` : "150ms",
              transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>

        <div className="relative z-10 text-neutral-400 group-hover/cell:text-neutral-200 transition-colors">
          <DisplayIcon className="w-3.5 h-3.5" />
        </div>

        <Link
          href={`/p/${slug}`}
          target="_blank"
          className="absolute inset-0 z-20"
          title={`${defaultOpenText}: ${title}`}
        />

        {/* Floating Sandboxed Preview Popover */}
        {isCellActive && mounted && typeof document !== "undefined" && createPortal(
          <div
            onMouseEnter={() => {
              isOverPopoverRef.current = true;
            }}
            onMouseLeave={() => {
              isOverPopoverRef.current = false;
              setIsCellActive(false);
              setIframeLoaded(false);
            }}
            style={{ top: popoverPos.top, left: popoverPos.left }}
            className="fixed z-[9999] w-72 aspect-video bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {activeScreenshot && !iframeLoaded && (
              <img
                src={activeScreenshot}
                alt=""
                aria-hidden="true"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-top opacity-50 pointer-events-none"
              />
            )}
            <iframe
              key={iframeKey}
              src={`/raw/${slug}`}
              title={title}
              tabIndex={-1}
              sandbox="allow-scripts"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setHasScriptError(true)}
              className={`w-[200%] h-[200%] origin-top-left scale-50 border-0 pointer-events-none select-none bg-white transition-opacity duration-300 ${
                iframeLoaded ? "opacity-100" : "opacity-0"
              }`}
            />

            {!iframeLoaded && !hasTimedOut && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/90 text-neutral-400">
                <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-neutral-900 z-30 pointer-events-none">
                  <div className="h-full bg-neutral-200/90 animate-pulse w-full" />
                </div>
                <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                <span className="text-xs font-mono">{t.gallery.loadingPreview}</span>
              </div>
            )}

            {/* Status Pill */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none z-20">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-black/80 text-emerald-400 border border-emerald-500/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t.gallery.sandboxActive}</span>
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={handleManualClose}
              title="关闭预览"
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors z-30"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Quick Open Button */}
            <Link
              href={`/p/${slug}`}
              target="_blank"
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 hover:bg-neutral-900 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700 backdrop-blur-md transition-colors z-20"
            >
              <span>{defaultOpenText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>,
          document.body
        )}
      </div>
    );
  }

  /* ----------------------------------------------------
   * VARIANT 2: FULL CARD (Gallery & Workspace Showcase)
   * High-end Static Blueprint Poster + Floating Capsule
   * ---------------------------------------------------- */
  return (
    <div className="relative aspect-video w-full bg-[#09090b] border-b border-border/60 overflow-hidden select-none group/sandbox">
      {/* 1. Active Sandboxed iframe Layer */}
      {isCardActive && (
        <>
          {activeScreenshot && !iframeLoaded && !hasTimedOut && !hasScriptError && (
            <img
              src={activeScreenshot}
              alt=""
              aria-hidden="true"
              onError={() => setImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-50 pointer-events-none"
            />
          )}
          <iframe
            key={iframeKey}
            src={`/raw/${slug}`}
            title={title}
            tabIndex={-1}
            sandbox="allow-scripts"
            onLoad={() => {
              setIframeLoaded(true);
              setHasTimedOut(false);
            }}
            onError={() => {
              setHasScriptError(true);
            }}
            className={`w-[200%] h-[200%] origin-top-left scale-50 border-0 select-none bg-white transition-opacity duration-300 ${
              iframeLoaded && !hasTimedOut && !hasScriptError ? "opacity-100 pointer-events-none" : "opacity-0 pointer-events-none"
            }`}
          />

          {/* Loading Indicator while iframe compiles */}
          {!iframeLoaded && !hasTimedOut && !hasScriptError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/85 backdrop-blur-xs text-neutral-400 z-10">
              <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-neutral-900 z-30 pointer-events-none">
                <div className="h-full bg-neutral-200/90 animate-pulse w-full" />
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
              <span className="text-xs font-mono tracking-tight text-neutral-300">
                {t.gallery.loadingPreview}
              </span>
            </div>
          )}

          {/* Timeout Guard Layer */}
          {hasTimedOut && !iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-neutral-950/95 border border-amber-500/30 text-center gap-2 z-25 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-xs text-neutral-300 font-medium max-w-[240px] leading-relaxed">
                {t.gallery.loadTimeout}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-8 px-3 text-xs gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.gallery.retry}</span>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs gap-1.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium"
                >
                  <Link href={`/p/${slug}`} target="_blank">
                    <span>{t.gallery.openAnyway}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Script Error Guard Layer */}
          {hasScriptError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-neutral-950/95 border border-red-500/30 text-center gap-2 z-25 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-xs text-neutral-300 font-medium max-w-[240px] leading-relaxed">
                {t.gallery.scriptError}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-8 px-3 text-xs gap-1.5 bg-neutral-900 text-neutral-200 border-neutral-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.gallery.retry}</span>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs gap-1.5 bg-neutral-100 text-neutral-950 font-medium"
                >
                  <Link href={`/p/${slug}`} target="_blank">
                    <span>{t.gallery.openAnyway}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Live Indicator Pill & Close Button */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-20">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.gallery.sandboxActive}</span>
            </span>

            <button
              onClick={handleManualClose}
              title={t.gallery.pause}
              className="p-1 rounded-full bg-black/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700/80 backdrop-blur-md transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Bottom Right Fullscreen Action */}
          <Link
            href={`/p/${slug}`}
            target="_blank"
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 hover:bg-neutral-900 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700/80 backdrop-blur-md transition-colors z-20 shadow-xs cursor-pointer"
            title={defaultOpenText}
          >
            <span>{defaultOpenText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </>
      )}

      {/* 2. Idle State: High-End Static Screenshot Poster or Blueprint Poster (Zero iframe Overhead) */}
      {!isCardActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070709] transition-colors">
          {activeScreenshot ? (
            <div className="absolute inset-0 overflow-hidden bg-neutral-950">
              <img
                src={activeScreenshot}
                alt={title}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover/sandbox:scale-[1.03]"
              />
              {/* Subtle gradient vignette at bottom so pills & actions remain legible */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />
            </div>
          ) : (
            <>
              {/* A. Blueprint Dot Matrix Grid Background */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, #71717a 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              />

              {/* B. Subtle Category Watermark & Code Wireframe Decoration */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none select-none">
                <BackgroundIcon className="w-32 h-32 stroke-[1]" />
              </div>

              {/* Decorative Wireframe Window Skeleton */}
              <div className="absolute inset-3 rounded border border-neutral-800/60 bg-neutral-950/40 p-3 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center justify-between opacity-30">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                  </div>
                  <span className="text-xs font-mono text-neutral-500 tracking-wider">
                    {category.toUpperCase()}
                  </span>
                </div>

                {/* Abstract Wireframe Skeleton Lines */}
                <div className="space-y-1.5 opacity-20 my-auto">
                  <div className="h-1 bg-neutral-700 rounded-full w-2/3" />
                  <div className="h-1 bg-neutral-800 rounded-full w-4/5" />
                  <div className="h-1 bg-neutral-800 rounded-full w-1/2" />
                </div>
              </div>
            </>
          )}

          {/* Large File Warning Badge in top-right of the viewport */}
          {isLargeFile && (
            <div className="absolute top-2.5 right-2.5 z-15 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 backdrop-blur-md shadow-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{formattedFileSize}</span>
              </span>
            </div>
          )}

          {/* C. Large File Confirmation Warning Overlay */}
          {showLargeFileConfirm && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-neutral-950/95 border border-amber-500/40 backdrop-blur-xs text-center gap-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-neutral-200">
                  {t.gallery.largeFileBadge} ({formattedFileSize})
                </p>
                <p className="text-xs text-neutral-400 max-w-[220px] leading-relaxed">
                  {t.gallery.largeFileNotice}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowLargeFileConfirm(false);
                    sandboxPool.activate(slug);
                  }}
                  className="h-8 px-3 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700"
                >
                  <span>继续预览</span>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-8 px-3 text-xs gap-1.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium"
                >
                  <Link href={`/p/${slug}`} target="_blank">
                    <span>{defaultOpenText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
              <button
                onClick={() => setShowLargeFileConfirm(false)}
                className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-neutral-300 p-1 cursor-pointer"
                title="关闭提示"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* D. Dual-Action Floating Capsule Toolbar */}
          {!showLargeFileConfirm && (
            <div className="relative z-20 flex items-center bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/90 rounded-full p-1 shadow-2xl backdrop-blur-md transition-all duration-200 group-hover/sandbox:scale-105 group-hover/sandbox:border-neutral-500">
              {/* Left Action: Preview / Hover Preview Button */}
              <button
                type="button"
                onClick={triggerActivation}
                onMouseEnter={handlePreviewHoverStart}
                onMouseLeave={handlePreviewHoverEnd}
                className="relative flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800/80 transition-all cursor-pointer overflow-hidden select-none"
                title="点击立即运行沙箱，或悬停蓄力预览"
              >
                {/* Mini SVG Progress Ring for Hover Charge */}
                <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4.5 h-4.5 -rotate-90 transform"
                    viewBox="0 0 28 28"
                    aria-hidden="true"
                  >
                    <circle
                      cx="14"
                      cy="14"
                      r={CARD_RADIUS}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-neutral-700"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r={CARD_RADIUS}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray={CARD_CIRCUMFERENCE}
                      strokeDashoffset={isCharging ? 0 : CARD_CIRCUMFERENCE}
                      strokeLinecap="round"
                      className="text-emerald-400 transition-[stroke-dashoffset]"
                      style={{
                        transitionDuration: isCharging ? `${CHARGE_DURATION_MS}ms` : "120ms",
                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </svg>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5 absolute text-neutral-300" />
                </div>
                <span className="font-mono text-xs tracking-tight">
                  {isCharging ? "载入中..." : previewText}
                </span>
              </button>

              {/* Center Divider Hairline */}
              <div className="w-[1px] h-4 bg-neutral-700 shrink-0" />

              {/* Right Action: Open Directly Runner Button */}
              <Link
                href={`/p/${slug}`}
                target="_blank"
                className="flex items-center gap-1.5 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition-all cursor-pointer select-none"
                title={`在新标签页打开 ${title}`}
              >
                <span className="font-mono text-xs tracking-tight">{defaultOpenText}</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
