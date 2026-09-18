"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Shield, Sparkles, Zap, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/context";
import UnifiedCheckoutDialog from "@/components/pricing/unified-checkout-dialog";

export default function PricingClient() {
  const { t, locale } = useLanguage();
  const isZh = locale === "zh";
  const searchParams = useSearchParams();

  const [checkoutTier, setCheckoutTier] = useState<"lite" | "pro" | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    fullName?: string;
    planTier?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-open checkout modal if redirected back with ?tier=... or handle payment success
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const tierParam = searchParams.get("tier");

    // Handle return from hosted checkout after completion
    if (statusParam === "completed") {
      setShowSuccessBanner(true);
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data?.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(() => {});
      return;
    }

    if (tierParam === "lite" || tierParam === "pro") {
      if (currentUser) {
        if (currentUser.planTier !== "pro" && (tierParam === "pro" || currentUser.planTier !== "lite")) {
          setCheckoutTier(tierParam);
        }
      }
    }
  }, [currentUser, searchParams]);

  const currentTier = currentUser?.planTier || "free";
  const isLite = currentTier === "lite";
  const isPro = currentTier === "pro";

  const handleBuyClick = (tier: "lite" | "pro") => {
    if (!currentUser) {
      window.location.href = `/login?from=${encodeURIComponent(`/pricing?tier=${tier}`)}`;
      return;
    }
    setCheckoutTier(tier);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 md:py-16">
      {/* Header Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-6 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-foreground" />
          <span className="font-medium text-foreground">{t.pricing.earlyBirdBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {t.pricing.title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.pricing.desc}
        </p>
      </div>

      {/* Payment Success Alert Banner */}
      {showSuccessBanner && (
        <div className="max-w-2xl mx-auto mb-6 p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-card-foreground flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {isZh
                ? "支付成功！您的会员方案已生效，账号状态已自动刷新。"
                : "Payment successful! Your membership plan is now active."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowSuccessBanner(false)}
          >
            {isZh ? "知道了" : "Dismiss"}
          </Button>
        </div>
      )}

      {/* Account Status Pill */}
      <div className="flex justify-center mb-12">
        {currentUser ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/80 text-xs shadow-xs">
            <span className="text-muted-foreground">{isZh ? "当前账号：" : "Account:"}</span>
            <span className="font-semibold text-foreground">
              {currentUser.email || currentUser.fullName || (isZh ? "管理员" : "Admin")}
            </span>
            <span className="text-border">·</span>
            {isPro ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Sparkles className="w-3 h-3" />
                {isZh ? "PRO 终身版 (已生效)" : "PRO Lifetime (Active)"}
              </span>
            ) : isLite ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Zap className="w-3 h-3" />
                {isZh ? "LITE 终身版 (已生效) · 可升级 Pro" : "LITE Lifetime (Active) · Upgradable"}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {isZh ? "Starter 免费版 (购买后将绑定到此账号)" : "Starter Free Plan"}
              </span>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 text-xs text-muted-foreground shadow-xs">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              {isZh
                ? "当前尚未登录，升级前将先引导登录以绑定账号"
                : "Not signed in · Please sign in first to bind your account"}
            </span>
            <Link
              href={`/login?from=${encodeURIComponent("/pricing")}`}
              className="font-medium text-foreground hover:underline ml-1"
            >
              {isZh ? "立即登录 →" : "Sign In →"}
            </Link>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid (3 Columns) */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20 items-stretch">
        {/* Free Starter Plan */}
        <div className="relative flex flex-col p-6 rounded-xl border border-border bg-card text-card-foreground shadow-xs">
          <div className="mb-6">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {t.pricing.freePlan.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
              {t.pricing.freePlan.desc}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {t.pricing.freePlan.price}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.pricing.freePlan.period}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-5 mb-6 flex-1">
            <ul className="space-y-3 text-sm text-muted-foreground">
              {t.pricing.freePlan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button variant="outline" asChild className="w-full h-9 text-sm font-medium border-border hover:bg-muted">
            <Link href="/workspace/upload">
              {t.pricing.freePlan.cta}
            </Link>
          </Button>
        </div>

        {/* Lite Lifetime Plan */}
        <div className="relative flex flex-col p-6 rounded-xl border border-border bg-card text-card-foreground shadow-xs">
          <div className="absolute -top-3 right-5">
            <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-mono border border-border text-foreground">
              {t.pricing.litePlan.badge}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-foreground" />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {t.pricing.litePlan.name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
              {t.pricing.litePlan.desc}
            </p>
            <div className="mt-4 space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {t.pricing.litePlan.price}
                </span>
                <span className="text-sm font-mono text-muted-foreground line-through">
                  {t.pricing.litePlan.originalPrice}
                </span>
                <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 h-5 border-border bg-muted/60 text-foreground">
                  {t.pricing.discountBadge}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t.pricing.litePlan.period}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/80">
                {t.pricing.earlyBirdNotice}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5 mb-6 flex-1">
            <ul className="space-y-3 text-sm text-muted-foreground">
              {t.pricing.litePlan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {isLite ? (
            <Button
              variant="outline"
              disabled
              className="w-full h-9 text-sm font-medium border-border opacity-70"
            >
              {isZh ? "当前生效套餐" : "Current Plan"}
            </Button>
          ) : isPro ? (
            <Button
              variant="outline"
              disabled
              className="w-full h-9 text-sm font-medium border-border opacity-70"
            >
              {isZh ? "已包含在 Pro 中" : "Included in Pro"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleBuyClick("lite")}
              className="w-full h-9 text-sm font-medium border-border hover:bg-muted hover:border-foreground/30 cursor-pointer"
            >
              {!currentUser
                ? (isZh ? "登录后选择 Lite 方案" : "Sign in & Get Lite")
                : t.pricing.litePlan.cta}
            </Button>
          )}
        </div>

        {/* Pro Lifetime Plan */}
        <div className="relative flex flex-col p-6 rounded-xl border-2 border-foreground bg-card text-card-foreground shadow-md">
          <div className="absolute -top-3 right-5">
            <Badge className="bg-foreground text-background hover:bg-foreground px-2.5 py-0.5 text-xs font-medium tracking-wide">
              {t.pricing.proPlan.badge}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {t.pricing.proPlan.name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
              {t.pricing.proPlan.desc}
            </p>
            <div className="mt-4 space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {t.pricing.proPlan.price}
                </span>
                <span className="text-sm font-mono text-muted-foreground line-through">
                  {t.pricing.proPlan.originalPrice}
                </span>
                <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 h-5 border-border bg-muted/60 text-foreground">
                  {t.pricing.discountBadge}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t.pricing.proPlan.period}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/80">
                {t.pricing.earlyBirdNotice}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5 mb-6 flex-1">
            <ul className="space-y-3 text-sm text-muted-foreground">
              {t.pricing.proPlan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {isPro ? (
            <Button
              variant="outline"
              disabled
              className="w-full h-9 text-sm font-medium border-border opacity-70"
            >
              {isZh ? "当前生效套餐" : "Current Plan"}
            </Button>
          ) : (
            <Button
              onClick={() => handleBuyClick("pro")}
              className="w-full h-9 text-sm font-medium gap-1.5 shadow-sm cursor-pointer"
            >
              <span>
                {!currentUser
                  ? (isZh ? "登录后选择 Pro 方案" : "Sign in & Get Pro")
                  : isLite
                  ? (isZh ? "升级至 Pro 终身版" : "Upgrade to Pro")
                  : t.pricing.proPlan.cta}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Unified Multi-Channel Checkout Dialog (Waffo Pancake + PayPal) */}
      <UnifiedCheckoutDialog
        isOpen={Boolean(checkoutTier)}
        planTier={checkoutTier || "lite"}
        onClose={() => setCheckoutTier(null)}
        user={currentUser}
        onSuccess={(newTier) => {
          setCurrentUser((prev) => (prev ? { ...prev, planTier: newTier } : null));
        }}
      />

      {/* High-Value SEO FAQ Accordion Section */}
      <div className="max-w-3xl mx-auto pt-6 border-t border-border">
        <div className="text-center mb-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>FAQ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {t.pricing.faqTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.pricing.faqDesc}
          </p>
        </div>

        <div className="space-y-4">
          {t.pricing.faqs.map((faq, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-card/60 space-y-2 hover:border-foreground/30 transition-colors"
            >
              <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">Q{index + 1}.</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
