"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

export function NotFoundContent() {
  const { t } = useLanguage();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-mono text-muted-foreground">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {t.notFound.title}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t.notFound.description}
      </p>
      <Button asChild className="mt-6 h-9 text-sm">
        <Link href="/">{t.notFound.backHome}</Link>
      </Button>
    </main>
  );
}
