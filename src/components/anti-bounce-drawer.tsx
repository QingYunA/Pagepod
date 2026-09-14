"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Sparkles, Play, Code2, Share2, Check, ExternalLink, ShieldCheck } from "lucide-react";
import type { Project } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/context";

interface AntiBounceDrawerProps {
  project: Project;
  relatedProjects: Project[];
  onOpenSourceModal?: () => void;
  onOpenShareModal?: () => void;
}

export function AntiBounceDrawer({
  project,
  relatedProjects,
  onOpenSourceModal,
  onOpenShareModal,
}: AntiBounceDrawerProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
      {/* Drawer Toggle Handle */}
      <div className="pointer-events-auto mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 px-3.5 text-xs gap-1.5 rounded-full shadow-md bg-background/90 backdrop-blur-md border-border/80 hover:bg-background text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium">
            {isOpen ? t.runner.close : `${t.runner.details} & ${relatedProjects.length} ${t.runner.relatedTitle}`}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Drawer Body */}
      {isOpen && (
        <div className="pointer-events-auto w-full max-w-5xl mx-auto p-4 sm:p-6 rounded-t-2xl border-t border-x border-border/90 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-6 space-y-5">
          {/* Top Row: Meta + Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2 py-0.5 uppercase font-mono border-border">
                  {project.category}
                </Badge>
                <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                  {project.language.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {project.viewCount} {t.gallery.totalCount.replace("{count}", "").trim()}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenSourceModal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenSourceModal}
                  className="h-9 text-sm gap-1.5 border-border/80"
                >
                  <Code2 className="w-4 h-4" />
                  <span>{t.runner.sourceCode}</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 text-sm gap-1.5 border-border/80"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? t.runner.copied : t.runner.copyLink}</span>
              </Button>

              <Button asChild size="sm" variant="secondary" className="h-9 text-sm gap-1.5">
                <Link href={`/explore/${project.category}`}>
                  <span>{t.nav.explore}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Bottom Row: Related Projects Flow */}
          {relatedProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t.runner.relatedTitle}
                </span>
                <Link
                  href={`/explore/${project.category}`}
                  className="hover:text-foreground transition-colors text-xs"
                >
                  {t.categories.all} →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedProjects.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/p/${rel.slug}`}
                    className="group p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-foreground/30 transition-all flex flex-col justify-between text-left space-y-2"
                  >
                    <div>
                      <span className="text-xs font-mono text-muted-foreground uppercase block mb-1">
                        {rel.category}
                      </span>
                      <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {rel.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {rel.description || "Interactive HTML project."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t border-border/40">
                      <span className="font-mono truncate max-w-[90px]">/p/{rel.slug}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        <Play className="w-3 h-3 fill-emerald-500" />
                        Run
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
