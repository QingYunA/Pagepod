"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { translations, type Locale } from "@/lib/i18n/translations";
import { isClientCloudMode } from "@/lib/supabase/client";
import { InstantUploadCard } from "@/components/instant-upload-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowDown } from "lucide-react";

export function HeroSection({ initialLocale }: { initialLocale?: Locale }) {
  const { t: clientT, locale: clientLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isCloud = isClientCloudMode();
  const customSiteName = process.env.NEXT_PUBLIC_SITE_NAME?.trim();

  const activeLocale = !mounted && initialLocale ? initialLocale : (clientLocale || initialLocale || "en");
  const t = translations[activeLocale] || clientT;

  const title = !isCloud && customSiteName ? customSiteName : t.hero.title;
  const desc =
    !isCloud && t.hero.selfhostDesc
      ? t.hero.selfhostDesc
      : t.hero.desc;

  const quickCategories = [
    { id: "tools", label: t.categories.tools },
    { id: "games", label: t.categories.games },
    { id: "visualization", label: t.categories.visualization },
    { id: "ai", label: t.categories.ai },
  ];

  const handleBrowseShowcase = () => {
    const el = document.getElementById("gallery");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "/#gallery");
    }
  };

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
          <InstantUploadCard initialLocale={initialLocale} />
        </div>

        {/* Showcase Discovery Teaser Banner (自然中文、事实先行、无 AI 味) */}
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card/40 backdrop-blur-xs text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-border/70 bg-muted/50 flex items-center justify-center text-foreground shrink-0">
              <Sparkles className="w-4 h-4 text-foreground/80" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {t.hero.showcaseTeaser}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {quickCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    role="button"
                    tabIndex={0}
                    onClick={handleBrowseShowcase}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBrowseShowcase();
                      }
                    }}
                    className="text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border-border/60 py-0.5 px-2"
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowseShowcase}
            className="h-9 px-4 text-xs sm:text-sm font-medium shrink-0 cursor-pointer w-full sm:w-auto"
          >
            <span>{t.hero.browseShowcase}</span>
            <ArrowDown className="w-3.5 h-3.5 ml-1.5 opacity-70" />
          </Button>
        </div>
      </div>
    </section>
  );
}
