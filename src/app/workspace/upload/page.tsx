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
  Folder as FolderIcon,
} from "lucide-react";
import { handleUploadAction } from "@/app/actions/upload";
import { getUserFoldersAction } from "@/app/actions/manage";
import type { Folder } from "@/db/schema";
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
import { buildIndentedFolderList } from "@/lib/utils";
import { detectHtmlLanguage } from "@/lib/parser/language-detector";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

const CATEGORY_ITEMS = [
  { id: "tools", icon: Wrench },
  { id: "ai", icon: Bot },
  { id: "games", icon: Gamepad2 },
  { id: "creative", icon: Palette },
  { id: "visualization", icon: BarChart3 },
  { id: "prototypes", icon: Smartphone },
  { id: "animations", icon: Sparkles },
  { id: "others", icon: Layers },
] as const;

const SUGGESTED_TAGS = ["Canvas", "SVG", "Three.js", "Tailwind", "Vue", "React", "WebAudio", "ECharts"];

export default function WorkspaceUploadPage() {
  const { t, locale } = useLanguage();
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [detectedLangHint, setDetectedLangHint] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isPinned, setIsPinned] = useState(false);
  const [isGlobalPinned, setIsGlobalPinned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          if (data.user.role === "admin" || data.user.id === "selfhost-admin") {
            setIsAdmin(true);
          }
          if (data.user.planTier === "pro" || data.user.role === "admin" || data.user.id === "selfhost-admin") {
            setIsPro(true);
          }
        }
      })
      .catch(() => {});

    // Context-aware pre-selection from URL query parameter ?folderId=...
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fid = params.get("folderId");
      if (fid) {
        setSelectedFolderId(fid);
      }
    }

    // Fetch user folders for dropdown selection
    getUserFoldersAction()
      .then((data) => {
        if (Array.isArray(data)) setFolders(data);
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
        setErrorMessage(t.upload.errors.selectFile);
        return;
      }
      if (!finalTitle) {
        finalTitle = file.name.replace(/\.[^/.]+$/, "");
      }
    } else {
      if (!pasteContent.trim()) {
        setErrorMessage(t.upload.errors.emptyPaste);
        return;
      }
      if (!finalTitle) {
        finalTitle = t.upload.errors.untitledFallback;
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
        if (selectedFolderId) {
          formData.append("folderId", selectedFolderId);
        }
        formData.append("tags", tags.join(","));
        formData.append("visibility", targetVisibility);
        formData.append("isPinned", String(isPinned));
        if (isAdmin) {
          formData.append("isGlobalPinned", String(isGlobalPinned));
        }
        formData.append("isWhiteLabel", String(isWhiteLabel));
        if (customSubdomain) {
          formData.append("customSubdomain", customSubdomain.trim().toLowerCase());
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
            if (selectedFolderId) {
              apiFormData.append("folderId", selectedFolderId);
            }
            apiFormData.append("tags", tags.join(","));
            apiFormData.append("visibility", targetVisibility);
            apiFormData.append("isPinned", String(isPinned));
            if (isAdmin) {
              apiFormData.append("isGlobalPinned", String(isGlobalPinned));
            }
            apiFormData.append("isWhiteLabel", String(isWhiteLabel));
            if (customSubdomain) {
              apiFormData.append("customSubdomain", customSubdomain.trim().toLowerCase());
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
            setErrorMessage(apiData.error || (serverActionErr as Error)?.message || t.upload.errors.publishFailed);
          } catch {
            setErrorMessage((serverActionErr as Error)?.message || t.upload.errors.networkFailed);
          }
        }
      } catch (err: unknown) {
        setErrorMessage((err as Error)?.message || t.upload.errors.unexpectedFailed);
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
      if (scanResult.matches.length > 0) {
        setDetectedRisks(scanResult.matches);
        setShowRiskDialog(true);
        return;
      }
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
          <Button variant="ghost" size="sm" asChild className="h-9 text-sm text-muted-foreground hover:text-foreground">
            <Link href="/workspace" prefetch={true}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> {t.upload.backToProjects}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-mono">
              {t.upload.hubBadge}
            </Badge>
          </div>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.upload.pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.upload.pageSubtitle}
          </p>
        </div>

        {successSlug ? (
          <Card className="border-border p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{t.upload.successTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {t.upload.successRouteNotice}
                <code className="mx-1 px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
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
                openRunnerText={t.upload.openRunner}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm gap-1.5"
                onClick={handleCopyUrl}
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? t.upload.copiedLink : t.upload.copyLink}</span>
              </Button>
            </div>

            {visibility === "private" && (
              <div className="p-4 rounded-xl bg-muted/60 border border-border text-left space-y-1.5 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t.upload.privateNoticeTitle}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.upload.privateNoticeDesc}
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <Button size="sm" asChild className="h-9 text-sm">
                <Link href={`/p/${successSlug}`}>
                  {t.upload.viewInRunner}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-sm"
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
                {t.upload.continueUploadNext}
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Type Selector using Tabs */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as "file" | "paste")}>
              <TabsList className="grid grid-cols-2 w-full h-10">
                <TabsTrigger value="file" className="gap-2 text-sm font-medium">
                  <FolderArchive className="w-4 h-4" />
                  <span>{t.upload.tabFile}</span>
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-2 text-sm font-medium">
                  <FileCode2 className="w-4 h-4" />
                  <span>{t.upload.tabPaste}</span>
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
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center transition-all ${
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
                      <p className="text-sm font-medium text-foreground">
                        {isDragging ? t.upload.dropActive : t.upload.dropIdle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.upload.supportedFormats}
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-4 h-9 text-sm gap-2 pointer-events-none"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{t.upload.browseFiles}</span>
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
                      <div className="mt-3 flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-lg text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{file.name}</span>
                          <span className="text-muted-foreground shrink-0 font-mono text-xs">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 text-emerald-500 font-medium">
                            {t.upload.fileReady}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            title={t.upload.removeFile}
                          >
                            <X className="w-4 h-4" />
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.upload.htmlSourceLabel}</span>
                      <span>{t.upload.autoExtractNotice}</span>
                    </div>
                    <Textarea
                      rows={9}
                      aria-label={t.upload.htmlSourceLabel}
                      value={pasteContent}
                      onChange={(e) => handlePasteChange(e.target.value)}
                      placeholder={t.upload.pastePlaceholder}
                      className="bg-neutral-950 border-border font-mono resize-y text-neutral-200 text-sm"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Metadata Card */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {t.upload.sectionMetadata}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="upload-title" className="block mb-1.5 text-sm">
                      {t.upload.titleLabel}
                    </Label>
                    <Input
                      id="upload-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={file ? file.name.replace(/\.[^/.]+$/, "") : t.upload.titlePlaceholder}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="upload-slug" className="block mb-1.5 text-sm">
                      {t.upload.slugLabel}
                    </Label>
                    <div className="flex items-center rounded-lg border border-input bg-transparent px-3 h-9 text-sm">
                      <span className="text-muted-foreground font-mono text-xs mr-1">/p/</span>
                      <input
                        id="upload-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder={t.upload.slugPlaceholder}
                        className="w-full bg-transparent text-foreground outline-none font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="upload-description" className="block mb-1.5 text-sm">
                    {t.upload.descLabel}
                  </Label>
                  <Input
                    id="upload-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.upload.descPlaceholder}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t.upload.categoryLabel}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORY_ITEMS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      const label = (t.categories && t.categories[cat.id as keyof typeof t.categories]) || cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-foreground text-background font-semibold border-foreground"
                              : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Folder Selection */}
                <div>
                  <Label htmlFor="upload-folder" className="block mb-1.5">
                    {t.workspace.folders}
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <Select
                      id="upload-folder"
                      value={selectedFolderId || ""}
                      onChange={(e) => setSelectedFolderId(e.target.value ? e.target.value : null)}
                      className="text-xs h-8 px-2.5 py-1 bg-muted/20 border-border w-52"
                    >
                      <option value="">{t.workspace.rootFolderOption}</option>
                      {buildIndentedFolderList(folders).map((f) => (
                        <option key={f.id} value={f.id}>
                          {"\u00A0\u00A0".repeat(f.depth)}{f.depth > 0 ? "└─ " : ""}{f.name}
                        </option>
                      ))}
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {t.workspace.selectTargetFolder}
                    </span>
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <Label htmlFor="upload-language" className="block mb-1.5 text-sm">
                    {t.workspace.languageLabel}
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <Select
                      id="upload-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="text-xs sm:text-sm h-9 px-3 py-1 bg-muted/20 border-border w-56"
                    >
                      <option value="auto">
                        {t.workspace.languageAuto}{detectedLangHint ? ` → ${detectedLangHint === "zh" ? t.workspace.langZh : detectedLangHint === "en" ? t.workspace.langEn : t.workspace.langOther}` : ""}
                      </option>
                      <option value="zh">{t.workspace.langZh}</option>
                      <option value="en">{t.workspace.langEn}</option>
                      <option value="other">{t.workspace.langOther}</option>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {t.workspace.languageHint}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t.upload.tagsLabel}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tagItem) => (
                      <Badge key={tagItem} variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
                        <span>{tagItem}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tagItem)}
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
                      placeholder={t.upload.tagPlaceholder}
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tagInput)}
                      className="h-9 text-sm shrink-0"
                    >
                      {t.upload.addTag}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <span>{t.upload.recommendedTags}</span>
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
                    <Label htmlFor="upload-visibility" className="block mb-1.5 text-sm">
                      {t.upload.visibilityLabel}
                    </Label>
                    <Select
                      id="upload-visibility"
                      value={visibility}
                      onChange={(e) => {
                        setVisibility(e.target.value as "public" | "private");
                        setBypassedRiskCheck(false);
                      }}
                      className="h-9 text-sm"
                    >
                      <option value="public">{t.upload.visibilityPublic}</option>
                      <option value="private">{t.upload.visibilityPrivate}</option>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2.5 h-9 cursor-pointer select-none">
                      <Checkbox
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                      />
                      <span className="text-sm text-foreground font-medium">
                        {t.workspace.workspacePinLabel}
                      </span>
                    </label>

                    {isAdmin && (
                      <label className="flex items-center gap-2.5 h-9 cursor-pointer select-none">
                        <Checkbox
                          checked={isGlobalPinned}
                          onChange={(e) => setIsGlobalPinned(e.target.checked)}
                        />
                        <span className="text-sm text-foreground font-medium flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-foreground" />
                          <span>{t.workspace.globalPinLabel}</span>
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Pro Perks: White-label & Custom Subdomain */}
                {isPro && (
                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-foreground" />
                        <span>{t.upload.proPerksTitle}</span>
                      </span>
                      <Badge variant="outline" className="text-xs font-mono border-border text-foreground">PRO</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="upload-subdomain" className="block text-sm font-medium text-foreground mb-1.5">
                          {t.upload.subdomainLabel}
                        </label>
                        <div className="flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground focus-within:ring-1 focus-within:ring-ring">
                          <span className="text-xs select-none text-muted-foreground">https://</span>
                          <input
                            id="upload-subdomain"
                            type="text"
                            value={customSubdomain}
                            placeholder={slug || "my-app"}
                            onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                            className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 w-full ml-1"
                          />
                          <span className="text-xs select-none text-muted-foreground">.pagepod.dev</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t.upload.subdomainNotice}</p>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                          <Checkbox
                            checked={isWhiteLabel}
                            onChange={(e) => setIsWhiteLabel(e.target.checked)}
                          />
                          <div>
                            <span className="text-sm text-foreground font-medium block">
                              {t.upload.whiteLabelTitle}
                            </span>
                            <span className="text-xs text-muted-foreground leading-tight block">
                              {t.upload.whiteLabelDesc}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {errorMessage && (
              <div role="alert" className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 text-sm font-medium gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.upload.submitting}</span>
                </>
              ) : (
                t.upload.submitButton
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
