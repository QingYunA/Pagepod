"use client";

import { useLanguage } from "@/lib/i18n/context";
import { isClientCloudMode } from "@/lib/supabase/client";
import { InstantUploadCard } from "@/components/instant-upload-card";
import { ShieldCheck, Zap, Globe, Sparkles } from "lucide-react";

export function HeroSection() {
  const { t } = useLanguage();
  const isCloud = isClientCloudMode();
  const customSiteName = process.env.NEXT_PUBLIC_SITE_NAME?.trim();

  const title = !isCloud && customSiteName ? customSiteName : t.hero.title;
  const desc =
    !isCloud && t.hero.selfhostDesc
      ? t.hero.selfhostDesc
      : t.hero.desc;

  return (
    <section className="border-b border-border/60 py-10 sm:py-14 px-4 sm:px-8 bg-card/20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Editorial & Value Prop */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-foreground" />
            <span>Zero-Config HTML Sandbox & Gallery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            {desc}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-5 text-sm text-muted-foreground/90">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-foreground" />
              <span>Instant Share URL</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-foreground" />
              <span>Sandboxed Execution</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-foreground" />
              <span>Public Showcase Feed</span>
            </div>
          </div>
        </div>

        {/* Right Instant Drag-and-Drop Ingestion Card */}
        <div className="lg:col-span-6">
          <InstantUploadCard />
        </div>
      </div>
    </section>
  );
}
