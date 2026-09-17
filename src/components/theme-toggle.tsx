"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale } = useLanguage();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  // Use resolvedTheme so the icon reflects the actual applied theme (handles "system")
  const isDark = resolvedTheme === "dark";
  const titleText = isDark
    ? (locale === "zh" ? "切换为浅色模式" : "Switch to light mode")
    : (locale === "zh" ? "切换为深色模式" : "Switch to dark mode");

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 overflow-hidden"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={titleText}
      aria-label={titleText}
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-200 ease-out ${
          isDark
            ? "scale-100 rotate-0 opacity-100 filter-none"
            : "scale-50 -rotate-90 opacity-0 blur-[2px]"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-200 ease-out ${
          isDark
            ? "scale-50 rotate-90 opacity-0 blur-[2px]"
            : "scale-100 rotate-0 opacity-100 filter-none"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
