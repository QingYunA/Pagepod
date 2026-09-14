"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Key,
  Lock,
  Mail,
  User as UserIcon,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle,
  Unlink,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { UserIdentity } from "@supabase/supabase-js";

interface SettingsClientProps {
  user: CurrentUser;
  initialIdentities: UserIdentity[];
  initialHasPassword: boolean;
  isCloud: boolean;
}

export default function SettingsClient({
  user,
  initialIdentities,
  initialHasPassword,
  isCloud,
}: SettingsClientProps) {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();

  // Query params notification (e.g. from OAuth redirect)
  const queryError = searchParams.get("error");
  const queryMsg = searchParams.get("msg");

  const [identities, setIdentities] = useState(initialIdentities);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);

  // Status feedback
  const [copiedUid, setCopiedUid] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<"github" | "google" | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(
    queryError
      ? queryMsg
        ? decodeURIComponent(queryMsg)
        : queryError === "identity_already_exists"
        ? locale === "en"
          ? "This account is already linked to another user."
          : "该第三方账号已与其他账号绑定，无法重复关联。"
        : queryError
      : null
  );
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // ignore
    }
  };

  const githubIdentity = identities.find((i) => i.provider === "github");
  const googleIdentity = identities.find((i) => i.provider === "google");
  const isGithubConnected = Boolean(githubIdentity);
  const isGoogleConnected = Boolean(googleIdentity);

  // Total active sign-in methods
  const totalMethods =
    (isGithubConnected ? 1 : 0) +
    (isGoogleConnected ? 1 : 0) +
    (hasPassword ? 1 : 0);

  // OAuth Link Handler
  const handleLinkOAuth = async (provider: "github" | "google") => {
    if (!isCloud) return;
    setActionError(null);
    setActionSuccess(null);
    setLinkingProvider(provider);

    try {
      const supabase = createSupabaseClient();
      if (!supabase) {
        throw new Error(
          locale === "en"
            ? "Supabase client not initialized"
            : "Supabase 客户端未就绪"
        );
      }

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        "/workspace/settings"
      )}`;

      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setActionError(error.message);
        setLinkingProvider(null);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "OAuth linking initiation failed");
      setLinkingProvider(null);
    }
  };

  // OAuth Unlink Handler
  const handleUnlink = async (identity: UserIdentity) => {
    if (totalMethods <= 1) {
      setActionError(
        locale === "en"
          ? "Cannot unlink your only sign-in method. Please set an email password or connect another account first."
          : "无法解绑当前唯一的登录方式。请先设置邮箱密码或关联其他社交账号。"
      );
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setUnlinkingProvider(identity.provider);

    try {
      const supabase = createSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        setActionError(error.message);
        setUnlinkingProvider(null);
        return;
      }

      setIdentities((prev) =>
        prev.filter(
          (i) =>
            (i.identity_id || i.id) !== (identity.identity_id || identity.id)
        )
      );
      setActionSuccess(
        locale === "en"
          ? `Successfully disconnected ${identity.provider}.`
          : `已成功解除与 ${identity.provider} 账号的关联。`
      );
      setUnlinkingProvider(null);
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "Failed to unlink identity");
      setUnlinkingProvider(null);
    }
  };

  // Password Set / Update Handler
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!password || !confirmPassword) {
      setActionError(
        locale === "en"
          ? "Please fill in both password fields"
          : "请完整填写新密码与确认密码"
      );
      return;
    }

    if (password.length < 6) {
      setActionError(
        locale === "en"
          ? "Password must be at least 6 characters"
          : "密码长度不能少于 6 位"
      );
      return;
    }

    if (password !== confirmPassword) {
      setActionError(
        locale === "en"
          ? "Passwords do not match"
          : "两次输入的密码不一致"
      );
      return;
    }

    setSavingPassword(true);

    try {
      const supabase = createSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setActionError(error.message);
        setSavingPassword(false);
        return;
      }

      setHasPassword(true);
      setPassword("");
      setConfirmPassword("");
      setActionSuccess(
        locale === "en"
          ? "Password updated successfully! You can now sign in with your email and password."
          : "密码设置成功！您现在可以使用当前邮箱与新密码直接登录了。"
      );
      setSavingPassword(false);
    } catch (err: unknown) {
      setActionError((err as Error)?.message || "Failed to update password");
      setSavingPassword(false);
    }
  };

  const isSelfhost = user.id === "selfhost-admin";
  const userDisplayName =
    user.fullName || user.email?.split("@")[0] || (isSelfhost ? "Owner" : "User");
  const initialLetter = isSelfhost ? "O" : userDisplayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t.settings?.title || "账号与安全设置"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {t.settings?.subtitle ||
            "管理个人信息、第三方账号关联与登录认证凭据"}
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs font-medium cursor-default"
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-foreground" />
          <span>{t.settings?.tabSecurity || "账号安全与认证"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Link href="/workspace/settings/tokens">
            <Key className="w-3.5 h-3.5 mr-1.5" />
            <span>{t.settings?.tabTokens || "API 密钥"}</span>
          </Link>
        </Button>
      </div>

      {/* Feedback Alerts */}
      {actionError && (
        <Alert variant="destructive" className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-medium">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-muted-foreground hover:text-foreground text-xs ml-auto cursor-pointer"
          >
            ×
          </button>
        </Alert>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2.5 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="flex-1 font-medium">{actionSuccess}</p>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-muted-foreground hover:text-foreground text-xs ml-auto cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Profile Overview Card */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span>{t.settings?.profileTitle || "个人资料"}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {t.settings?.profileDesc || "当前登录账号的基础识别信息"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 text-sm font-semibold tracking-tighter shrink-0 border border-border">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={userDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {userDisplayName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono uppercase shrink-0"
                  >
                    {isSelfhost ? "OWNER" : user.role}
                  </Badge>
                  {user.planTier && (
                    <Badge
                      variant={user.planTier === "pro" ? "default" : "secondary"}
                      className="text-xs font-mono uppercase shrink-0"
                    >
                      {user.planTier}
                    </Badge>
                  )}
                </div>
                {user.email && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{user.email}</span>
                  </p>
                )}
              </div>
            </div>

            {/* UID Info Pill */}
            <div className="flex items-center gap-2 text-xs bg-muted/40 border border-border px-2.5 py-1.5 rounded-md font-mono self-start sm:self-auto">
              <span className="text-muted-foreground text-xs">UID:</span>
              <span className="text-foreground text-xs truncate max-w-[150px] sm:max-w-[200px]">
                {user.id}
              </span>
              <button
                type="button"
                onClick={copyUid}
                title="Copy User ID"
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer ml-1"
              >
                {copiedUid ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Membership & Plan Details Card (Cloud mode only) */}
      {isCloud && (
        <Card>
          <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {user.planTier === "pro" ? (
                <Sparkles className="w-4 h-4 text-foreground" />
              ) : user.planTier === "lite" ? (
                <Zap className="w-4 h-4 text-foreground" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              )}
              <span>{t.settings.plan.title}</span>
            </CardTitle>
            {user.planTier === "pro" ? (
              <Badge variant="outline" className="font-mono text-xs uppercase font-bold tracking-wider">
                {t.settings.plan.proBadge}
              </Badge>
            ) : user.planTier === "lite" ? (
              <Badge variant="outline" className="font-mono text-xs uppercase font-bold tracking-wider">
                {t.settings.plan.liteBadge}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-xs uppercase">
                {t.settings.plan.freeBadge}
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm mt-1">
            {user.planTier === "pro"
              ? t.settings.plan.proDesc
              : user.planTier === "lite"
              ? t.settings.plan.liteDesc
              : t.settings.plan.freeDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-card flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {user.planTier === "pro"
                    ? t.settings.plan.proStorageTitle
                    : user.planTier === "lite"
                    ? t.settings.plan.liteStorageTitle
                    : t.settings.plan.freeStorageTitle}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {user.planTier === "pro"
                    ? t.settings.plan.proStorageDesc
                    : user.planTier === "lite"
                    ? t.settings.plan.liteStorageDesc
                    : t.settings.plan.freeStorageDesc}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {user.planTier === "pro"
                    ? t.settings.plan.proFeatureTitle
                    : user.planTier === "lite"
                    ? t.settings.plan.liteFeatureTitle
                    : t.settings.plan.freeFeatureTitle}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {user.planTier === "pro"
                    ? t.settings.plan.proFeatureDesc
                    : user.planTier === "lite"
                    ? t.settings.plan.liteFeatureDesc
                    : t.settings.plan.freeFeatureDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t.settings.plan.lifetimeNotice}</span>
            </div>
            {user.planTier !== "pro" && (
              <Button size="sm" asChild className="h-9 text-sm gap-1.5 shadow-sm self-start sm:self-auto">
                <Link href="/pricing">
                  <span>
                    {user.planTier === "lite"
                      ? t.settings.plan.upgradeToPro
                      : t.settings.plan.upgradePlan}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* 3. Connected Accounts Card (Supabase OAuth Linking) */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span>{t.settings?.connectedAccountsTitle || "已关联的登录方式"}</span>
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {t.settings?.connectedAccountsDesc ||
              "绑定第三方社交账号后，你可以使用任意已关联的登录方式快速进入当前工作区。多个登录方式共享同一个项目与资产库。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {!isCloud ? (
            <div className="p-3 bg-muted/40 border border-border rounded-md text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                当前系统运行于自托管独立主控密码模式 (Self-Hosted Master Password)。所有操作受服务端 ADMIN_PASSWORD 统一鉴权，无需关联第三方账号。
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* GitHub Row */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border border-border text-foreground shrink-0">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        GitHub
                      </span>
                      {isGithubConnected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t.settings?.statusConnected || "已关联"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded">
                          {t.settings?.statusNotConnected || "未关联"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isGithubConnected
                        ? githubIdentity?.identity_data?.user_name
                          ? `@${githubIdentity.identity_data.user_name}`
                          : "已授权 GitHub 快速访问"
                        : "使用 GitHub 账号一键快捷登录"}
                    </p>
                  </div>
                </div>

                <div>
                  {isGithubConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={totalMethods <= 1 || unlinkingProvider === "github"}
                      onClick={() => githubIdentity && handleUnlink(githubIdentity)}
                      title={
                        totalMethods <= 1
                          ? "无法解绑当前唯一的登录方式"
                          : t.settings?.disconnectNotice || "解绑后将无法再通过此账号快捷登录"
                      }
                      className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 border-border cursor-pointer gap-1.5"
                    >
                      {unlinkingProvider === "github" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                      <span>{t.settings?.btnDisconnect || "解绑"}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(linkingProvider)}
                      onClick={() => handleLinkOAuth("github")}
                      className="h-8 px-3 text-xs font-medium border-border hover:bg-muted cursor-pointer gap-1.5"
                    >
                      {linkingProvider === "github" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {linkingProvider === "github"
                          ? t.settings?.btnConnecting || "正在跳转..."
                          : t.settings?.btnConnect || "绑定"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Google Row */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border border-border shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Google
                      </span>
                      {isGoogleConnected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t.settings?.statusConnected || "已关联"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded">
                          {t.settings?.statusNotConnected || "未关联"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isGoogleConnected
                        ? googleIdentity?.identity_data?.email || "已授权 Google 快速访问"
                        : "使用 Google Workspace 或 Gmail 快捷登录"}
                    </p>
                  </div>
                </div>

                <div>
                  {isGoogleConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={totalMethods <= 1 || unlinkingProvider === "google"}
                      onClick={() => googleIdentity && handleUnlink(googleIdentity)}
                      title={
                        totalMethods <= 1
                          ? "无法解绑当前唯一的登录方式"
                          : t.settings?.disconnectNotice || "解绑后将无法再通过此账号快捷登录"
                      }
                      className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 border-border cursor-pointer gap-1.5"
                    >
                      {unlinkingProvider === "google" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                      <span>{t.settings?.btnDisconnect || "解绑"}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(linkingProvider)}
                      onClick={() => handleLinkOAuth("google")}
                      className="h-8 px-3 text-xs font-medium border-border hover:bg-muted cursor-pointer gap-1.5"
                    >
                      {linkingProvider === "google" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {linkingProvider === "google"
                          ? t.settings?.btnConnecting || "正在跳转..."
                          : t.settings?.btnConnect || "绑定"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Password Management Card */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span>{t.settings?.passwordTitle || "密码管理"}</span>
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {!hasPassword
              ? t.settings?.passwordNoPasswordDesc ||
                "你当前是通过第三方社交账号快捷登录的，尚未为该账号设置独立的邮箱登录密码。设置密码后，你也可以直接使用邮箱和密码登录。"
              : t.settings?.passwordHasPasswordDesc ||
                "你可以随时更新当前账号的登录密码，保障项目资产安全。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {!isCloud ? (
            <div className="p-3.5 bg-muted/40 border border-border rounded-md text-sm text-muted-foreground leading-relaxed">
              自托管管理员密码已由服务器环境变量 ADMIN_PASSWORD 统一维护。如需更改，请更新环境配置文件并重启服务即可生效。
            </div>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-new-password"
                  className="text-sm font-medium text-foreground"
                >
                  {t.settings?.newPasswordLabel || "新密码"}
                </label>
                <div className="relative">
                  <Input
                    id="settings-new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="settings-confirm-password"
                  className="text-sm font-medium text-foreground"
                >
                  {t.settings?.confirmPasswordLabel || "确认新密码"}
                </label>
                <div className="relative">
                  <Input
                    id="settings-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={savingPassword || !password || !confirmPassword}
                  className="h-9 px-4 text-sm font-medium gap-2 cursor-pointer"
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {savingPassword
                      ? t.settings?.settingPassword || "保存中..."
                      : !hasPassword
                      ? t.settings?.btnSetPassword || "设置登录密码"
                      : t.settings?.btnUpdatePassword || "更新密码"}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
