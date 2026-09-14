"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TokenGateInputProps {
  slug: string;
}

export function TokenGateInput({ slug }: TokenGateInputProps) {
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;

    setIsSubmitting(true);
    router.push(`/p/${slug}?token=${encodeURIComponent(cleanToken)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Paste access token (e.g. sec_...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="pl-9 h-9 text-xs font-mono bg-card"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !token.trim()}
          className="h-9 px-3 text-xs gap-1"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span>Unlock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-left">
        Tip: The project author can find the access token in their original share URL.
      </p>
    </form>
  );
}
