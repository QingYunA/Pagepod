"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Code2,
  Share2,
  Check,
  Copy,
  Info,
  Lock,
  Code,
  Sparkles,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Terminal,
  Play,
} from "lucide-react";
import type { Project } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/context";
import { AntiBounceDrawer } from "@/components/anti-bounce-drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RunnerClientProps {
  project: Project;
  initialSourceCode: string;
  isOwner?: boolean;
  relatedProjects?: Project[];
  token?: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export default function RunnerClient({
  project,
  initialSourceCode,
  isOwner = false,
  relatedProjects = [],
  token,
}: RunnerClientProps) {
  const { t } = useLanguage();
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
  const rawUrl = `/raw/${project.slug}/${tokenQuery}`;

  const handleReload = () => {
    setIsIframeLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleCopyCode = () => {
    if (!initialSourceCode) return;
    navigator.clipboard.writeText(initialSourceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const fullUrl = token
      ? `${window.location.origin}/p/${project.slug}?token=${encodeURIComponent(token)}`
      : `${window.location.origin}/p/${project.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const embedSnippet = `<iframe src="${
    typeof window !== "undefined" ? window.location.origin : ""
  }/raw/${project.slug}/${tokenQuery}" width="100%" height="600" frameborder="0" sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-modals" allow="fullscreen; clipboard-write" allowfullscreen></iframe>`;

  const isPrivate = project.visibility === "private";

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none"
          : "min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden"
      }
    >
      {/* Top Controls Bar */}
      <header className="h-12 border-b border-border px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 bg-background/95 backdrop-blur-xs sticky top-0 z-30">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" asChild>
            <Link href="/" title={t.runner.back}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-xs md:max-w-sm">
              {project.title}
            </h1>
            {isPrivate ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Lock className="w-3 h-3" />
                <span>私有项目</span>
              </Badge>
            ) : project.visibility === "unlisted" ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 text-zinc-300 border-zinc-700 bg-zinc-800/80">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>口令保护</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">
                {project.category}
              </Badge>
            )}
            <Button
              variant={showInfo ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowInfo(!showInfo)}
              title={t.runner.details}
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">{t.runner.details}</span>
            </Button>
          </div>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/40">
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 rounded-sm"
            onClick={() => setDevice("desktop")}
            title={t.runner.desktop}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">{t.runner.desktop}</span>
          </Button>

          <Button
            variant={device === "tablet" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 rounded-sm"
            onClick={() => setDevice("tablet")}
            title={t.runner.tablet}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">{t.runner.tablet}</span>
          </Button>

          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 rounded-sm"
            onClick={() => setDevice("mobile")}
            title={t.runner.mobile}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">{t.runner.mobile}</span>
          </Button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleReload}
            title={t.runner.refresh}
            aria-label={t.runner.refresh}
          >
            <RotateCw className={`w-3.5 h-3.5 transition-transform ${isIframeLoading ? "animate-spin text-foreground" : ""}`} />
          </Button>

          <Button
            variant={showCode ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCode(true)}
            title={t.runner.sourceCode}
            aria-label={t.runner.sourceCode}
          >
            <Code2 className="w-3.5 h-3.5" />
          </Button>

          {!isPrivate && (
            <Button
              variant={showEmbed ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setShowEmbed(true)}
              title={t.runner.embed}
              aria-label={t.runner.embed}
            >
              <Code className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleCopyLink}
            title={t.runner.copyLink}
            aria-label={t.runner.copyLink}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
            <a href={rawUrl} target="_blank" rel="noopener noreferrer" title={t.runner.openNewTab} aria-label={t.runner.openNewTab}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>

          <LanguageToggle />
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleFullscreen}
            title={isFullscreen ? t.runner.exitFullscreen : t.runner.fullscreen}
            aria-label={isFullscreen ? t.runner.exitFullscreen : t.runner.fullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </header>

      {/* Info & Related Projects Popover Banner */}
      {showInfo && (
        <div className="bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex flex-col gap-3 text-xs text-muted-foreground z-20 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div>
                <span className="text-muted-foreground">{t.runner.category}</span>
                <span className="text-foreground font-medium">{project.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t.runner.status}</span>
                <span className="text-foreground font-medium">
                  {isPrivate
                    ? isOwner
                      ? "私有 (所有者可访问)"
                      : "私有保护"
                    : project.visibility === "unlisted"
                    ? "未公开 (口令保护)"
                    : t.runner.plainOutput}
                </span>
              </div>
              {project.description && (
                <div className="max-w-md truncate">
                  <span className="text-muted-foreground">{t.runner.description}</span>
                  <span className="text-foreground">{project.description}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowInfo(false)}>
              {t.runner.close}
            </Button>
          </div>

          {/* Related Projects Showcase */}
          {relatedProjects.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{t.runner.relatedTitle}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {relatedProjects.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/p/${rel.slug}`}
                    className="p-2 rounded border border-border/60 bg-muted/20 hover:bg-muted/60 transition-colors flex flex-col gap-1"
                  >
                    <span className="text-[11px] font-medium text-foreground truncate">{rel.title}</span>
                    <span className="text-[10px] text-muted-foreground">{rel.category}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Viewport Canvas */}
      <div
        className={`bg-background flex items-center justify-center relative ${
          isFullscreen
            ? "flex-1 overflow-hidden"
            : "h-[calc(100vh-48px)] min-h-[540px] w-full border-b border-border/80"
        } ${device === "desktop" ? "p-0" : "p-4 sm:p-6"}`}
      >
        <div
          className={`transition-[width,max-width,height,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${
            device === "desktop"
              ? "w-full h-full max-w-none rounded-none border-0"
              : device === "tablet"
              ? "w-[768px] max-w-full rounded-lg shadow-lg border border-border overflow-hidden my-auto h-[95%] bg-card"
              : "w-[375px] max-w-full rounded-lg shadow-lg border border-border overflow-hidden my-auto h-[95%] bg-card"
          }`}
        >
          {device !== "desktop" && (
            <div className="h-6 bg-muted/50 flex items-center justify-between px-3 shrink-0 border-b border-border select-none">
              <span className="text-[10px] font-mono text-muted-foreground tracking-tight">
                {device === "tablet" ? "768 × 1024" : "375 × 667"}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">
                {device}
              </span>
            </div>
          )}

          <div className="flex-1 bg-card dark:bg-neutral-950 relative w-full h-full overflow-hidden">
            {/* Indeterminate Hairline Progress Bar */}
            {isIframeLoading && (
              <div className="absolute top-0 left-0 right-0 h-[2px] w-full z-20 overflow-hidden bg-muted/40">
                <div className="h-full bg-foreground dark:bg-zinc-200 animate-pulse w-full" />
              </div>
            )}

            {/* Sandbox Bootloader Minimal Center Overlay */}
            <div
              className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 dark:bg-neutral-950/90 backdrop-blur-[2px] transition-opacity duration-300 ${
                isIframeLoading
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/90 shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {t.runner.initializingSandbox || "正在初始化安全沙箱..."}
                </span>
              </div>
            </div>

            <iframe
              key={reloadKey}
              src={rawUrl}
              title={project.title}
              sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-modals"
              allow="fullscreen; clipboard-write"
              allowFullScreen
              onLoad={() => setIsIframeLoading(false)}
              className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${
                isIframeLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          </div>
        </div>

        {/* Viral Badge */}
        <div className="absolute bottom-2.5 right-3 z-10 pointer-events-auto">
          <Link
            href="/"
            target="_blank"
            title="Hosted on Pagepod - Free HTML Sandbox"
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:animate-pulse" />
            <span>Hosted on <strong className="font-semibold text-foreground">Pagepod</strong></span>
          </Link>
        </div>
      </div>

      {/* Second-Screen SEO & Contextual Details Section (Boutique Tool Page V2.0) */}
      {!isFullscreen && (
        <section className="w-full bg-background/60 border-t border-border/40 py-12 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Breadcrumb Navigation for SEO */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <Link href="/explore" className="hover:text-foreground transition-colors">
                Explore
              </Link>
              {project.category && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <Link href={`/explore/${project.category}`} className="hover:text-foreground transition-colors capitalize">
                    {project.category}
                  </Link>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-foreground font-medium truncate max-w-[200px]">{project.title}</span>
            </nav>

            {/* Main Details Card */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-border">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs uppercase font-mono">
                    {project.category || "Tool"}
                  </Badge>
                  {project.assetType && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {project.assetType === "single_html" ? "HTML" : "Zip Bundle"}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    {project.viewCount} views
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  About {project.title}
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.description ||
                    `Interactive web application: ${project.title}. Safely sandboxed and hosted on Pagepod.`}
                </p>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-xs font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Card */}
              <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-card/60 sm:min-w-[220px] shrink-0 text-xs">
                <div className="font-semibold text-foreground mb-1">Actions</div>
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={() => setShowCode(true)}>
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{t.runner.sourceCode}</span>
                </Button>
                {!isPrivate && (
                  <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={() => setShowEmbed(true)}>
                    <Code className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.runner.embed}</span>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" onClick={handleCopyLink}>
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span>{copiedLink ? t.runner.copied : t.runner.copyLink}</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8 justify-start gap-2 text-xs" asChild>
                  <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.runner.openNewTab}</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-foreground text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Hardened Sandbox</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Runs inside an isolated iframe with strict CSP headers, preventing unauthorized access to host cookies or storage.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-foreground text-xs">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>Zero Build Overhead</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pure client execution without Node.js build bottlenecks. Fast startup with zero egress bandwidth overhead.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-foreground text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Responsive Testbed</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Instant simulation across desktop, tablet, and mobile viewports with native resolution scaling.
                </p>
              </div>
            </div>

            {/* Related Projects Showcase (Internal Link Powerhouse) */}
            {relatedProjects.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>More in {project.category || "Collections"}</span>
                  </h3>
                  <Link
                    href={project.category ? `/explore/${project.category}` : "/explore"}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {relatedProjects.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/p/${rel.slug}`}
                      className="group p-4 rounded-xl border border-border bg-card hover:border-foreground/30 transition-all flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono mb-2">
                          {rel.category}
                        </Badge>
                        <h4 className="text-xs font-semibold text-foreground group-hover:text-foreground line-clamp-1 mb-1">
                          {rel.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {rel.description || "Interactive HTML project hosted on Pagepod."}
                        </p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span className="truncate max-w-[100px]">/p/{rel.slug}</span>
                        <span className="flex items-center gap-1 text-emerald-500 font-medium shrink-0">
                          <Play className="w-2.5 h-2.5 fill-emerald-500" />
                          Play
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Source Code Modal */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 border-border bg-card">
          <DialogHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-xs font-mono font-medium">
                {project.entryPath}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                {t.runner.sourceCode}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 mr-6">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleCopyCode}>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? t.runner.copied : t.runner.copySource}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 p-4 overflow-auto bg-neutral-950 font-mono text-xs text-neutral-300">
            <pre className="leading-relaxed whitespace-pre-wrap selection:bg-neutral-700">
              {initialSourceCode || "暂无源代码"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Modal */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="max-w-xl border-border bg-card">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-500" />
              <span>{t.runner.embedTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t.runner.embedDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative rounded-lg bg-neutral-950 p-3 font-mono text-xs text-neutral-300 border border-border/40 overflow-x-auto selection:bg-neutral-700">
              <code>{embedSnippet}</code>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">包含安全沙箱隔离参数，可安全嵌入任意站点</span>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(embedSnippet);
                  setCopiedEmbed(true);
                  setTimeout(() => setCopiedEmbed(false), 2000);
                }}
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmbed ? t.runner.copied : t.runner.copyEmbed}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Anti-Bounce Drawer for Engagement & Internal Linking */}
      <AntiBounceDrawer
        project={project}
        relatedProjects={relatedProjects}
        onOpenSourceModal={() => setShowCode(true)}
        onOpenShareModal={() => setShowEmbed(true)}
      />
    </div>
  );
}
