"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileCode2,
  FolderArchive,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  X,
  Upload,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Bot,
  Palette,
  Globe,
} from "lucide-react";
import { handleUploadAction } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { scanHtmlForSensitiveData, type SensitiveRiskMatch } from "@/lib/scanner/sensitive-scanner";
import { PublicRiskDialog } from "@/components/public-risk-dialog";
import HoverSandboxPreview from "@/components/hover-sandbox-preview";
import { sandboxPool } from "@/lib/sandbox-pool";
import { detectHtmlLanguage } from "@/lib/parser/language-detector";
import { useLanguage } from "@/lib/i18n/context";

const CATEGORIES = [
  { id: "tools", label: "实用工具", icon: Wrench },
  { id: "ai", label: "AI 应用", icon: Bot },
  { id: "games", label: "互动游戏", icon: Gamepad2 },
  { id: "creative", label: "创意与 3D", icon: Palette },
  { id: "visualization", label: "数据可视化", icon: BarChart3 },
  { id: "prototypes", label: "页面原型", icon: Smartphone },
  { id: "animations", label: "动效演示", icon: Sparkles },
  { id: "others", label: "其他", icon: Layers },
];

const SUGGESTED_TAGS = ["Canvas", "SVG", "Three.js", "Tailwind", "Vue", "React", "WebAudio", "ECharts"];

export default function WorkspaceUploadPage() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pasteContent, setPasteContent] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tools");
  const [language, setLanguage] = useState<string>("auto");
  const [detectedLangHint, setDetectedLangHint] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isPinned, setIsPinned] = useState(false);
  const [isGlobalPinned, setIsGlobalPinned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user && (data.user.role === "admin" || data.user.id === "selfhost-admin")) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  // Public Risk Dialog & Sensitive Matches
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [detectedRisks, setDetectedRisks] = useState<SensitiveRiskMatch[]>([]);
  const [bypassedRiskCheck, setBypassedRiskCheck] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successSlug, setSuccessSlug] = useState<string | null>(null);

  useEffect(() => {
    if (successSlug) {
      sandboxPool.activate(successSlug);
    }
  }, [successSlug]);

  const tryExtractFromHtml = (html: string) => {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch =
      html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);

    if (titleMatch && titleMatch[1]) {
      const extractedTitle = titleMatch[1].trim();
      if (extractedTitle) {
        setTitle(extractedTitle);
        const autoSlug = extractedTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .slice(0, 30);
        if (autoSlug) setSlug(autoSlug);
      }
    }

    if (descMatch && descMatch[1]) {
      setDescription(descMatch[1].trim());
    }

    const detected = detectHtmlLanguage(html);
    setDetectedLangHint(detected);
  };

  const processFile = async (selected: File) => {
    if (!selected) return;
    setFile(selected);
    setErrorMessage("");

    const ext = selected.name.toLowerCase();
    if (ext.endsWith(".html") || ext.endsWith(".htm")) {
      try {
        const text = await selected.text();
        tryExtractFromHtml(text);
      } catch {
        const baseName = selected.name.replace(/\.[^/.]+$/, "");
        if (!title) setTitle(baseName);
        if (!slug) setSlug(baseName.toLowerCase().replace(/[^\w-]/g, "-"));
      }
    } else {
      const baseName = selected.name.replace(/\.[^/.]+$/, "");
      if (!title) setTitle(baseName);
      if (!slug) setSlug(baseName.toLowerCase().replace(/[^\w-]/g, "-"));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      await processFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await processFile(droppedFiles[0]);
    }
  };

  const handlePasteChange = (val: string) => {
    setPasteContent(val);
    if (val.includes("<html") || val.includes("<title")) {
      tryExtractFromHtml(val);
    }
  };

  const handleAddTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const performActualSubmit = async (overrideVisibility?: "public" | "private") => {
    const targetVisibility = overrideVisibility || visibility;
    setErrorMessage("");

    let finalTitle = title.trim();
    let finalSlug = slug.trim();

    if (mode === "file") {
      if (!file) {
        setErrorMessage("请先选择或拖拽要上传的文件（.html 或 .zip）");
        return;
      }
      if (!finalTitle) {
        finalTitle = file.name.replace(/\.[^/.]+$/, "");
      }
    } else {
      if (!pasteContent.trim()) {
        setErrorMessage("请输入或粘贴 HTML 源代码");
        return;
      }
      if (!finalTitle) {
        finalTitle = "未命名 HTML 项目";
      }
    }

    if (!finalSlug) {
      finalSlug =
        finalTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-") || "project";
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("uploadType", mode);
        formData.append("title", finalTitle);
        formData.append("slug", finalSlug);
        formData.append("description", description);
        formData.append("category", category);
        if (language !== "auto") {
          formData.append("language", language);
        }
        formData.append("tags", tags.join(","));
        formData.append("visibility", targetVisibility);
        formData.append("isPinned", String(isPinned));
        if (isAdmin) {
          formData.append("isGlobalPinned", String(isGlobalPinned));
        }

        if (mode === "file" && file) {
          formData.append("file", file);
        } else {
          formData.append("htmlContent", pasteContent);
        }

        try {
          const res = await handleUploadAction(null, formData);
          if (res.error) {
            setErrorMessage(res.error);
          } else if (res.success && res.slug) {
            setSuccessSlug(res.slug);
          }
        } catch (serverActionErr: unknown) {
          console.error("handleUploadAction call error:", serverActionErr);
          // Fallback to direct REST API upload if Server Action fails with network/load error
          try {
            const apiFormData = new FormData();
            if (mode === "file" && file) {
              apiFormData.append("file", file);
            } else {
              apiFormData.append("html", pasteContent);
            }
            apiFormData.append("title", finalTitle);
            apiFormData.append("slug", finalSlug);
            apiFormData.append("description", description);
            apiFormData.append("category", category);
            if (language !== "auto") {
              apiFormData.append("language", language);
            }
            apiFormData.append("tags", tags.join(","));
            apiFormData.append("visibility", targetVisibility);
            apiFormData.append("isPinned", String(isPinned));
            if (isAdmin) {
              apiFormData.append("isGlobalPinned", String(isGlobalPinned));
            }

            const apiRes = await fetch("/api/upload", {
              method: "POST",
              body: apiFormData,
            });
            const apiData = await apiRes.json();
            if (apiRes.ok && apiData.success && apiData.slug) {
              setSuccessSlug(apiData.slug);
              return;
            }
            setErrorMessage(apiData.error || (serverActionErr as Error)?.message || "发布失败，请重试");
          } catch {
            setErrorMessage((serverActionErr as Error)?.message || "发布过程中网络异常，请重试");
          }
        }
      } catch (err: unknown) {
        setErrorMessage((err as Error)?.message || "发布过程中出现异常，请重试");
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // If user chose "public" and hasn't explicitly confirmed disclaimer yet
    if (visibility === "public" && !bypassedRiskCheck) {
      let codeToScan = pasteContent;
      if (mode === "file" && file && (file.name.endsWith(".html") || file.name.endsWith(".htm"))) {
        try {
          codeToScan = await file.text();
        } catch {
          codeToScan = "";
        }
      }

      // Perform static credential & token scan
      const scanResult = scanHtmlForSensitiveData(codeToScan);
      setDetectedRisks(scanResult.matches);
      setShowRiskDialog(true);
      return;
    }

    await performActualSubmit();
  };

  const handleCopyUrl = () => {
    if (!successSlug) return;
    const fullUrl = `${window.location.origin}/p/${successSlug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/workspace" prefetch={true}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> 返回项目列表
            </Link>
          </Button>
          <Badge variant="outline" className="text-[10px] font-mono">
            upload hub
          </Badge>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            发布与托管 HTML
          </h1>
          <p className="text-xs text-muted-foreground">
            支持 HTML 拖拽上传、静态资源 Zip 压缩包自动解压平铺，或直接粘贴源代码。
          </p>
        </div>

        {successSlug ? (
          <Card className="border-border p-8 text-center space-y-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">发布成功！</h2>
              <p className="text-xs text-muted-foreground">
                已分配专属独立沙箱路由：
                <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                  /p/{successSlug}
                </code>
              </p>
            </div>

            {/* Live 16:9 Sandboxed Miniature Preview with Hover-to-Activate */}
            <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg border border-border/80 overflow-hidden shadow-sm">
              <HoverSandboxPreview
                slug={successSlug}
                title={title || successSlug}
                category={category}
                openRunnerText="立即体验"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleCopyUrl}
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? "已复制直链" : "复制运行链接"}</span>
              </Button>
            </div>

            {visibility === "private" && (
              <div className="p-3.5 rounded-lg bg-muted/60 border border-border text-left space-y-1 max-w-md mx-auto">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 账号级私有保护已生效
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  该项目仅限您当前登录的账号访问。在任何电脑或手机上登录 GitHub / Google 账号即可直接打开，无需输入任何密码；未登录访客将被严格拒绝。
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2">
              <Button size="sm" asChild>
                <Link href={`/p/${successSlug}`}>
                  立即在运行台体验
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSuccessSlug(null);
                  setFile(null);
                  setPasteContent("");
                  setTitle("");
                  setSlug("");
                  setDescription("");
                  setTags([]);
                  setBypassedRiskCheck(false);
                }}
              >
                继续上传下一个
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Type Selector using Tabs */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as "file" | "paste")}>
              <TabsList className="grid grid-cols-2 w-full h-9">
                <TabsTrigger value="file" className="gap-1.5 text-xs">
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>上传文件 (.html / .zip)</span>
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-1.5 text-xs">
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>直接粘贴代码</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: FILE DROPZONE */}
              <TabsContent value="file" className="mt-3">
                <Card>
                  <CardContent className="p-4">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer text-center transition-all ${
                        isDragging
                          ? "border-primary bg-accent/50 scale-[1.01]"
                          : "border-border hover:border-foreground/40 bg-muted/10 hover:bg-muted/30"
                      }`}
                    >
                      <UploadCloud
                        className={`w-10 h-10 mb-2 transition-colors ${
                          isDragging ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <p className="text-xs font-medium text-foreground">
                        {isDragging ? "松开鼠标即可上传该文件" : "点击选择 或 直接将文件拖拽至此处"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        支持单个 <code className="font-mono text-foreground font-semibold">.html</code> 或包含子资源的{" "}
                        <code className="font-mono text-foreground font-semibold">.zip</code> 压缩包
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-4 text-xs gap-1.5 pointer-events-none"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>浏览本地文件</span>
                      </Button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".html,.htm,.zip"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </div>

                    {file && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-muted/40 border border-border rounded-md text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{file.name}</span>
                          <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px] text-emerald-500 font-normal">
                            已就绪
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            title="移除文件"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: DIRECT PASTE */}
              <TabsContent value="paste" className="mt-3">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>HTML 源代码</span>
                      <span>粘贴后将自动抽取 &lt;title&gt; 作为标题</span>
                    </div>
                    <Textarea
                      rows={9}
                      aria-label="HTML 源代码"
                      value={pasteContent}
                      onChange={(e) => handlePasteChange(e.target.value)}
                      placeholder="<!DOCTYPE html><html>... 在此粘贴 AI 编写的 HTML 代码"
                      className="bg-neutral-950 border-border font-mono resize-y text-neutral-200"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Metadata Card */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-foreground">
                  项目属性与展示设置
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="upload-title" className="block mb-1.5">
                      项目标题
                    </Label>
                    <Input
                      id="upload-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={file ? file.name.replace(/\.[^/.]+$/, "") : "例如：2048 小游戏"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="upload-slug" className="block mb-1.5">
                      短链接路由 Slug
                    </Label>
                    <div className="flex items-center rounded-md border border-input bg-transparent px-2.5 h-8 text-xs">
                      <span className="text-muted-foreground font-mono text-[11px] mr-1">/p/</span>
                      <input
                        id="upload-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="game-2048"
                        className="w-full bg-transparent text-foreground outline-none font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="upload-description" className="block mb-1.5">
                    简介描述（可选）
                  </Label>
                  <Input
                    id="upload-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="简要概括项目的功能或操作指南"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    所属分类
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-foreground text-background font-semibold border-foreground"
                              : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <Label htmlFor="upload-language" className="block mb-1.5">
                    {t.workspace?.languageLabel || "主要语言 (Language)"}
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <Select
                      id="upload-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-xs h-8 px-2.5 py-1 bg-muted/20 border-border w-52"
                    >
                      <option value="auto">
                        {t.workspace?.languageAuto || "自动检测 (Auto)"}{detectedLangHint ? ` → ${detectedLangHint === "zh" ? (t.workspace?.langZh || "中文") : detectedLangHint === "en" ? (t.workspace?.langEn || "English") : (t.workspace?.langOther || "Other")}` : ""}
                      </option>
                      <option value="zh">{t.workspace?.langZh || "中文 (Chinese)"}</option>
                      <option value="en">{t.workspace?.langEn || "英文 (English)"}</option>
                      <option value="other">{t.workspace?.langOther || "其他 (Other)"}</option>
                    </Select>
                    <span className="text-[11px] text-muted-foreground">
                      {t.workspace?.languageHint || "基于 HTML 智能启发式算法自动识别，亦可手动锁定"}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    标签 (Tags)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[11px] gap-1 px-2 py-0.5">
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-destructive text-muted-foreground ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag(tagInput);
                        }
                      }}
                      placeholder="输入标签按回车添加..."
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tagInput)}
                      className="text-xs shrink-0"
                    >
                      添加
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                    <span>推荐标签：</span>
                    {SUGGESTED_TAGS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleAddTag(st)}
                        className="hover:text-foreground transition-colors cursor-pointer"
                      >
                        #{st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility and Pin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <Label htmlFor="upload-visibility" className="block mb-1.5">
                      公开访问状态
                    </Label>
                    <Select
                      id="upload-visibility"
                      value={visibility}
                      onChange={(e) => {
                        setVisibility(e.target.value as "public" | "private");
                        setBypassedRiskCheck(false);
                      }}
                    >
                      <option value="public">公开 (Showcase 画廊展示)</option>
                      <option value="private">私有 (仅自己可见，绝对保密)</option>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2.5 h-8 cursor-pointer select-none">
                      <Checkbox
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                      />
                      <span className="text-xs text-foreground font-medium">
                        {t.workspace?.workspacePinLabel || "置顶到个人工作区"}
                      </span>
                    </label>

                    {isAdmin && (
                      <label className="flex items-center gap-2.5 h-8 cursor-pointer select-none">
                        <Checkbox
                          checked={isGlobalPinned}
                          onChange={(e) => setIsGlobalPinned(e.target.checked)}
                        />
                        <span className="text-xs text-foreground font-medium flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-foreground" />
                          <span>{t.workspace?.globalPinLabel || "全站展台首屏置顶 (Admin)"}</span>
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {errorMessage && (
              <div role="alert" className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-9 text-xs font-medium gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在解析文件与部署沙箱资源...</span>
                </>
              ) : (
                "立即保存并发布"
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Public Risk Check & Disclaimer Dialog */}
      <PublicRiskDialog
        open={showRiskDialog}
        onOpenChange={setShowRiskDialog}
        matches={detectedRisks}
        onConfirmPublic={() => {
          setShowRiskDialog(false);
          setBypassedRiskCheck(true);
          performActualSubmit("public");
        }}
        onSwitchToPrivate={() => {
          setShowRiskDialog(false);
          setVisibility("private");
          performActualSubmit("private");
        }}
      />
    </div>
  );
}
