"use client";

import { useLanguage } from "@/lib/i18n/context";
import { isClientCloudMode } from "@/lib/supabase/client";
import { InstantUploadCard } from "@/components/instant-upload-card";

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
    <section className="border-b border-border/60 py-12 sm:py-16 px-4 sm:px-8 bg-card/20">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8 sm:space-y-10">
        {/* Top Editorial & Value Prop */}
        <div className="space-y-3 sm:space-y-4 flex flex-col items-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            {desc}
          </p>
        </div>

        {/* Bottom Prominent Drag-and-Drop Ingestion Card */}
        <div className="w-full">
          <InstantUploadCard />
        </div>
      </div>
    </section>
  );
}
