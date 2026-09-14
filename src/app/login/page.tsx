"use client";

import { useState, useActionState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  loginAdmin,
  loginWithEmailAction,
  verifyEmailOtpAction,
  resendVerificationOtpAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/app/actions/auth";
import { createSupabaseClient, isClientCloudMode } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  MailCheck,
  RefreshCw,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AuthStep = "auth" | "forgot" | "reset-password" | "verify";

function LoginForm() {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/workspace";
  const errorParam = searchParams.get("error");
  const errorMsg = searchParams.get("msg");
  const stepParam = searchParams.get("step");
  const emailParam = searchParams.get("email") || "";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const initialStep: AuthStep =
    stepParam === "reset-password"
      ? "reset-password"
      : stepParam === "forgot"
      ? "forgot"
      : stepParam === "verify" && Boolean(emailParam)
      ? "verify"
      : "auth";

  const [step, setStep] = useState<AuthStep>(initialStep);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);
  const [pendingEmail, setPendingEmail] = useState(emailParam);
  const [emailInput, setEmailInput] = useState(emailParam);
  const [dismissedErrorMsg, setDismissedErrorMsg] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  // Action states
  const [adminState, adminFormAction, isAdminPending] = useActionState(loginAdmin, null);
  const [emailState, emailFormAction, isEmailPending] = useActionState(loginWithEmailAction, null);
  const [otpState, otpFormAction, isOtpPending] = useActionState(verifyEmailOtpAction, null);
  const [forgotState, forgotFormAction, isForgotPending] = useActionState(forgotPasswordAction, null);
  const [resetState, resetFormAction, isResetPending] = useActionState(resetPasswordAction, null);

  const currentEmailError = emailState?.error && emailState.error !== dismissedErrorMsg ? emailState.error : null;

  // Form input & visibility state
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP resend & UI state
  const [countdown, setCountdown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [otpToken, setOtpToken] = useState("");

  // OAuth states
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isCloud] = useState(() => isClientCloudMode());

  // Derived effective state when server action returns needsVerification
  const isServerVerification = Boolean(emailState?.needsVerification && emailState.email);
  const effectiveStep: AuthStep = isServerVerification ? "verify" : step;
  const effectiveEmail = isServerVerification && emailState?.email ? emailState.email : pendingEmail;

  // Sync step change to browser URL without full reloads
  const switchStep = (nextStep: AuthStep, emailVal?: string) => {
    setStep(nextStep);
    try {
      const url = new URL(window.location.href);
      if (nextStep === "auth") {
        url.searchParams.delete("step");
        url.searchParams.delete("email");
      } else {
        url.searchParams.set("step", nextStep);
        if (emailVal) {
          url.searchParams.set("email", emailVal);
        }
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Safe fallback
    }
  };

  // Sync verification trigger URL and countdown from server action
  useEffect(() => {
    if (emailState?.needsVerification && emailState.email) {
      const timer = setTimeout(() => {
        setCountdown(60);
      }, 0);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("step", "verify");
        url.searchParams.set("email", emailState.email);
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Safe fallback
      }
      return () => clearTimeout(timer);
    }
  }, [emailState]);

  // Handle resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleBackFromVerification = () => {
    setPendingEmail("");
    setResendStatus(null);
    switchStep("auth");
  };

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setOauthError(null);
    setOauthLoading(provider);

    const supabase = createSupabaseClient();
    if (!supabase) {
      setOauthError("Supabase environment variables not detected");
      setOauthLoading(null);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setOauthError(error.message);
        setOauthLoading(null);
      }
    } catch (err: unknown) {
      setOauthError((err as Error)?.message || "OAuth initiation failed");
      setOauthLoading(null);
    }
  };

  const handleResendOtp = async () => {
    if (!effectiveEmail || countdown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);

    const supabase = createSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: effectiveEmail,
        });
        if (error) {
          setResendStatus(error.message);
        } else {
          setResendStatus(t.auth.resendSuccess);
          setCountdown(60);
        }
      } catch (err: unknown) {
        setResendStatus((err as Error)?.message || "Failed to resend");
      } finally {
        setIsResending(false);
      }
      return;
    }

    try {
      const res = await resendVerificationOtpAction(effectiveEmail);
      if (res && "error" in res && res.error) {
        setResendStatus(res.error);
      } else {
        setResendStatus(t.auth.resendSuccess);
        setCountdown(60);
      }
    } catch (err: unknown) {
      setResendStatus((err as Error)?.message || "Failed to resend");
    } finally {
      setIsResending(false);
    }
  };

  const isSignupPasswordMismatch =
    activeTab === "signup" &&
    signupPassword.length > 0 &&
    signupConfirmPassword.length > 0 &&
    signupPassword !== signupConfirmPassword;

  const isResetPasswordMismatch =
    resetPassword.length > 0 &&
    resetConfirmPassword.length > 0 &&
    resetPassword !== resetConfirmPassword;

  // 1. FORGOT PASSWORD VIEW
  if (isCloud && step === "forgot") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center mx-auto text-foreground">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t.auth.forgotPasswordTitle}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            {t.auth.forgotPasswordSubtitle}
          </p>
        </div>

        <form action={forgotFormAction} className="space-y-3.5">
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="origin" value={origin} />

          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
              {t.auth.emailLabel}
            </label>
            <Input
              id="forgot-email"
              type="email"
              name="email"
              required
              autoFocus
              placeholder={t.auth.emailPlaceholder}
              className="h-9 text-sm"
            />
          </div>

          {forgotState?.error && (
            <p role="alert" className="text-xs text-destructive font-medium text-center">
              {forgotState.error}
            </p>
          )}

          {forgotState?.success && (
            <div className="p-3 bg-muted/40 border border-border rounded-md text-xs text-foreground leading-relaxed text-center">
              {forgotState.message || t.auth.resetLinkSent}
            </div>
          )}

          <Button
            type="submit"
            disabled={isForgotPending || Boolean(forgotState?.success)}
            className="w-full h-9 text-sm font-medium cursor-pointer"
          >
            {isForgotPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{t.auth.sendingResetLink}</span>
              </>
            ) : (
              t.auth.sendResetLink
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => switchStep("auth")}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.auth.backToSignIn}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. SET NEW PASSWORD VIEW (arrived from recovery callback)
  if (isCloud && step === "reset-password") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center mx-auto text-foreground">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t.auth.setNewPasswordTitle}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {t.auth.setNewPasswordSubtitle}
          </p>
        </div>

        <form action={resetFormAction} className="space-y-3.5">
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="lang" value={locale} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                {t.auth.newPasswordLabel}
              </label>
              <span className="text-xs text-muted-foreground">
                {t.auth.passwordMinNotice}
              </span>
            </div>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
                autoFocus
                minLength={6}
                autoComplete="new-password"
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="confirm-new-password" className="text-sm font-medium text-foreground">
                {t.auth.confirmNewPasswordLabel}
              </label>
              {isResetPasswordMismatch && (
                <span className="text-xs text-destructive font-medium">
                  {t.auth.passwordMismatch}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={`h-9 text-sm pr-9 ${
                  isResetPasswordMismatch ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {resetState?.error && (
            <p role="alert" className="text-xs text-destructive font-medium text-center">
              {resetState.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isResetPending || isResetPasswordMismatch}
            className="w-full h-9 text-sm font-medium cursor-pointer"
          >
            {isResetPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{t.auth.updatingPassword}</span>
              </>
            ) : (
              t.auth.updatePasswordBtn
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => switchStep("auth")}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.auth.backToSignIn}</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. EMAIL VERIFICATION STATE (6-digit OTP code input + mail link notice)
  if (isCloud && effectiveStep === "verify") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <div className="w-10 h-10 rounded-full border border-border bg-muted/40 flex items-center justify-center mx-auto text-foreground">
            <MailCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t.auth.verifyEmailTitle}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.auth.verifyEmailSubtitle.replace("{email}", effectiveEmail)}
          </p>
        </div>

        <div className="p-3 bg-muted/30 border border-border rounded-md text-xs text-muted-foreground leading-relaxed">
          {t.auth.verifyPrompt}
        </div>

        {/* 6-digit OTP verification form */}
        <form action={otpFormAction} className="space-y-3.5">
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="email" value={effectiveEmail} />

          <div className="space-y-1.5">
            <label htmlFor="otp-token" className="text-sm font-medium text-foreground">
              {t.auth.otpCodeLabel}
            </label>
            <Input
              id="otp-token"
              name="token"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={otpToken}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[\s-]+/g, "").slice(0, 10);
                setOtpToken(sanitized);
              }}
              required
              autoFocus
              placeholder={t.auth.otpCodePlaceholder}
              className="h-10 text-center tracking-[0.25em] font-mono text-sm uppercase"
            />
          </div>

          {otpState?.error && (
            <p role="alert" className="text-xs text-destructive font-medium text-center">
              {otpState.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isOtpPending}
            className="w-full h-9 text-sm font-medium cursor-pointer"
          >
            {isOtpPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{t.auth.loading}</span>
              </>
            ) : (
              t.auth.verifyBtn
            )}
          </Button>
        </form>

        {/* Resend button & Change email */}
        <div className="flex flex-col space-y-3 text-center text-xs pt-1">
          {resendStatus && (
            <p className="text-xs text-muted-foreground font-medium">
              {resendStatus}
            </p>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={countdown > 0 || isResending}
              onClick={handleResendOtp}
              className="h-8 text-xs gap-1.5 cursor-pointer font-normal border-border"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
              <span>
                {isResending
                  ? t.auth.resending
                  : countdown > 0
                  ? t.auth.resendCountdown.replace("{seconds}", String(countdown))
                  : t.auth.resendCode}
              </span>
            </Button>
          </div>

          <button
            type="button"
            onClick={handleBackFromVerification}
            className="text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer text-xs"
          >
            {t.auth.changeEmail}
          </button>
        </div>
      </div>
    );
  }

  // 4. CLOUD SAAS AUTHENTICATION (shadcn/ui Authentication Block: Tabs, Confirm Password, Eye Toggles)
  if (isCloud) {
    return (
      <div className="space-y-6">
        {/* Prominent shadcn Tabs for Sign In vs Sign Up */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "signin" | "signup");
            setSignupPassword("");
            setSignupConfirmPassword("");
            setDismissedErrorMsg(emailState?.error || "");
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" className="cursor-pointer transition-all duration-200">
              {t.auth.tabSignIn}
            </TabsTrigger>
            <TabsTrigger value="signup" className="cursor-pointer transition-all duration-200">
              {t.auth.tabSignUp}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Dynamic Title & Subtitle based on active tab with smooth transition */}
        <div className="flex flex-col space-y-1.5 text-center transition-all duration-200 ease-in-out">
          <h1 className="text-xl font-semibold tracking-tight">
            {activeTab === "signup" ? t.auth.signupTitle : t.auth.loginTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "signup" ? t.auth.signupSubtitle : t.auth.loginSubtitle}
          </p>
        </div>

        {/* OAuth Buttons (GitHub & Google) */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(oauthLoading)}
            onClick={() => handleOAuthLogin("github")}
            className="h-9 text-sm gap-2 font-medium border-border hover:bg-muted cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={Boolean(oauthLoading)}
            onClick={() => handleOAuthLogin("google")}
            className="h-9 text-sm gap-2 font-medium border-border hover:bg-muted cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </Button>
        </div>

        {(oauthError || errorMsg || (errorParam && errorParam !== "oauth_exchange_failed")) && (
          <div role="alert" className="p-2.5 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-center">
            {oauthError || errorMsg || errorParam}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-mono">
              {t.auth.orDivider}
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form action={emailFormAction} className="space-y-3.5">
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="isSignUp" value={String(activeTab === "signup")} />
          <input type="hidden" name="lang" value={locale} />

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-medium text-foreground">
              {t.auth.emailLabel}
            </label>
            <Input
              id="login-email"
              type="email"
              name="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setDismissedErrorMsg(emailState?.error || "");
              }}
              required
              autoFocus
              placeholder={t.auth.emailPlaceholder}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                {t.auth.passwordLabel}
              </label>
              {activeTab === "signin" ? (
                <button
                  type="button"
                  onClick={() => switchStep("forgot", emailInput)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {t.auth.forgotPassword}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t.auth.passwordMinNotice}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={activeTab === "signup" ? signupPassword : undefined}
                onChange={(e) => {
                  if (activeTab === "signup") setSignupPassword(e.target.value);
                  setDismissedErrorMsg(emailState?.error || "");
                }}
                required
                minLength={6}
                autoComplete={activeTab === "signup" ? "new-password" : "current-password"}
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password field with smooth expandable CSS grid transition */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              activeTab === "signup"
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            )}
          >
            <div className="overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between pt-0.5">
                <label htmlFor="login-confirm-password" className="text-sm font-medium text-foreground">
                  {t.auth.confirmPasswordLabel}
                </label>
                {isSignupPasswordMismatch && (
                  <span className="text-xs text-destructive font-medium animate-in fade-in-0 duration-150">
                    {t.auth.passwordMismatch}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="login-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={signupConfirmPassword}
                  onChange={(e) => {
                    setSignupConfirmPassword(e.target.value);
                    setDismissedErrorMsg(emailState?.error || "");
                  }}
                  required={activeTab === "signup"}
                  minLength={activeTab === "signup" ? 6 : undefined}
                  autoComplete="new-password"
                  className={cn(
                    "h-9 text-sm pr-9 transition-colors",
                    isSignupPasswordMismatch && "border-destructive/60 focus-visible:ring-destructive/30"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Polished, Actionable Error Notification */}
          {currentEmailError && (() => {
            const isAccountExistsError = Boolean(
              currentEmailError.includes("GitHub") ||
              currentEmailError.includes("Google") ||
              currentEmailError.includes("already associated") ||
              currentEmailError.includes("已关联") ||
              currentEmailError.includes("已被注册")
            );

            return isAccountExistsError ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3 space-y-2.5 text-xs text-foreground animate-in fade-in-0 slide-in-from-top-2 duration-200"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1 text-left">
                    <p className="font-semibold text-foreground text-xs tracking-tight">
                      {t.auth.accountExistsTitle || "该邮箱已关联现有账号"}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {currentEmailError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedErrorMsg(currentEmailError)}
                    className="text-muted-foreground/60 hover:text-foreground text-xs p-0.5 cursor-pointer ml-1"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>

                {/* Direct Action Buttons for Immediate 1-Click Resolution */}
                <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab("signin");
                      setDismissedErrorMsg(currentEmailError);
                    }}
                    className="h-8 text-xs font-medium px-2.5 bg-background hover:bg-muted border-border cursor-pointer gap-1.5 shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.auth.actionSignInNow || "切换到登录"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => switchStep("forgot", emailInput)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.auth.actionSetPassword || "找回/设置密码"}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed flex-1 text-left">{currentEmailError}</span>
                <button
                  type="button"
                  onClick={() => setDismissedErrorMsg(currentEmailError)}
                  className="text-muted-foreground/60 hover:text-foreground text-xs p-0.5 cursor-pointer ml-1"
                >
                  ×
                </button>
              </div>
            );
          })()}

          <Button
            type="submit"
            disabled={isEmailPending || (activeTab === "signup" && isSignupPasswordMismatch)}
            className="w-full h-9 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-[0.99]"
          >
            {isEmailPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  {activeTab === "signup"
                    ? t.auth.creatingAccount || "正在创建账号..."
                    : t.auth.loading}
                </span>
              </span>
            ) : activeTab === "signup" ? (
              t.auth.signupBtn
            ) : (
              t.auth.loginBtn
            )}
          </Button>
        </form>

        <div className="flex flex-col space-y-2 text-center text-xs">
          <p className="text-xs text-muted-foreground px-4 leading-relaxed">
            {t.auth.termsNotice}
          </p>
        </div>
      </div>
    );
  }

  // 5. SELFHOSTED ADMIN AUTH (Pure, minimal password input without AI feel)
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t.auth.selfhostTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.selfhostSubtitle}
        </p>
      </div>

      <form action={adminFormAction} className="space-y-4">
        <input type="hidden" name="from" value={from} />

        <div className="space-y-1.5">
          <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
            {t.auth.adminPasswordLabel}
          </label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="h-9 text-sm pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {adminState?.error && (
            <p role="alert" className="text-xs text-destructive font-medium">
              {adminState.error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isAdminPending}
          className="w-full h-9 text-sm font-medium cursor-pointer"
        >
          {isAdminPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              <span>{t.auth.loading}</span>
            </>
          ) : (
            t.auth.selfhostBtn
          )}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top minimal bar with back button & language/theme controls */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.auth.backHome}</span>
          </Link>
        </Button>

        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Center Auth Container (Direct, unboxed, authentic shadcn authentication layout) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          {/* Logo mark */}
          <div className="mx-auto flex items-center justify-center gap-2.5 font-semibold text-sm">
            <BrandLogo size={26} className="w-7 h-7" />
            <span>Pagepod</span>
          </div>

          <Suspense fallback={<div className="text-center text-xs text-muted-foreground py-6">{t.auth.loading}</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
