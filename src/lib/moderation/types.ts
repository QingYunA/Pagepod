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

export type NotificationType =
  | "moderation_downgrade"
  | "moderation_rejected"
  | "system"
  | string;

export interface AppealProjectInfo {
  id: string;
  slug: string;
  title: string;
  reviewStatus?: string | null;
}

export function createAppealMailtoUrl(project: AppealProjectInfo): string {
  const subject = encodeURIComponent(`[Appeal] Review request for project ${project.slug}`);
  const statusStr = project.reviewStatus || "review";
  const body = encodeURIComponent(
    `Hello Pagepod Admin,\n\nI would like to request an appeal review for my project:\n- Project ID: ${project.id}\n- Slug: ${project.slug}\n- Title: ${project.title}\n- Current Status: ${statusStr}\n- Notes/Reason:\n`
  );
  return `mailto:support@pagepod.dev?subject=${subject}&body=${body}`;
}
