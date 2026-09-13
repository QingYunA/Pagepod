"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, Link as LinkIcon, Check, Copy, ExternalLink, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scanForSecrets, type SecretFinding } from "@/lib/security/secret-guard";
import { submitGuestUpload } from "@/app/actions/guest";

const LOCAL_STORAGE_KEY = "pagepod_guest_claims";

export function InstantUploadCard() {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedResult, setUploadedResult] = useState<{
    slug: string;
    url: string;
    title: string;
    claimToken: string;
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

  const processUpload = async (file: File, force = false) => {
    setErrorMsg(null);

    if (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm")) {
      setErrorMsg("Guest quick-host only supports single .html files (max 2MB). Please sign in for zip bundles.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File exceeds 2MB guest limit. Please sign in to upload larger files.");
      return;
    }

    try {
      const content = await file.text();

      // Client-side instant pre-flight secret leak scan
      if (!force) {
        const finding = scanForSecrets(content);
        if (finding) {
          setPendingSecretFile({ content, file, finding });
          return;
        }
      }

      setIsPending(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await submitGuestUpload(formData, force);
      if (!res.success) {
        setErrorMsg(res.error || "Upload failed");
      } else if (res.slug && res.url && res.claimToken) {
        setUploadedResult({
          slug: res.slug,
          url: res.url,
          title: res.title || res.slug,
          claimToken: res.claimToken,
        });
        saveClaimToStorage(res.slug, res.claimToken);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during upload.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUpload(e.target.files[0]);
    }
  };

  const handleCopyLink = () => {
    if (!uploadedResult) return;
    const fullUrl = `${window.location.origin}${uploadedResult.url}`;
    navigator.clipboard.writeText(fullUrl);
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
                Potential Secret Detected / 检测到代码疑似包含私有密钥
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Found {pendingSecretFile.finding.label} (<code className="bg-muted px-1 py-0.5 rounded font-mono">{pendingSecretFile.finding.snippet}</code>).
                Guest uploads are publicly visible to everyone by default. Publishing keys may lead to unauthorized API usage.
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
              Cancel & Clean File
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
              I Understand, Publish Anyway
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
                Drop your HTML file here to get an instant shareable link
              </h3>
              <p className="text-xs text-muted-foreground">
                No sign-up required · Sandboxed runner · Up to 2MB free
              </p>
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
                    Deploying Sandbox...
                  </>
                ) : (
                  "Select HTML File"
                )}
              </Button>
            </div>

            <div className="pt-2 flex items-center gap-3 text-[11px] text-muted-foreground/80">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Hardened CSP Isolation
              </span>
              <span>·</span>
              <span>Public by Default</span>
              <span>·</span>
              <span>Instant Share URL</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                  LIVE & SANDBOXED
                </Badge>
                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
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
                Upload Another
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
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                Ownership token stored in browser. Sign in anytime to manage.
              </p>
              <a
                href={uploadedResult.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Run Online
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
