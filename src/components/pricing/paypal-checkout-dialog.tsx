"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  LogIn,
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

interface PayPalCheckoutDialogProps {
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

export default function PayPalCheckoutDialog({
  isOpen,
  onClose,
  planTier,
  user,
  onSuccess,
}: PayPalCheckoutDialogProps) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";

  const [isLoadingScript, setIsLoadingScript] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonsRendered = useRef(false);

  const plan = PLAN_DETAILS[planTier] || PLAN_DETAILS.lite;
  const PlanIcon = plan.icon;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setError(null);
      setIsCapturing(false);
      buttonsRendered.current = false;
      return;
    }

    if (!user) {
      setIsLoadingScript(false);
      return;
    }

    if (!clientId) {
      setError(
        isZh
          ? "未配置 PayPal Client ID，请检查环境变量 NEXT_PUBLIC_PAYPAL_CLIENT_ID"
          : "PayPal Client ID is not configured in environment variables."
      );
      setIsLoadingScript(false);
      return;
    }

    setIsLoadingScript(true);
    setError(null);

    // Dynamically load PayPal SDK script
    const scriptId = "paypal-sdk-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initButtons = () => {
      if (!window.paypal || !containerRef.current || buttonsRendered.current) return;
      containerRef.current.innerHTML = "";

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
              setIsCapturing(true);
              try {
                const res = await fetch("/api/payments/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });

                const result = await res.json();
                if (!res.ok || !result.success) {
                  throw new Error(result.error || "Payment verification failed");
                }

                setIsSuccess(true);
                onSuccess?.(result.planTier || planTier);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Payment capture failed";
                setError(msg);
              } finally {
                setIsCapturing(false);
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
          .render(containerRef.current)
          .then(() => {
            buttonsRendered.current = true;
            setIsLoadingScript(false);
          })
          .catch((err: unknown) => {
            console.error("Failed to render PayPal buttons:", err);
            setError(isZh ? "加载 PayPal 支付组件失败" : "Failed to render PayPal buttons");
            setIsLoadingScript(false);
          });
      } catch (err: unknown) {
        console.error("Error creating PayPal buttons:", err);
        setError(isZh ? "初始化 PayPal 失败" : "Failed to initialize PayPal");
        setIsLoadingScript(false);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        clientId
      )}&currency=USD&intent=capture`;
      script.async = true;
      script.onload = () => {
        initButtons();
      };
      script.onerror = () => {
        setError(
          isZh
            ? "无法加载 PayPal 安全组件，请检查网络连接。"
            : "Failed to connect to PayPal. Please check your network."
        );
        setIsLoadingScript(false);
      };
      document.body.appendChild(script);
    } else {
      // Script already loaded or in DOM
      if (window.paypal) {
        initButtons();
      } else {
        script.addEventListener("load", initButtons);
      }
    }

    return () => {
      buttonsRendered.current = false;
    };
  }, [isOpen, planTier, user, clientId, isZh, onSuccess]);

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
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {isZh
                  ? "请先登录或注册 Pagepod 账号，以便我们在支付完成后即时为您激活终身会员权益。"
                  : "Please sign in or create an account first so we can bind your lifetime privileges immediately upon payment."}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2 flex flex-col gap-2">
              <Button asChild className="w-full h-9 text-xs font-medium gap-2">
                <Link href={`/login?from=${encodeURIComponent(`/pricing?tier=${planTier}`)}`}>
                  <span>{isZh ? "立即登录 / 注册" : "Sign In / Register"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
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
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh
                  ? `已成功激活 ${plan.nameZh}，权益已绑定至您的账号。`
                  : `Your account has been permanently upgraded to ${plan.nameEn}. Enjoy your lifetime access!`}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button asChild className="w-full h-9 text-xs font-medium gap-2">
                <Link href="/workspace">
                  <span>{isZh ? "进入我的工作台" : "Go to Workspace"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Case 3: Normal Checkout Flow */
          <div className="space-y-5">
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlanIcon className="w-4 h-4 text-foreground" />
                  <DialogTitle className="text-sm font-semibold tracking-tight text-foreground">
                    {isZh ? plan.nameZh : plan.nameEn}
                  </DialogTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-border">
                  {isZh ? plan.badgeZh : plan.badgeEn}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
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
                  <span className="text-[11px] font-normal text-muted-foreground">USD</span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {isZh ? "一次性买断" : "Lifetime"}
                </Badge>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                {isZh ? "包含权益" : "Included Perks"}
              </div>
              <ul className="space-y-2 text-xs text-foreground/90">
                {(isZh ? plan.featuresZh : plan.featuresEn).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Capturing Overlay */}
            {isCapturing && (
              <div className="py-6 flex flex-col items-center justify-center space-y-2.5">
                <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                <p className="text-xs text-muted-foreground animate-pulse">
                  {isZh ? "正在确认支付并激活权益..." : "Verifying payment with PayPal..."}
                </p>
              </div>
            )}

            {/* PayPal Button Container */}
            <div className={isCapturing ? "hidden" : "space-y-3 pt-1"}>
              {isLoadingScript && (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {isZh ? "正在载入 PayPal 安全通道..." : "Loading PayPal secure checkout..."}
                  </span>
                </div>
              )}
              <div ref={containerRef} className="min-h-[40px]" />
            </div>

            {/* Trust Footer */}
            <div className="pt-2 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {isZh
                  ? "PayPal 官方加密保障 · 支持余额与各大信用卡"
                  : "Encrypted via PayPal · Supports PayPal, Debit & Credit"}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
