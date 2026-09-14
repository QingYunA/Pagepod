"use client";

import { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Terminal, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
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

interface TokensClientProps {
  initialTokens: ApiToken[];
}

export default function TokensClient({ initialTokens }: TokensClientProps) {
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
      setCreateError(res.error || "创建失败，请稍后重试");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    const res = await deleteTokenAction(deleteTargetId);
    setDeleting(false);

    if (res.success) {
      setTokens(tokens.filter((t) => t.id !== deleteTargetId));
      setDeleteTargetId(null);
    } else {
      setDeleteError(res.error || "撤销失败，请稍后重试");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">活动中的令牌</span>
          <Badge variant="secondary" className="text-xs font-mono h-5 px-2">
            {tokens.length}
          </Badge>
        </div>
        <Button onClick={handleOpenCreate} className="h-9 px-4 text-sm gap-2 font-medium cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>生成新令牌 (Generate new token)</span>
        </Button>
      </div>

      {/* Token List */}
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
        {tokens.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
              <Key className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-foreground">暂无 API 密钥</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              创建一个 Personal Access Token，即可在外部脚本、CI/CD 或 Cursor 中使用标准 API 自动化上传 HTML。
            </p>
          </div>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                    {token.name}
                  </span>
                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                    pp_live_...{token.tokenHint}
                  </code>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span>创建于: {new Date(token.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>
                    最近使用: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : "从未调用"}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTargetId(token.id);
                }}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">撤销 (Revoke)</span>
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Quick Integration / cURL Cheat Sheet */}
      <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span>cURL 快速上传调用范例 (API Quickstart)</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          将下方的 Bearer Token 替换为你生成的 Token，即可通过标准 HTTP POST 将单个 HTML 文件直接部署上线：
        </p>
        <div className="relative group">
          <pre className="p-3 bg-neutral-950 text-neutral-200 rounded-md font-mono text-xs overflow-x-auto leading-relaxed border border-neutral-800">
{`curl -X POST https://www.pagepod.dev/api/upload \\
  -H "Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN" \\
  -F "file=@./index.html" \\
  -F "title=My Interactive Tool" \\
  -F "slug=my-interactive-tool" \\
  -F "category=tools" \\
  -F "description=Interactive utility built with AI" \\
  -F "visibility=public"`}
          </pre>
        </div>
      </div>

      {/* Create Token Modal */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        setIsCreating(open);
        if (!open) setCreateError(null);
      }}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">生成新 Personal Access Token</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              为密钥指定一个备注名，以便日后识别它的使用场景。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="token-name" className="text-sm font-medium text-foreground">Token 备注名称</label>
              <Input
                id="token-name"
                required
                autoFocus
                placeholder="例如：Cursor Sync / CLI Uploader / Raycast"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {createError && (
              <div role="alert" className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-9 text-sm cursor-pointer">
                取消
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="h-9 text-sm font-medium cursor-pointer">
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>正在生成...</span>
                  </>
                ) : (
                  "立即生成"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => {
        if (!open) {
          setDeleteTargetId(null);
          setDeleteError(null);
        }
      }}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">撤销 API 密钥</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              确定要撤销并吊销此 API Token 吗？撤销后所有依赖该密钥的脚本与自动化任务将立刻失效，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div role="alert" className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteTargetId(null)}
              className="h-9 text-sm cursor-pointer"
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="h-9 text-sm font-medium cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>正在撤销...</span>
                </>
              ) : (
                "确认撤销"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success / Show Token Once Modal */}
      <Dialog open={Boolean(createdRawToken)} onOpenChange={(open) => !open && setCreatedRawToken(null)}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Token 已成功生成</span>
            </div>
            <DialogTitle className="text-sm font-normal text-muted-foreground">
              出于安全原因，此 API 密钥<strong>仅在此时展示一次</strong>。请立即复制并妥善保管在本地。
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2 bg-muted p-2 rounded-md border border-border">
              <code className="text-sm font-mono font-medium text-foreground flex-1 break-all select-all">
                {createdRawToken}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => createdRawToken && copyToClipboard(createdRawToken)}
                className="h-8 px-3 text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "已复制" : "复制"}</span>
              </Button>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-500/90 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>一旦关闭此对话框，你将无法再次查看明文，丢失后需重新生成。</span>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setCreatedRawToken(null)} className="h-9 px-4 text-sm font-medium cursor-pointer">
              我已复制并安全保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
