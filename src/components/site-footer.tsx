"use client";

import Link from "next/link";
import { ShieldCheck, Terminal, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { isClientCloudMode } from "@/lib/supabase/client";

export function SiteFooter() {
  const { t } = useLanguage();
  const isCloud = isClientCloudMode();

  return (
    <footer className="border-t border-border/80 py-8 px-4 sm:px-8 text-xs text-muted-foreground bg-muted/10">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Top Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {t.footer.sandboxGuaranteed}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" /> {t.footer.apiPush}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t.footer.e2eeReady}
            </span>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            {t.footer.copyright}
          </div>
        </div>

        {/* Bottom Legal & Compliance Links */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-foreground transition-colors">
              {t.footer.about}
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t.footer.privacy}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t.footer.terms}
            </Link>
            {isCloud && (
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                {t.nav.pricing}
              </Link>
            )}
            <a
              href="mailto:contact@pagepod.dev"
              className="hover:text-foreground transition-colors"
            >
              {t.footer.contact}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
            <a
              href="https://github.com/QingYunA/html-manager"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-mono"
            >
              GitHub (MIT)
            </a>
            <span>•</span>
            <span>© {new Date().getFullYear()} Pagepod</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
