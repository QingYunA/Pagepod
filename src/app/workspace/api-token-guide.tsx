"use client";

import { useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/context";

export default function ApiTokenGuideModal({ configuredTokens: _configuredTokens }: { configuredTokens?: string } = {}) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const curlExample = `curl -X POST https://your-domain.com/api/upload \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "file=@my-tool.html" \\
  -F "title=My Web Tool" \\
  -F "category=tools"`;

  const jsonExample = `curl -X POST https://your-domain.com/api/upload \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Calculator",
    "html": "<!DOCTYPE html><html>...</html>",
    "category": "tools"
  }'`;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 text-xs gap-1.5 shrink-0"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>{isZh ? "API 推送指南" : "API Push Guide"}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isZh ? "API 自动化集成指南" : "API Automation Guide"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isZh
                ? "适合 Cursor、Claude Code 等 AI 工具在生成 HTML 后自动推送入库。"
                : "Automate HTML uploads directly from AI coding agents (Cursor, Claude Code)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1 text-sm">
                {isZh ? "1. 身份鉴权 (Bearer Token)" : "1. Authentication (Bearer Token)"}
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {isZh ? (
                  <>
                    直接使用部署时设置的{" "}
                    <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">
                      ADMIN_PASSWORD
                    </code>{" "}
                    或自定义{" "}
                    <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">
                      API_TOKEN
                    </code>
                    。
                  </>
                ) : (
                  <>
                    Authenticate with your{" "}
                    <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">
                      ADMIN_PASSWORD
                    </code>{" "}
                    or a custom{" "}
                    <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">
                      API_TOKEN
                    </code>
                    .
                  </>
                )}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground text-sm">
                  {isZh ? "2. cURL 文件上传" : "2. cURL File Upload"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-3"
                  aria-label={isZh ? "复制 cURL 示例" : "Copy cURL example"}
                  onClick={() => copyToClipboard("curl", curlExample)}
                >
                  {copiedKey === "curl" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1">
                    {copiedKey === "curl"
                      ? (isZh ? "已复制" : "Copied")
                      : (isZh ? "复制" : "Copy")}
                  </span>
                </Button>
              </div>
              <pre className="p-3 rounded-md bg-neutral-950 font-mono text-xs text-neutral-300 overflow-x-auto border border-border">
                {curlExample}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground text-sm">
                  {isZh
                    ? "3. JSON 直接推送 (供 AI 自动化代码流)"
                    : "3. Direct JSON Push (AI Code Stream)"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-3"
                  aria-label={isZh ? "复制 JSON 示例" : "Copy JSON example"}
                  onClick={() => copyToClipboard("json", jsonExample)}
                >
                  {copiedKey === "json" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1">
                    {copiedKey === "json"
                      ? (isZh ? "已复制" : "Copied")
                      : (isZh ? "复制" : "Copy")}
                  </span>
                </Button>
              </div>
              <pre className="p-3 rounded-md bg-neutral-950 font-mono text-xs text-neutral-300 overflow-x-auto border border-border">
                {jsonExample}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
