import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Key, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listUserApiTokens } from "@/lib/tokens";
import TokensClient from "./tokens-client";

export const dynamic = "force-dynamic";

export default async function ApiTokensPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/workspace/settings/tokens");
  }

  const tokens = await listUserApiTokens(user.id);

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
            <span className="font-semibold text-sm tracking-tight truncate max-w-[130px] sm:max-w-none">Personal Access Tokens</span>
          </div>
          <span className="text-border">/</span>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {user.role === "admin" ? "admin-pat" : "user-pat"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs gap-1.5 border-border">
            <Link href="/api/docs" target="_blank">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">交互式 </span><span>API 文档</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">API 访问密钥与令牌 (Tokens)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Personal Access Tokens 具备与你的账号同等的权限，可用于在自动化脚本、CI/CD、命令行 CLI 或 Cursor 中代替你上传和管理 HTML。
            密钥采用 SHA-256 加密存储，仅在创建时显示一次。
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
              <span>账号安全与认证</span>
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs font-medium cursor-default"
          >
            <Key className="w-3.5 h-3.5 mr-1.5 text-foreground" />
            <span>API 密钥</span>
          </Button>
        </div>

        <TokensClient initialTokens={tokens} />
      </main>
    </div>
  );
}
