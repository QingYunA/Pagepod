"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { scanForSecrets, type SecretFinding } from "@/lib/security/secret-guard";
import { submitGuestUpload } from "@/app/actions/guest";
import type { GuestUploadErrorCode } from "@/lib/services/guest-upload";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { trackEvent } from "@/lib/analytics";
import { saveGuestClaim, GUEST_CLAIMED_EVENT } from "@/lib/storage/guest-claim";

const MAX_GUEST_BYTES = 2 * 1024 * 1024;

type UploadSource = "file" | "paste";

function getErrorMessage(
  code: GuestUploadErrorCode,
  isZh: boolean,
  resetSeconds?: number
): string {
  switch (code) {
    case "rate_limited": {
      const minutes = Math.max(1, Math.ceil((resetSeconds ?? 60) / 60));
      return isZh
        ? `上传次数已达每小时上限，请约 ${minutes} 分钟后重试，或登录后不限次数。`
        : `Hourly upload limit reached. Try again in about ${minutes} min, or sign in for unlimited uploads.`;
    }
    case "too_large":
      return isZh
        ? "内容超过 2MB 访客上限，请登录后上传更大的文件。"
        : "Content exceeds the 2MB guest limit. Please sign in to upload larger files.";
    case "empty":
      return isZh ? "内容为空，请提供有效的 HTML。" : "Content is empty. Please provide valid HTML.";
    case "invalid":
      return isZh ? "HTML 内容无效，请检查后重试。" : "The HTML content is invalid. Please check it and try again.";
    case "policy_blocked":
      return isZh ? "该内容未通过平台安全策略，无法托管。" : "This content was blocked by platform policy.";
    case "secret_confirm":
      return isZh ? "检测到疑似密钥，请确认后再上传。" : "A potential secret was detected. Please confirm before uploading.";
    default:
      return isZh ? "上传失败，请稍后重试。" : "Upload failed. Please try again later.";
  }
}

export function InstantUploadCard({ initialLocale }: { initialLocale?: Locale }) {
  const { locale: clientLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const locale = !mounted && initialLocale ? initialLocale : (clientLocale || initialLocale || "en");
  const isZh = locale === "zh";
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<"unlisted" | "public">("unlisted");
  const [uploadedResult, setUploadedResult] = useState<{
    slug: string;
    url: string;
    title: string;
    claimToken?: string;
    accessToken?: string;
    visibility?: "public" | "unlisted";
    isDirectClaimed?: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Dynamically sync status if guest upload is claimed while staying on current page
  useEffect(() => {
    const handleClaimed = (e: Event) => {
      const customEvent = e as CustomEvent<{ resolvedSlugs?: string[] }>;
      const resolvedSlugs = customEvent.detail?.resolvedSlugs || [];
      setUploadedResult((prev) => {
        if (!prev) return null;
        if (resolvedSlugs.length === 0 || resolvedSlugs.includes(prev.slug)) {
          return { ...prev, isDirectClaimed: true };
        }
        return prev;
      });
    };

    window.addEventListener(GUEST_CLAIMED_EVENT, handleClaimed);
    return () => window.removeEventListener(GUEST_CLAIMED_EVENT, handleClaimed);
  }, []);

  // Secret leak dialog state
  const [pendingSecretFile, setPendingSecretFile] = useState<{
    content: string;
    source: UploadSource;
    file?: File;
    finding: SecretFinding;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveClaimToStorage = (slug: string, claimToken: string) => {
    saveGuestClaim({ slug, claimToken });
  };

  const processContent = useCallback(
    async ({
      content,
      source,
      file,
      force = false,
    }: {
      content: string;
      source: UploadSource;
      file?: File;
      force?: boolean;
    }) => {
      setErrorMsg(null);

      try {
        const sizeBytes = file ? file.size : new Blob([content]).size;

        // Client-side instant pre-flight secret leak scan
        if (!force) {
          const finding = scanForSecrets(content);
          if (finding) {
            trackEvent("drop_html_secret_blocked", {
              secret_type: finding.type,
              visibility,
              source,
            });
            setPendingSecretFile({ content, source, file, finding });
            return;
          }
        }

        setIsPending(true);
        const formData = new FormData();
        if (source === "file" && file) {
          formData.append("file", file);
        } else {
          formData.append("htmlContent", content);
        }
        formData.append("visibility", visibility);

        const res = await submitGuestUpload(formData, force);
        if (!res.success) {
          const code: GuestUploadErrorCode = res.errorCode || "server_error";
          trackEvent("drop_html_failed", { reason: code, visibility, source });
          setErrorMsg(getErrorMessage(code, isZh, res.rateLimitResetInSeconds));
        } else if (res.slug && res.url) {
          trackEvent("drop_html_success", {
            visibility: res.visibility || visibility,
            file_size_kb: Math.round(sizeBytes / 1024),
            source,
          });
          const resolvedVisibility = res.visibility || visibility;
          setUploadedResult({
            slug: res.slug,
            url: res.url,
            title: res.title || res.slug,
            claimToken: res.claimToken,
            accessToken: res.accessToken,
            visibility: res.visibility,
            isDirectClaimed: res.isDirectClaimed,
          });
          if (res.claimToken) {
            saveClaimToStorage(res.slug, res.claimToken);
          }

          // Best-effort auto copy; user activation may have expired after the awaited action.
          try {
            await navigator.clipboard.writeText(`${window.location.origin}${res.url}`);
            setCopied(true);
            trackEvent("drop_html_auto_copy", { ok: true, visibility: resolvedVisibility });
          } catch {
            trackEvent("drop_html_auto_copy", { ok: false, visibility: resolvedVisibility });
          }
        }
      } catch {
        trackEvent("drop_html_failed", { reason: "exception", source });
        setErrorMsg(
          isZh ? "上传过程中出现意外错误，请重试。" : "An unexpected error occurred during upload."
        );
      } finally {
        setIsPending(false);
      }
    },
    [visibility, isZh]
  );

  const processUpload = useCallback(
    async (file: File) => {
      setErrorMsg(null);

      if (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm")) {
        trackEvent("drop_html_failed", { reason: "invalid_extension", source: "file" });
        setErrorMsg(
          isZh
            ? "访客快速托管仅支持单个 .html 文件（最大 2MB）。zip 压缩包请登录后上传。"
            : "Guest quick-host only supports single .html files (max 2MB). Please sign in for zip bundles."
        );
        return;
      }

      if (file.size > MAX_GUEST_BYTES) {
        trackEvent("drop_html_failed", { reason: "file_too_large", size_bytes: file.size, source: "file" });
        setErrorMsg(
          isZh
            ? "文件超过 2MB 访客上限，请登录后上传更大的文件。"
            : "File exceeds 2MB guest limit. Please sign in to upload larger files."
        );
        return;
      }

      let content: string;
      try {
        content = await file.text();
      } catch {
        trackEvent("drop_html_failed", { reason: "exception", source: "file" });
        setErrorMsg(isZh ? "无法读取该文件。" : "Could not read the file.");
        return;
      }
      await processContent({ content, source: "file", file });
    },
    [processContent, isZh]
  );

  const handlePasteSubmit = useCallback(async () => {
    setErrorMsg(null);
    if (!pasteText.trim()) {
      trackEvent("drop_html_failed", { reason: "empty", source: "paste" });
      setErrorMsg(getErrorMessage("empty", isZh));
      return;
    }
    if (new Blob([pasteText]).size > MAX_GUEST_BYTES) {
      trackEvent("drop_html_failed", { reason: "file_too_large", source: "paste" });
      setErrorMsg(getErrorMessage("too_large", isZh));
      return;
    }
    await processContent({ content: pasteText, source: "paste" });
  }, [pasteText, processContent, isZh]);

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

  const handleCopyLink = async () => {
    if (!uploadedResult) return;
    const fullUrl = `${window.location.origin}${uploadedResult.url}`;
    trackEvent("drop_html_copy_link", {
      visibility: uploadedResult.visibility || "unlisted",
    });
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Secret Leak Warning Dialog */}
      {pendingSecretFile && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-foreground space-y-3 transition-all duration-200">
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
              className="h-8 px-3 text-xs border-border/80"
              onClick={() => {
                trackEvent("drop_html_secret_choice", {
                  action: "cancel",
                  secret_type: pendingSecretFile.finding.type,
                });
                setPendingSecretFile(null);
              }}
            >
              {isZh ? "取消并清理文件" : "Cancel & Clean File"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                const pending = pendingSecretFile;
                trackEvent("drop_html_secret_choice", {
                  action: "force",
                  secret_type: pending.finding.type,
                });
                setPendingSecretFile(null);
                void processContent({
                  content: pending.content,
                  source: pending.source,
                  file: pending.file,
                  force: true,
                });
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
        className={`group relative rounded-2xl border transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-md"
            : "border-border/80 bg-card/60 backdrop-blur-sm hover:border-border/90 hover:bg-card/80 shadow-xs"
        } ${!uploadedResult ? "py-10 sm:py-14 px-6 sm:px-12" : "p-6 sm:p-8"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          className="hidden"
          onChange={handleFileChange}
        />

        {!uploadedResult ? (
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Larger Cloud Upload Icon - clickable with hover zoom */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              aria-label={isZh ? "选择 HTML 文件" : "Select HTML File"}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-border/70 bg-muted/40 flex items-center justify-center text-muted-foreground shadow-2xs transition-all duration-200 group-hover:scale-105 group-hover:border-foreground/30 group-hover:text-foreground cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isPending ? (
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-foreground" />
              ) : (
                <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              )}
            </button>

            {/* Headline and Subtitle */}
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {isZh
                  ? "拖拽 HTML 文件 即刻获取分享链接"
                  : "Upload HTML file and get an instant shareable link"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isZh
                  ? "无需登录 · 单文件 HTML 最大 2MB · 3 秒生成安全沙箱链接"
                  : "Zero setup · Single HTML up to 2MB · Ready in 3 seconds"}
              </p>
            </div>

            {/* Visibility Mode Selector */}
            <div className="flex items-center justify-center p-1 rounded-xl border border-border/80 bg-muted/40 text-xs sm:text-sm w-fit mx-auto select-none">
              <button
                type="button"
                onClick={() => setVisibility("unlisted")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer text-xs ${
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer text-xs ${
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
              <p className="text-xs text-destructive font-medium px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 max-w-lg text-center">
                {errorMsg}
              </p>
            )}

            {/* CTA Button */}
            <div className="pt-1 flex items-center gap-3">
              <Button
                variant="outline"
                size="default"
                disabled={isPending}
                className="h-10 text-sm font-medium px-6 shadow-xs border-border/80"
                onClick={() => fileInputRef.current?.click()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isZh ? "正在生成链接..." : "Generating Link..."}
                  </>
                ) : isZh ? (
                  "选择 HTML 文件"
                ) : (
                  "Select HTML File"
                )}
              </Button>
            </div>

            <div className="w-full max-w-lg space-y-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowPaste((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline cursor-pointer"
              >
                {isZh ? "或粘贴 HTML 代码" : "Or paste HTML"}
              </button>
              {showPaste && (
                <div className="space-y-2 text-left">
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    disabled={isPending}
                    rows={8}
                    spellCheck={false}
                    placeholder={isZh ? "在此粘贴完整的 HTML 代码" : "Paste your full HTML code here"}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="default"
                      disabled={isPending || !pasteText.trim()}
                      onClick={handlePasteSubmit}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          {isZh ? "正在生成链接..." : "Generating Link..."}
                        </>
                      ) : isZh ? (
                        "生成链接"
                      ) : (
                        "Get link"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {uploadedResult.visibility === "unlisted" ? (
                  <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 border-emerald-500/30 text-emerald-500 bg-emerald-500/5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    <span>UNLISTED · PROTECTED</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 border-blue-500/30 text-blue-500 bg-blue-500/5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span>PUBLIC SHOWCASE</span>
                  </Badge>
                )}
                <span className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-md">
                  {uploadedResult.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setUploadedResult(null);
                  setErrorMsg(null);
                  setCopied(false);
                  setPasteText("");
                  setShowPaste(false);
                }}
              >
                {isZh ? "继续上传" : "Upload Another"}
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-border/80 bg-muted/30 font-mono text-xs sm:text-sm text-foreground">
              <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">
                {typeof window !== "undefined" ? window.location.origin : ""}{uploadedResult.url}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="default" className="sm:flex-1" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    {isZh ? "已复制链接" : "Link copied"}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    {isZh ? "复制链接" : "Copy link"}
                  </>
                )}
              </Button>
              <Button variant="outline" size="default" className="sm:flex-1" asChild>
                <a
                  href={uploadedResult.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackEvent("drop_html_open_runner", {
                      visibility: uploadedResult.visibility || "unlisted",
                    });
                  }}
                >
                  {isZh ? "在线运行" : "Run Online"}
                  <ExternalLink className="w-4 h-4 ml-1.5" />
                </a>
              </Button>
            </div>

            {uploadedResult.isDirectClaimed ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-relaxed">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{isZh ? "已直接保存至你的工作台。" : "Directly saved to your workspace."}</span>
                <Link
                  href="/workspace"
                  className="text-foreground hover:underline font-medium ml-1 inline-flex items-center gap-0.5"
                >
                  {isZh ? "前往工作台管理" : "Manage"}
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border/80 p-3">
                <div className="space-y-1 text-xs text-muted-foreground leading-relaxed flex-1 min-w-[220px]">
                  <p>
                    {uploadedResult.visibility === "unlisted"
                      ? isZh
                        ? "仅凭链接访问，不会出现在公开画廊。"
                        : "Link-only access; not listed in the public showcase."
                      : isZh
                        ? "已在公共画廊上线展示。"
                        : "Live on the public showcase."}
                  </p>
                  <p>
                    {isZh
                      ? "管理凭据只保存在当前浏览器中。登录后，这个页面会永久保存到你的工作台。"
                      : "The management token is stored only in this browser. Sign in to save this page permanently to your workspace."}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs w-full sm:w-auto" asChild>
                  <Link
                    href="/login?tab=signup"
                    onClick={() => {
                      trackEvent("drop_html_claim_cta", {
                        visibility: uploadedResult.visibility || "unlisted",
                      });
                    }}
                  >
                    {isZh ? "登录认领" : "Sign in to keep it"}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
