export type ModerationSeverity = "critical_block" | "warning_remedial" | "info";

export type ModerationCategory =
  | "sexual"
  | "violence"
  | "gore"
  | "geopolitical"
  | "phishing"
  | "hate"
  | "self_harm"
  | "other";

export interface ModerationFinding {
  category: ModerationCategory;
  severity: ModerationSeverity;
  reason: string;
  matchedKeywords?: string[];
}

export type ModerationAction = "pass" | "critical_block" | "flagged_controversy";

export interface ModerationResult {
  action: ModerationAction;
  reviewStatus: "approved" | "rejected" | "flagged";
  category?: ModerationCategory;
  reason?: string;
  matchedKeywords?: string[];
}
