"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Code2,
  Settings,
  Eye,
  Check,
  AlertCircle,
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  Layers,
  Loader2,
  RotateCw,
  Camera,
  Bot,
  Palette,
  Globe,
} from "lucide-react";
import type { Project, Folder } from "@/db/schema";
import { useLanguage } from "@/lib/i18n/context";
import { buildIndentedFolderList } from "@/lib/utils";

// CodeMirror (+ @codemirror/lang-html) is large. Load the whole editor only when the
// code tab actually renders, keeping it out of the route's initial client bundle.
const CodeMirror = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
      正在加载编辑器…
    </div>
  ),
});
import { updateProjectFullAction } from "@/app/actions/edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EditorClientProps {
  project: Project;
  initialCode: string;
  isAdmin?: boolean;
  folders?: Folder[];
}

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

export default function ProjectEditorClient({ project, initialCode, isAdmin = false, folders = [] }: EditorClientProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"code" | "settings">("code");
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [category, setCategory] = useState(project.category);
  const [folderId, setFolderId] = useState<string | null>(project.folderId ?? null);
  const [language, setLanguage] = useState<"zh" | "en" | "other">((project.language as "zh" | "en" | "other") || "zh");
  const [tags, setTags] = useState<string[]>((project.tags as string[]) || []);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">(
    project.visibility === "private" || (project.visibility as string) === "unlisted" ? "private" : "public"
  );
  const [isPinned, setIsPinned] = useState(project.isPinned);
  const [isGlobalPinned, setIsGlobalPinned] = useState(Boolean(project.isGlobalPinned));
  const [isWhiteLabel, setIsWhiteLabel] = useState(Boolean(project.isWhiteLabel));
  const [customSubdomain, setCustomSubdomain] = useState(project.customSubdomain || "");

  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleManualScreenshot = async () => {
    if (capturingScreenshot) return;
    setCapturingScreenshot(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/projects/${project.id}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "capture" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "更新截图失败");
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      setErrorMsg("网络异常，更新截图失败");
    } finally {
      setCapturingScreenshot(false);
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

  const handleSave = () => {
    setErrorMsg("");
    setSavedSuccess(false);

    startTransition(async () => {
      try {
        await updateProjectFullAction(project.id, {
          title,
          description,
          category,
          language,
          folderId,
          tags,
          visibility,
          isPinned,
          isGlobalPinned: isAdmin ? isGlobalPinned : undefined,
          isWhiteLabel,
          customSubdomain: customSubdomain ? customSubdomain.trim().toLowerCase() : null,
          htmlCode: project.assetType === "single_html" ? code : undefined,
        });
        setSavedSuccess(true);
        setPreviewLoading(true);
        setPreviewKey((k) => k + 1);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (err: unknown) {
        setErrorMsg((err as Error)?.message || "保存失败");
      }
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden antialiased">
      {/* Top Header */}
      <header className="h-12 border-b border-border bg-background/95 backdrop-blur-xs px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/workspace" prefetch={true}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground max-w-xs truncate">
              {title || "编辑项目"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">/p/{project.slug}</span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
          <Button
            variant={activeTab === "code" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("code")}
            className="h-8 px-3 text-xs font-medium gap-1.5 rounded-md"
          >
            <Code2 className="w-3.5 h-3.5" /> 代码与即时预览
          </Button>
          <Button
            variant={activeTab === "settings" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("settings")}
            className="h-8 px-3 text-xs font-medium gap-1.5 rounded-md"
          >
            <Settings className="w-3.5 h-3.5" /> 项目元数据
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs font-medium">
            <Link href={`/p/${project.slug}`} target="_blank">
              <Eye className="w-3.5 h-3.5 mr-1" />
              <span>运行台</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualScreenshot}
            disabled={capturingScreenshot || isPending}
            className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
            title="手动重新截取并更新静态封面图"
          >
            {capturingScreenshot ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>更新截图</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 px-3 text-xs font-medium"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>已保存</span>
              </>
            ) : isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>保存修改</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {errorMsg && (
        <div role="alert" className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Main Tab View */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "code" ? (
          project.assetType === "single_html" ? (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left: CodeMirror Editor */}
              <div className="h-full flex flex-col bg-neutral-950 overflow-hidden">
                <div className="h-8 px-4 border-b border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                  <span className="font-mono flex items-center gap-1.5 text-xs">
                    <Code2 className="w-3.5 h-3.5 text-sky-400" /> {project.entryPath}
                  </span>
                  <span className="text-xs">修改后点击右上角保存即可生效</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <CodeMirror
                    value={code}
                    height="100%"
                    theme="dark"
                    onChange={(val) => {
                      setCode(val);
                    }}
                    className="text-xs h-full"
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="h-full flex flex-col bg-background overflow-hidden">
                <div className="h-8 px-4 border-b border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                  <span className="text-xs">沙箱隔离实时预览</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5"
                    onClick={() => {
                      setPreviewLoading(true);
                      setPreviewKey((k) => k + 1);
                    }}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                    <span>刷新预览</span>
                  </Button>
                </div>
                <div className="flex-1 p-2 bg-neutral-950 relative overflow-hidden">
                  {/* Indeterminate Hairline Progress Bar */}
                  {previewLoading && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] w-full z-20 overflow-hidden bg-muted/40">
                      <div className="h-full bg-foreground dark:bg-zinc-200 animate-pulse w-full" />
                    </div>
                  )}

                  {/* Live preview loading shimmer */}
                  <div
                    className={`absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-neutral-950/90 backdrop-blur-xs transition-opacity duration-200 ${
                      previewLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/90 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground">正在初始化安全沙箱预览...</span>
                    </div>
                  </div>

                  <iframe
                    key={previewKey}
                    src={`/raw/${project.slug}/`}
                    title="Live Preview"
                    sandbox="allow-scripts allow-forms allow-downloads allow-popups allow-modals"
                    allow="fullscreen; clipboard-write"
                    allowFullScreen
                    onLoad={() => setPreviewLoading(false)}
                    className={`w-full h-full rounded-md bg-white border border-border transition-opacity duration-300 ${
                      previewLoading ? "opacity-0" : "opacity-100"
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background">
              <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">此项目为 Zip 多资源包</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                包含独立引用的相对路径图片与脚本资源，暂不支持在线直接编辑。如需更新静态资源，请重新上传新的压缩包。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => setActiveTab("settings")}
              >
                前往编辑项目元数据
              </Button>
            </div>
          )
        ) : (
          /* Settings Tab */
          <div className="h-full overflow-y-auto p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  基本信息与展示属性
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-foreground mb-1.5">项目标题</label>
                  <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-foreground mb-1.5">简介描述</label>
                  <Textarea
                    id="edit-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent border border-input rounded-md p-3 text-sm text-foreground outline-none resize-none focus:border-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">所属分类</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-foreground text-background font-semibold border-foreground"
                              : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-folder" className="block text-sm font-medium text-foreground mb-1.5">
                    {t.workspace?.folders || "所属文件夹"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      id="edit-folder"
                      value={folderId || ""}
                      onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                      className="text-sm h-9 px-3 py-1 bg-muted/20 border-border w-52"
                    >
                      <option value="">{t.workspace?.rootFolderOption || "未归类 / 根目录"}</option>
                      {buildIndentedFolderList(folders).map((f) => (
                        <option key={f.id} value={f.id}>
                          {"\u00A0\u00A0".repeat(f.depth)}{f.depth > 0 ? "└─ " : ""}{f.name}
                        </option>
                      ))}
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {t.workspace?.selectTargetFolder || "修改项目所属文件夹"}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-language" className="block text-sm font-medium text-foreground mb-1.5">
                    {t.workspace?.languageLabel || "主要语言 (Language)"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      id="edit-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as "zh" | "en" | "other")}
                      className="text-sm h-9 px-3 py-1 bg-muted/20 border-border w-48"
                    >
                      <option value="zh">{t.workspace?.langZh || "中文 (Chinese)"}</option>
                      <option value="en">{t.workspace?.langEn || "英文 (English)"}</option>
                      <option value="other">{t.workspace?.langOther || "其他 (Other)"}</option>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {t.workspace?.languageHint || "用于正交多语言筛选与索引"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">标签管理</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs gap-1 px-2.5 py-1">
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
                      placeholder="输入标签按回车..."
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tagInput)}
                      className="h-9 px-3 text-sm shrink-0"
                    >
                      添加
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <label htmlFor="edit-visibility" className="block text-sm font-medium text-foreground mb-1.5">公开状态</label>
                    <Select
                      id="edit-visibility"
                      value={visibility}
                      onChange={(e) => {
                        setVisibility(e.target.value as "public" | "private");
                      }}
                      className="h-9 text-sm"
                    >
                      <option value="public">公开 (Showcase 展示)</option>
                      <option value="private">私有 (Private，完全隐蔽)</option>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2.5 h-9 cursor-pointer select-none">
                      <Checkbox
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                      />
                      <span className="text-sm text-foreground font-medium">
                        {t.workspace?.workspacePinLabel || "置顶到个人工作区"}
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
                          <span>{t.workspace?.globalPinLabel || "全站展台首屏置顶 (Admin)"}</span>
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Pro Perks: White-label & Custom Subdomain */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-foreground" />
                      <span>Pro 权益定制 (Pro Perks)</span>
                    </span>
                    <Badge variant="outline" className="text-xs font-mono border-border text-foreground">PRO</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-subdomain" className="block text-sm font-medium text-foreground mb-1.5">
                        专属二级子域名 (Subdomain)
                      </label>
                      <div className="flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground focus-within:ring-1 focus-within:ring-ring">
                        <span className="text-xs select-none text-muted-foreground">https://</span>
                        <input
                          id="edit-subdomain"
                          type="text"
                          value={customSubdomain}
                          placeholder={project.slug}
                          onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          className="bg-transparent border-0 p-0 text-sm text-foreground focus:outline-none focus:ring-0 w-full ml-1"
                        />
                        <span className="text-xs select-none text-muted-foreground">.pagepod.dev</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">留空则默认使用全局 /p/{project.slug} 路由</p>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                        <Checkbox
                          checked={isWhiteLabel}
                          onChange={(e) => setIsWhiteLabel(e.target.checked)}
                        />
                        <div>
                          <span className="text-sm text-foreground font-medium block">
                            白标模式 (White-Label)
                          </span>
                          <span className="text-xs text-muted-foreground leading-tight block">
                            隐藏全屏运行台右下角的 "Hosted on Pagepod" 徽标
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
