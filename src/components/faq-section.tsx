"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Zap, Globe, ShieldCheck, Lock, HelpCircle } from "lucide-react";

export function FaqSection() {
  const { t } = useLanguage();

  const faqItems = [
    {
      icon: Zap,
      question: t.faq.q1,
      answer: t.faq.a1,
    },
    {
      icon: Globe,
      question: t.faq.q2,
      answer: t.faq.a2,
    },
    {
      icon: ShieldCheck,
      question: t.faq.q3,
      answer: t.faq.a3,
    },
    {
      icon: Lock,
      question: t.faq.q4,
      answer: t.faq.a4,
    },
  ];

  return (
    <section className="border-t border-border/80 py-12 sm:py-16 px-4 sm:px-8 bg-card/10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-xs font-medium text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5 text-foreground" />
            <span>{t.faq.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {t.faq.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.faq.subtitle}
          </p>
        </div>

        {/* 2x2 Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {faqItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="rounded-xl border border-border/70 bg-card/40 p-5 sm:p-6 transition-colors hover:border-border/90 space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg border border-border/70 bg-muted/30 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <h3 className="text-sm sm:text-base font-medium text-foreground tracking-tight leading-snug">
                    {item.question}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-10.5">
                  {item.answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
