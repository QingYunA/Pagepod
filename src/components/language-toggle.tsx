"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 font-mono cursor-pointer shrink-0"
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      title={locale === "zh" ? "Switch to English" : "切换为中文"}
    >
      <Languages className="w-4 h-4" />
      <span>{locale === "zh" ? "EN" : "中"}</span>
    </Button>
  );
}
