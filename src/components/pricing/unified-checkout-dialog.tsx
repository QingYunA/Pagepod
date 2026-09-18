"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  LogIn,
  CreditCard,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

// Global PayPal types declaration
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: {
          layout?: "vertical" | "horizontal";
          color?: "gold" | "blue" | "silver" | "white" | "black";
          shape?: "rect" | "pill";
          label?: "paypal" | "checkout" | "buynow" | "pay";
          tagline?: boolean;
          height?: number;
        };
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: unknown) => void;
        onCancel?: () => void;
      }) => {
        render: (container: HTMLElement | string) => Promise<void>;
      };
    };
  }
}

export interface UnifiedCheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  planTier: "lite" | "pro";
  user: { id: string; email?: string; planTier?: string } | null;
  onSuccess?: (newTier: string) => void;
}

const PLAN_DETAILS = {
  lite: {
    nameEn: "Lite Lifetime Plan",
    nameZh: "Lite 终身版",
    price: "$4.90",
    currency: "USD",
    badgeEn: "10 GB Storage",
    badgeZh: "10 GB 存储",
    icon: Zap,
    featuresEn: [
      "10 GB cloud storage quota",
      "Host up to 500 projects permanently",
      "Account-level private protection included",
      "API Tokens for CLI & script automation",
      "One-time payment, lifetime access without recurring fees",
    ],
    featuresZh: [
      "10 GB 存储空间配额",
      "最多永久托管 500 个项目",
      "包含账号级私有项目隔离保护",
      "解锁 API Token 与自动化脚本权限",
      "一次性付款，永久有效无任何续费",
    ],
  },
  pro: {
    nameEn: "Pro Lifetime Plan",
    nameZh: "Pro 终身版",
    price: "$9.90",
    currency: "USD",
    badgeEn: "Most Popular",
    badgeZh: "最受欢迎",
    icon: Sparkles,
    featuresEn: [
      "50 GB cloud storage quota",
      "Unlimited project hosting",
      "Custom Subdomain (e.g. app.pagepod.dev)",
      "Remove Pagepod badge (White-label mode)",
      "One-time payment, lifetime access without recurring fees",
    ],
    featuresZh: [
      "50 GB 存储空间配额",
      "无限项目托管数量",
      "独立二级子域名 (如 demo.pagepod.dev)",
      "移除 Pagepod 品牌徽标 (白标模式)",
      "一次性付款，永久有效无任何续费",
    ],
  },
};

export default function UnifiedCheckoutDialog({
  isOpen,
  onClose,
  planTier,
  user,
  onSuccess,
}: UnifiedCheckoutDialogProps) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";

  const [activeChannel, setActiveChannel] = useState<"waffo" | "paypal">("waffo");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Waffo Checkout States
  const [waffoState, setWaffoState] = useState<"idle" | "creating" | "waiting">("idle");
  const [waffoOrderId, setWaffoOrderId] = useState<string | null>(null);
  const [waffoCheckoutUrl, setWaffoCheckoutUrl] = useState<string | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);

  // PayPal States
  const [isLoadingPayPalScript, setIsLoadingPayPalScript] = useState(false);
  const [isCapturingPayPal, setIsCapturingPayPal] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalButtonsRendered = useRef(false);

  const plan = PLAN_DETAILS[planTier] || PLAN_DETAILS.lite;
  const PlanIcon = plan.icon;
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setError(null);
      setWaffoState("idle");
      setWaffoOrderId(null);
      setWaffoCheckoutUrl(null);
      setIsManualChecking(false);
      setIsCapturingPayPal(false);
      paypalButtonsRendered.current = false;
      return;
    }
  }, [isOpen]);

  // Status polling for Waffo session
  const checkOrderStatus = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/payments/waffo/check-status?orderId=${encodeURIComponent(orderId)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.completed || data?.status === "completed") {
        setIsSuccess(true);
        setWaffoState("idle");
        onSuccess?.(data.planTier || planTier);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [onSuccess, planTier]);

  useEffect(() => {
    if (waffoState !== "waiting" || !waffoOrderId || isSuccess) return;

    const timer = setInterval(async () => {
      const completed = await checkOrderStatus(waffoOrderId);
      if (completed) {
        clearInterval(timer);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [waffoState, waffoOrderId, isSuccess, checkOrderStatus]);

  // Initiate Waffo Checkout
  const handleStartWaffoCheckout = async () => {
    setError(null);
    setWaffoState("creating");

    try {
      const res = await fetch("/api/payments/waffo/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier,
          successUrl: `${window.location.origin}/pricing?tier=${planTier}&status=completed`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to initialize secure checkout session");
      }

      setWaffoOrderId(data.orderId);
      setWaffoCheckoutUrl(data.checkoutUrl);
      setWaffoState("waiting");

      // Open checkout in new tab securely
      const opened = window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        setError(
          isZh
            ? "浏览器拦截了弹出窗口，请点击下方按钮前往收银台完成支付。"
            : "Pop-up was blocked. Please click the button below to open checkout."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Initialization failed";
      setError(msg);
      setWaffoState("idle");
    }
  };

  const handleManualVerify = async () => {
    if (!waffoOrderId) return;
    setIsManualChecking(true);
    setError(null);
    try {
      const completed = await checkOrderStatus(waffoOrderId);
      if (!completed) {
        setError(
          isZh
            ? "尚未检测到支付成功信号。如您已完成付款，请稍候数秒后再次核验。"
            : "Payment not completed yet. If you have paid, please wait a few seconds and try again."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    } finally {
      setIsManualChecking(false);
    }
  };

  // PayPal Button Render Effect
  useEffect(() => {
    if (!isOpen || activeChannel !== "paypal" || !user || !paypalClientId) {
      return;
    }

    if (paypalButtonsRendered.current) return;

    setIsLoadingPayPalScript(true);
    setError(null);

    const scriptId = "paypal-sdk-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initButtons = () => {
      if (!window.paypal || !paypalContainerRef.current || paypalButtonsRendered.current) return;
      paypalContainerRef.current.innerHTML = "";

      try {
        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              tagline: false,
              height: 38,
            },
            createOrder: async () => {
              setError(null);
              const res = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planTier }),
              });
              const data = await res.json();
              if (!res.ok || !data.orderId) {
                throw new Error(data.error || "Failed to initialize PayPal order");
              }
              return data.orderId;
            },
            onApprove: async (data: { orderID: string }) => {
              setIsCapturingPayPal(true);
              try {
                const res = await fetch("/api/payments/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                const result = await res.json();
                if (!res.ok || !result.success) {
                  throw new Error(result.error || "Payment capture failed");
                }
                setIsSuccess(true);
                onSuccess?.(result.planTier || planTier);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Payment capture failed";
                setError(msg);
              } finally {
                setIsCapturingPayPal(false);
              }
            },
            onError: (err: unknown) => {
              console.error("PayPal SDK error:", err);
              setError(
                isZh
                  ? "PayPal 支付遇到异常或已取消，请重试。"
                  : "PayPal checkout error or cancelled. Please try again."
              );
            },
          })
          .render(paypalContainerRef.current)
          .then(() => {
            paypalButtonsRendered.current = true;
            setIsLoadingPayPalScript(false);
          })
          .catch((err: unknown) => {
            console.error("Failed to render PayPal buttons:", err);
            setError(isZh ? "加载 PayPal 支付组件失败" : "Failed to render PayPal buttons");
            setIsLoadingPayPalScript(false);
          });
      } catch (err: unknown) {
        console.error("Error creating PayPal buttons:", err);
        setError(isZh ? "初始化 PayPal 失败" : "Failed to initialize PayPal");
        setIsLoadingPayPalScript(false);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        paypalClientId
      )}&currency=USD&intent=capture`;
      script.async = true;
      script.onload = () => initButtons();
      script.onerror = () => {
        setError(
          isZh
            ? "无法加载 PayPal 安全组件，请检查网络连接。"
            : "Failed to connect to PayPal. Please check your network."
        );
        setIsLoadingPayPalScript(false);
      };
      document.body.appendChild(script);
    } else {
      if (window.paypal) {
        initButtons();
      } else {
        script.addEventListener("load", initButtons);
      }
    }

    return () => {
      paypalButtonsRendered.current = false;
    };
  }, [isOpen, activeChannel, planTier, user, paypalClientId, isZh, onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 border border-border bg-card text-card-foreground shadow-lg rounded-xl">
        {/* Case 1: Unauthenticated User */}
        {!user ? (
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
              <LogIn className="w-5 h-5 text-foreground" />
            </div>
            <DialogHeader className="space-y-2 text-center sm:text-center">
              <DialogTitle className="text-base font-semibold text-foreground">
                {isZh ? "需要登录账号" : "Sign In Required"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {isZh
                  ? "请先登录或注册 Pagepod 账号，以便我们在支付完成后即时为您激活终身会员权益。"
                  : "Please sign in or create an account first so we can bind your lifetime privileges immediately upon payment."}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2 flex flex-col gap-2">
              <Button asChild className="w-full h-9 text-sm font-medium gap-2">
                <Link href={`/login?from=${encodeURIComponent(`/pricing?tier=${planTier}`)}`}>
                  <span>{isZh ? "立即登录 / 注册" : "Sign In / Register"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground"
              >
                {isZh ? "稍后再说" : "Cancel"}
              </Button>
            </div>
          </div>
        ) : isSuccess ? (
          /* Case 2: Payment Succeeded */
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">
                {isZh ? "支付成功，方案已激活" : "Payment Successful!"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isZh
                  ? `已成功激活 ${plan.nameZh}，终身权益已实时绑定至您的账号。`
                  : `Your account has been permanently upgraded to ${plan.nameEn}. Enjoy your lifetime access!`}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button asChild className="w-full h-9 text-sm font-medium gap-2">
                <Link href="/workspace">
                  <span>{isZh ? "进入我的工作台" : "Go to Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Case 3: Normal Checkout Flow with Channel Selection */
          <div className="space-y-5">
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlanIcon className="w-4 h-4 text-foreground" />
                  <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                    {isZh ? plan.nameZh : plan.nameEn}
                  </DialogTitle>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-border">
                  {isZh ? plan.badgeZh : plan.badgeEn}
                </Badge>
              </div>
              <DialogDescription className="text-sm text-muted-foreground">
                {isZh ? "一次性安全结账，终身有效无续费" : "One-time secure payment, lifetime access"}
              </DialogDescription>
            </DialogHeader>

            {/* Price Summary Card */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">
                  {isZh ? "应付金额 (USD)" : "Total Amount (USD)"}
                </span>
                <div className="text-xl font-bold font-mono text-foreground">
                  {plan.price}{" "}
                  <span className="text-xs font-normal text-muted-foreground">USD</span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-xs font-mono">
                  {isZh ? "一次性买断" : "Lifetime"}
                </Badge>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {isZh ? "包含权益" : "Included Perks"}
              </div>
              <ul className="space-y-2 text-sm text-foreground/90">
                {(isZh ? plan.featuresZh : plan.featuresEn).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Channel Tabs */}
            <Tabs
              value={activeChannel}
              onValueChange={(val) => {
                setActiveChannel(val as "waffo" | "paypal");
                setError(null);
              }}
              className="w-full pt-1"
            >
              <TabsList className="grid grid-cols-2 w-full h-9">
                <TabsTrigger value="waffo" className="text-xs gap-1.5 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isZh ? "银行卡 / 快捷支付" : "Card / Global Pay"}</span>
                </TabsTrigger>
                <TabsTrigger value="paypal" className="text-xs gap-1.5 flex items-center justify-center">
                  <span>PayPal</span>
                </TabsTrigger>
              </TabsList>

              {/* Error Message */}
              {error && (
                <div className="mt-3 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Channel 1: Waffo Pancake Content */}
              <TabsContent value="waffo" className="mt-3 space-y-3">
                {waffoState === "waiting" ? (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-foreground shrink-0" />
                      <span>{isZh ? "等待支付完成..." : "Waiting for payment completion..."}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isZh
                        ? "已为您打开聚合安全收银台。完成支付后本窗口将自动识别并激活权益。"
                        : "Checkout page has been opened. This window will automatically verify and upgrade your account upon payment."}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {waffoCheckoutUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(waffoCheckoutUrl, "_blank", "noopener,noreferrer")}
                          className="h-8 text-xs gap-1.5 flex-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isZh ? "重新打开收银台" : "Reopen Checkout"}</span>
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isManualChecking}
                        onClick={handleManualVerify}
                        className="h-8 text-xs gap-1.5 flex-1"
                      >
                        {isManualChecking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{isZh ? "手动核验" : "Verify Payment"}</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground leading-relaxed flex items-center justify-between">
                      <span>{isZh ? "全球聚合安全收银通道" : "Global Checkout Gateway"}</span>
                      <span className="font-mono text-muted-foreground">Visa / MC / Amex</span>
                    </div>
                    <Button
                      onClick={handleStartWaffoCheckout}
                      disabled={waffoState === "creating"}
                      className="w-full h-9 text-sm font-medium gap-2"
                    >
                      {waffoState === "creating" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isZh ? "正在接入安全通道..." : "Connecting..."}</span>
                        </>
                      ) : (
                        <>
                          <span>{isZh ? "前往收银台安全支付" : "Proceed to Checkout"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Channel 2: PayPal Content */}
              <TabsContent value="paypal" className="mt-3">
                {isCapturingPayPal && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2.5">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                    <p className="text-sm text-muted-foreground animate-pulse">
                      {isZh ? "正在确认支付并激活权益..." : "Verifying payment with PayPal..."}
                    </p>
                  </div>
                )}

                <div className={isCapturingPayPal ? "hidden" : "space-y-3 pt-1"}>
                  {isLoadingPayPalScript && (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {isZh ? "正在载入 PayPal 安全组件..." : "Loading PayPal checkout..."}
                      </span>
                    </div>
                  )}
                  <div ref={paypalContainerRef} className="min-h-[40px]" />
                </div>
              </TabsContent>
            </Tabs>

            {/* Trust Footer with Terms & Refund Policy Links */}
            <div className="pt-2 border-t border-border flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <span>
                  {isZh
                    ? "端到端银行级传输加密 · 一次性买断无隐形扣费"
                    : "End-to-end encrypted · One-time lifetime checkout"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link
                  href="/terms"
                  target="_blank"
                  className="hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  {isZh ? "服务条款与退款政策" : "Terms & Refund Policy"}
                </Link>
                <span>·</span>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  {isZh ? "隐私协议" : "Privacy Policy"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
