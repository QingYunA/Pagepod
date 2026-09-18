"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/context";

export default function TermsClient() {
  const { t } = useLanguage();
  const page = t.termsPage;

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="space-y-3 mb-10">
        <Badge variant="outline" className="px-3 py-0.5 text-xs font-mono">
          {page.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {page.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          {page.subtitle}
        </p>
      </div>

      <div className="space-y-8 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {page.sections.map((sec, idx) => (
          <section key={idx} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{sec.title}</h2>
            <p className="whitespace-pre-line">{sec.content}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
