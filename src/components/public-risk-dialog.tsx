"use client";

import { useState } from "react";
import { AlertTriangle, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/context";
import type { SensitiveRiskMatch } from "@/lib/scanner/sensitive-scanner";

interface PublicRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: SensitiveRiskMatch[];
  onConfirmPublic: () => void;
  onSwitchToPrivate: () => void;
}

export function PublicRiskDialog({
  open,
  onOpenChange,
  matches,
  onConfirmPublic,
  onSwitchToPrivate,
}: PublicRiskDialogProps) {
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const hasSevereRisk = matches.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-5 space-y-4">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center border shrink-0 ${
                hasSevereRisk
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-muted text-foreground border-border"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.riskDialog.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {hasSevereRisk ? t.riskDialog.warningSubtitle : t.riskDialog.normalSubtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scan Results Table if any matches */}
        {hasSevereRisk && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.riskDialog.detectedTitle}</span>
              </span>
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                {matches.length} 项潜在凭据
              </Badge>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-background/80 border border-border text-xs flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{m.rule}</span>
                    <span className="text-xs text-muted-foreground uppercase font-mono">
                      {m.category}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{m.description}</div>
                  {m.sample && (
                    <code className="text-amber-700 dark:text-amber-300 font-mono text-xs bg-muted/60 px-1 py-0.5 rounded mt-0.5">
                      命中片段: {m.sample}
                    </code>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-700/90 dark:text-amber-300/90 leading-relaxed pt-1">
              {t.riskDialog.adviceDesc}
            </p>
          </div>
        )}

        {/* Disclaimer terms */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <span className="font-semibold text-foreground block">
            {t.riskDialog.termsTitle}
          </span>
          <p>{t.riskDialog.termsText}</p>
        </div>

        {/* Checkbox agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-input text-foreground focus:ring-1 focus:ring-ring"
          />
          <span className="text-sm text-foreground font-medium leading-tight">
            {t.riskDialog.ackCheckbox}
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onSwitchToPrivate}
            className="w-full sm:w-auto h-9 text-sm gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Lock className="w-4 h-4" />
            <span>{t.riskDialog.switchToPrivate}</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-sm"
            >
              {t.riskDialog.cancel}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!agreed}
              onClick={onConfirmPublic}
              className="h-9 text-sm border-destructive text-destructive hover:bg-destructive/10"
            >
              <span>{t.riskDialog.proceedPublic}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
