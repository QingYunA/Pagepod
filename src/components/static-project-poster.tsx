"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Gamepad2,
  BarChart3,
  Smartphone,
  Sparkles,
  Layers,
  FileCode2,
  Bot,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

interface StaticProjectPosterProps {
  slug: string;
  title: string;
  category?: string;
  screenshotUrl?: string | null;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tools: Wrench,
  ai: Bot,
  games: Gamepad2,
  creative: Palette,
  visualization: BarChart3,
  prototypes: Smartphone,
  animations: Sparkles,
  others: Layers,
};

export default function StaticProjectPoster({
  slug,
  title,
  category = "tools",
  screenshotUrl,
  className,
  icon: CustomIcon,
}: StaticProjectPosterProps) {
  const { locale } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);
  const effectiveScreenshot = screenshotUrl || `/screenshots/${slug}.png`;
  const hasScreenshot = !imgFailed && effectiveScreenshot;

  const IconComponent = CustomIcon || CATEGORY_ICONS[category] || FileCode2;

  return (
    <Link
      href={`/p/${slug}`}
      target="_blank"
      title={locale === "zh" ? `在线运行: ${title}` : `Run online: ${title}`}
      className={cn(
        "group relative flex items-center justify-center w-14 aspect-video rounded overflow-hidden bg-neutral-950 border border-border/80 shrink-0 select-none shadow-2xs hover:border-neutral-400 transition-all duration-200 cursor-pointer",
        className
      )}
    >
      {/* Fallback Grid & Dot Pattern */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #71717a 1px, transparent 0)`,
          backgroundSize: "6px 6px",
        }}
        aria-hidden="true"
      />

      {/* Real Screenshot if available */}
      {hasScreenshot && (
        <img
          src={effectiveScreenshot}
          alt={title}
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-top opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200"
        />
      )}

      {/* Decorative center icon for clean engineering look */}
      <div className="relative z-10 text-neutral-400 group-hover:text-neutral-100 transition-colors pointer-events-none">
        <IconComponent className="w-3.5 h-3.5 drop-shadow-xs" />
      </div>

      {/* Subtle border highlight on hover */}
      <div className="absolute inset-0 rounded pointer-events-none border border-white/0 group-hover:border-white/10 transition-colors" />
    </Link>
  );
}
