"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

interface BrandLogoProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({ size = 24, className = "w-6 h-6", decorative = false }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR or before mount: render CSS based toggle with no flash
  if (!mounted) {
    return (
      <div className={`relative ${className} rounded-md overflow-hidden flex items-center justify-center shrink-0`}>
        <Image
          src="/brand/pagepod-logo-monochrome.png"
          alt={decorative ? "" : "Pagepod"}
          aria-hidden={decorative || undefined}
          width={size}
          height={size}
          className="w-full h-full object-contain dark:hidden"
          priority
        />
        <Image
          src="/brand/pagepod-logo-dark.png"
          alt={decorative ? "" : "Pagepod"}
          aria-hidden={decorative || undefined}
          width={size}
          height={size}
          className="w-full h-full object-contain hidden dark:block"
          priority
        />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className={`relative ${className} rounded-md overflow-hidden flex items-center justify-center shrink-0 transition-opacity duration-150`}>
      <Image
        key={isDark ? "dark-logo" : "light-logo"}
        src={isDark ? "/brand/pagepod-logo-dark.png" : "/brand/pagepod-logo-monochrome.png"}
        alt={decorative ? "" : "Pagepod"}
        aria-hidden={decorative || undefined}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}
