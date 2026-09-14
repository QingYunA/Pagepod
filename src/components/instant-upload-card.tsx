"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scanForSecrets, type SecretFinding } from "@/lib/security/secret-guard";
import { submitGuestUpload } from "@/app/actions/guest";
import { useLanguage } from "@/lib/i18n/context";
import { trackEvent } from "@/lib/analytics";

const LOCAL_STORAGE_KEY = "pagepod_guest_claims";

export function InstantUploadCard() {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<"unlisted" | "public">("unlisted");
  const [uploadedResult, setUploadedResult] = useState<{
    slug: string;
    url: string;
    title: string;
    claimToken: string;
    accessToken?: string;
    visibility?: "public" | "unlisted";
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Secret leak dialog state
  const [pendingSecretFile, setPendingSecretFile] = useState<{
    content: string;
    file: File;
    finding: SecretFinding;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveClaimToStorage = (slug: string, claimToken: string) => {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const list: Array<{ slug: string; claimToken: string }> = existingRaw ? JSON.parse(existingRaw) : [];
      list.push({ slug, claimToken });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Non-fatal localStorage error
    }
  };

  const processUpload = useCallback(
    async (file: File, force = false) => {
      setErrorMsg(null);

      if (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm")) {
        trackEvent("drop_html_failed", { reason: "invalid_extension" });
        setErrorMsg("Guest quick-host only supports single .html files (max 2MB). Please sign in for zip bundles.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        trackEvent("drop_html_failed", { reason: "file_too_large", size_bytes: file.size });
        setErrorMsg("File exceeds 2MB guest limit. Please sign in to upload larger files.");
        return;
      }

      try {
        const content = await file.text();

        // Client-side instant pre-flight secret leak scan
        if (!force) {
          const finding = scanForSecrets(content);
          if (finding) {
            trackEvent("drop_html_secret_blocked", {
              secret_type: finding.type,
              visibility,
            });
            setPendingSecretFile({ content, file, finding });
            return;
          }
        }

        setIsPending(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("visibility", visibility);

        const res = await submitGuestUpload(formData, force);
        if (!res.success) {
          trackEvent("drop_html_failed", {
            reason: res.error || "upload_failed",
            visibility,
          });
          setErrorMsg(res.error || "Upload failed");
        } else if (res.slug && res.url && res.claimToken) {
          trackEvent("drop_html_success", {
            visibility: res.visibility || visibility,
            file_size_kb: Math.round(file.size / 1024),
          });
          setUploadedResult({
            slug: res.slug,
            url: res.url,
            title: res.title || res.slug,
            claimToken: res.claimToken,
            accessToken: res.accessToken,
            visibility: res.visibility,
          });
          saveClaimToStorage(res.slug, res.claimToken);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred during upload.";
        trackEvent("drop_html_failed", { reason: "exception" });
        setErrorMsg(msg);
      } finally {
        setIsPending(false);
      }
    },
    [visibility]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processUpload(e.dataTransfer.files[0]);
      }
    },
    [processUpload]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUpload(e.target.files[0]);
    }
  };

  const handleCopyLink = () => {
    if (!uploadedResult) return;
    const fullUrl = `${window.location.origin}${uploadedResult.url}`;
    navigator.clipboard.writeText(fullUrl);
    trackEvent("drop_html_copy_link", {
      visibility: uploadedResult.visibility || "unlisted",
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Secret Leak Warning Dialog */}
      {pendingSecretFile && (
        <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-foreground space-y-3 transition-all duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-amber-500">
                {isZh ? "检测到代码疑似包含私有密钥" : "Potential Secret Detected in Code"}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {isZh
                  ? `发现 ${pendingSecretFile.finding.label} (${pendingSecretFile.finding.snippet})。${
                      visibility === "unlisted"
                        ? "尽管该项目配置为口令保护，仍强烈建议在分享前清除敏感信息，避免密钥泄露。"
                        : "公开项目将在画廊向全球展示，公开私有密钥可能导致非预期的 API 账单扣费。"
                    }`
                  : `Found ${pendingSecretFile.finding.label} (${pendingSecretFile.finding.snippet}). ${
                      visibility === "unlisted"
                        ? "Although protected by an access token, it is strongly advised to remove keys before sharing."
                        : "Guest uploads with public showcase are visible to everyone. Publishing keys may lead to unauthorized API charges."
                    }`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border/80"
              onClick={() => setPendingSecretFile(null)}
            >
              {isZh ? "取消并清理文件" : "Cancel & Clean File"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const f = pendingSecretFile.file;
                setPendingSecretFile(null);
                processUpload(f, true);
              }}
            >
              {isZh ? "我已知晓风险，继续上传" : "I Understand, Upload Anyway"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Upload / Result Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border p-5 sm:p-6 transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border/80 bg-card/60 backdrop-blur-sm hover:border-border"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          className="hidden"
          onChange={handleFileChange}
        />

        {!uploadedResult ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full border border-border/60 bg-muted/40 flex items-center justify-center text-muted-foreground">
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-foreground" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground tracking-tight">
                {isZh
                  ? "拖入单文件 HTML 即刻获取分享链接"
                  : "Drop your HTML file here to get an instant shareable link"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isZh
                  ? "无需登录 · 安全沙箱隔离 · 2MB 免费免配置"
                  : "No sign-up required · Sandboxed runner · Up to 2MB free"}
              </p>
            </div>

            {/* Visibility Mode Selector */}
            <div className="flex items-center justify-center p-0.5 rounded-lg border border-border/80 bg-muted/40 text-xs w-fit mx-auto select-none">
              <button
                type="button"
                onClick={() => setVisibility("unlisted")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                  visibility === "unlisted"
                    ? "bg-background text-foreground shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isZh ? "仅凭链接访问 (口令保护)" : "Unlisted (Token Protected)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                  visibility === "public"
                    ? "bg-background text-foreground shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>{isZh ? "公开展示 (画廊收录)" : "Public (Showcase Index)"}</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-destructive font-medium px-2 py-1 rounded bg-destructive/10 border border-destructive/20">
                {errorMsg}
              </p>
            )}

            <div className="pt-1 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs font-medium px-4 shadow-sm border-border/80"
                onClick={() => fileInputRef.current?.click()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    {isZh ? "正在部署沙箱..." : "Deploying Sandbox..."}
                  </>
                ) : isZh ? (
                  "选择 HTML 文件"
                ) : (
                  "Select HTML File"
                )}
              </Button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] text-muted-foreground/80">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                {isZh ? "严格 CSP 物理隔离" : "Hardened CSP Isolation"}
              </span>
              <span>·</span>
              <span>
                {visibility === "unlisted"
                  ? isZh ? "默认口令保护防探测" : "Token Protected (NoIndex)"
                  : isZh ? "公开画廊聚合收录" : "Public Showcase Index"}
              </span>
              <span>·</span>
              <span>{isZh ? "免配置即时分享" : "Zero-Config Instant Link"}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uploadedResult.visibility === "unlisted" ? (
                  <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>UNLISTED · PROTECTED</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 border-blue-500/30 text-blue-500 bg-blue-500/5 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>PUBLIC SHOWCASE</span>
                  </Badge>
                )}
                <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                  {uploadedResult.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setUploadedResult(null);
                  setErrorMsg(null);
                }}
              >
                {isZh ? "继续上传" : "Upload Another"}
              </Button>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-border/80 bg-muted/30 font-mono text-xs text-foreground">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">
                {typeof window !== "undefined" ? window.location.origin : ""}{uploadedResult.url}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs px-2.5 shrink-0"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-emerald-500" />
                    {isZh ? "已复制" : "Copied"}
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    {isZh ? "复制链接" : "Copy"}
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {uploadedResult.visibility === "unlisted"
                  ? isZh
                    ? "已生成专属访问口令，未在公开画廊展示。随时登录可认领管理。"
                    : "Protected by access token and excluded from showcase. Sign in anytime to manage."
                  : isZh
                  ? "已在公共画廊上线展示。管理凭据已保存在本机。"
                  : "Live on public showcase. Ownership token stored in browser."}
              </p>
              <a
                href={uploadedResult.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackEvent("drop_html_open_runner", {
                    visibility: uploadedResult.visibility || "unlisted",
                  });
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0 ml-2"
              >
                {isZh ? "在线运行" : "Run Online"}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
