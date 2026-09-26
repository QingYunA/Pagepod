"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import type { ApiToken } from "@/db/schema";
import { createTokenAction, deleteTokenAction } from "@/app/actions/tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

interface TokensClientProps {
  initialTokens: ApiToken[];
  userRole?: string;
}

export default function TokensClient({ initialTokens, userRole }: TokensClientProps) {
  const { t, locale } = useLanguage();
  const [tokens, setTokens] = useState<ApiToken[]>(initialTokens);
  const [isCreating, setIsCreating] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenCreate = () => {
    setCreateError(null);
    setTokenName("");
    setIsCreating(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim() || loading) return;

    setCreateError(null);
    setLoading(true);
    const res = await createTokenAction(tokenName);
    setLoading(false);

    if (res.success && res.rawToken && res.tokenRecord) {
      setTokens([res.tokenRecord, ...tokens]);
      setCreatedRawToken(res.rawToken);
      setIsCreating(false);
      setTokenName("");
    } else {
      setCreateError(res.error || t.tokens.createFailed);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    const res = await deleteTokenAction(deleteTargetId);
    setDeleting(false);

    if (res.success) {
      setTokens(tokens.filter((tok) => tok.id !== deleteTargetId));
      setDeleteTargetId(null);
    } else {
      setDeleteError(res.error || t.tokens.revokeFailed);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-xs px-3 sm:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Link href="/workspace" prefetch={true}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Key className="w-4 h-4 text-foreground shrink-0" />
            <span className="font-semibold text-sm tracking-tight truncate max-w-[130px] sm:max-w-none">
              {t.tokens.title}
            </span>
          </div>
          {userRole && (
            <>
              <span className="text-border">/</span>
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {userRole === "admin" ? "admin-pat" : "user-pat"}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs gap-1.5 border-border">
            <Link href="/api/docs" target="_blank">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.tokens.interactiveDocs}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.tokens.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            {t.tokens.subtitle}
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Link href="/workspace/settings">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>{t.tokens.tabSecurity}</span>
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs font-medium cursor-default"
          >
            <Key className="w-3.5 h-3.5 mr-1.5 text-foreground" />
            <span>{t.tokens.tabTokens}</span>
          </Button>
        </div>

        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{t.tokens.activeTokens}</span>
              <Badge variant="secondary" className="text-xs font-mono h-5 px-2">
                {tokens.length}
              </Badge>
            </div>
            <Button onClick={handleOpenCreate} className="h-9 px-4 text-sm gap-2 font-medium cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>{t.tokens.generateToken}</span>
            </Button>
          </div>

          {/* Token List */}
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
            {tokens.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Key className="w-5 h-5" />
                </div>
                <div className="text-sm font-medium text-foreground">{t.tokens.emptyTokensTitle}</div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {t.tokens.emptyTokensDesc}
                </p>
              </div>
            ) : (
              tokens.map((token) => (
                <div key={token.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{token.name}</span>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                        {token.tokenHint}...
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t.tokens.createdAt}: {new Date(token.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</span>
                      <span>•</span>
                      <span>
                        {t.tokens.lastUsed}: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US") : t.tokens.neverUsed}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTargetId(token.id);
                    }}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-border hover:border-destructive/30 shrink-0 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.tokens.revoke}</span>
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Quickstart Code Example */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>{t.tokens.quickstartTitle}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.tokens.quickstartDesc}
            </p>
            <div className="bg-neutral-950 text-neutral-200 rounded p-3 text-xs font-mono overflow-x-auto border border-border/40 select-all">
              curl -X POST https://pagepod.dev/api/upload \<br />
              &nbsp;&nbsp;-H &quot;Authorization: Bearer &lt;YOUR_API_TOKEN&gt;&quot; \<br />
              &nbsp;&nbsp;-F &quot;file=@index.html&quot; \<br />
              &nbsp;&nbsp;-F &quot;title=My Awesome Project&quot;
            </div>
          </div>
        </div>
      </main>

      {/* Create Token Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-md border-border bg-card">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">{t.tokens.dialogGenerateTitle}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t.tokens.dialogGenerateDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="token-name" className="text-sm font-medium text-foreground">{t.tokens.tokenNameLabel}</label>
                <Input
                  id="token-name"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder={t.tokens.tokenNamePlaceholder}
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>

              {createError && (
                <div role="alert" className="text-xs text-destructive flex items-center gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-9 text-sm">
                {t.tokens.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={!tokenName.trim() || loading} className="h-9 text-sm gap-1.5">
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.tokens.generating}</span>
                  </>
                ) : (
                  t.tokens.generateConfirm
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Revoke Token Confirmation Modal */}
      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t.tokens.revokeDialogTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t.tokens.revokeDialogDesc}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div role="alert" className="text-xs text-destructive flex items-center gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              disabled={deleting}
              className="h-9 text-sm"
            >
              {t.tokens.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="h-9 text-sm gap-1.5"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.tokens.revoking}</span>
                </>
              ) : (
                t.tokens.revokeConfirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Generated Success Modal */}
      <Dialog open={Boolean(createdRawToken)} onOpenChange={() => setCreatedRawToken(null)}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.tokens.tokenSuccessTitle}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t.tokens.tokenSuccessWarning}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-border text-foreground font-mono text-xs select-all">
              <span className="flex-1 truncate text-amber-200">{createdRawToken}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1 border-border shrink-0 cursor-pointer"
                onClick={() => createdRawToken && copyToClipboard(createdRawToken)}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? t.tokens.copied : t.tokens.copy}</span>
              </Button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.tokens.tokenCloseNotice}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full h-9 text-sm"
              onClick={() => setCreatedRawToken(null)}
            >
              {t.tokens.iHaveSaved}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
