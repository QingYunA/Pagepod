"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
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

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 overflow-hidden"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "切换为浅色模式" : "切换为深色模式"}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
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
