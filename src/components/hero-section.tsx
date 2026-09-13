"use client";

import { useLanguage } from "@/lib/i18n/context";
import { isClientCloudMode } from "@/lib/supabase/client";

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
    <section className="border-b border-border/60 py-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-2.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {desc}
        </p>
      </div>
    </section>
  );
}
