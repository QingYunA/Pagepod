import crypto from "node:crypto";
import { checkRateLimit } from "./rate-limiter";
import { scanForSecrets, type SecretFinding } from "@/lib/security/secret-guard";
import { detectPhishingHeuristics } from "@/lib/moderation/rules/phishing";
import { createProject, sanitizeSlug, ProjectValidationError, ProjectPayloadTooLargeError, ProjectForbiddenError } from "./project-service";
import { getProjectBySlug, updateProject } from "@/db";
import { categorySchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { CurrentUser } from "@/lib/auth";
import { nanoid } from "nanoid";

export const MAX_GUEST_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB strict ceiling
export const GUEST_RATE_LIMIT_PER_HOUR = 10;

export interface GuestUploadInput {
  htmlContent: string;
  clientIp: string;
  title?: string;
  slug?: string;
  category?: string;
  forcePublishWithSecret?: boolean;
  currentUser?: CurrentUser | null;
}

export interface GuestUploadResult {
  success: boolean;
  slug?: string;
  claimToken?: string;
  title?: string;
  url?: string;
  isDirectClaimed?: boolean;
  requiresConfirmation?: boolean;
  secretFinding?: SecretFinding;
  error?: string;
  rateLimitResetInSeconds?: number;
}

export interface ClaimGuestResult {
  claimedCount: number;
  resolvedSlugs: string[];
  errors: string[];
}

export function hashClaimToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateClaimToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Handles anonymous guest uploads with strict security, rate limiting, and claim token issuance.
 * If an authenticated user is provided, directly assigns project ownership without issuing a claimToken.
 */
export async function handleGuestUpload(input: GuestUploadInput): Promise<GuestUploadResult> {
  const { htmlContent, clientIp, forcePublishWithSecret = false, currentUser } = input;
  const isAuthUser = Boolean(currentUser && currentUser.id && !currentUser.id.startsWith("guest:"));

  // 1. IP Rate Limiting (only strictly enforced for anonymous guests)
  if (!isAuthUser) {
    const rateLimit = checkRateLimit(clientIp, GUEST_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Hourly upload limit reached (max ${GUEST_RATE_LIMIT_PER_HOUR}/hour). Please try again in ${rateLimit.resetInSeconds}s or sign in for unlimited uploads.`,
        rateLimitResetInSeconds: rateLimit.resetInSeconds,
      };
    }
  }

  // 2. Strict Payload Ceiling
  if (!htmlContent || typeof htmlContent !== "string") {
    throw new ProjectValidationError("HTML content is required");
  }

  const payloadSize = Buffer.byteLength(htmlContent, "utf-8");
  if (payloadSize > MAX_GUEST_UPLOAD_BYTES) {
    throw new ProjectPayloadTooLargeError(
      `Guest upload exceeds 2MB limit (${(payloadSize / (1024 * 1024)).toFixed(2)}MB). Please sign in to upload larger files.`
    );
  }

  // 3. Secret Leak Guard
  const secretFinding = scanForSecrets(htmlContent);
  if (secretFinding && !forcePublishWithSecret) {
    return {
      success: false,
      requiresConfirmation: true,
      secretFinding,
      error: `Detected potential exposed secret (${secretFinding.label}). Please confirm before public exposure.`,
    };
  }

  // 4. Deterministic Anti-Phishing Guard
  const phishingFinding = detectPhishingHeuristics(htmlContent);
  if (phishingFinding && phishingFinding.severity === "critical_block") {
    throw new ProjectForbiddenError(
      `Content violates safety policy: ${phishingFinding.reason}`
    );
  }

  // 5. Generate Actor & Claim Token (if anonymous)
  let claimToken: string | undefined;
  let actor: CurrentUser;
  let tags: string[] = [];

  if (isAuthUser && currentUser) {
    actor = currentUser;
    tags = [];
  } else {
    claimToken = generateClaimToken();
    const tokenHash = hashClaimToken(claimToken);
    const guestUserId = `guest:${tokenHash.slice(0, 24)}`;
    actor = {
      id: guestUserId,
      email: `${guestUserId}@guest.local`,
      role: "user",
    };
    tags = ["guest-upload", `claim:${tokenHash.slice(0, 24)}`];
  }

  // 6. Resolve Title and Unique Slug
  let rawTitle = input.title?.trim();
  if (!rawTitle) {
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    rawTitle = titleMatch && titleMatch[1].trim() ? titleMatch[1].trim() : "Interactive Web App";
  }

  const slug = sanitizeSlug(input.slug || rawTitle);

  // Validate Category with Strict Schema Enum
  const categoryParsed = categorySchema.safeParse(input.category || "tools");
  const category = categoryParsed.success ? categoryParsed.data : "tools";

  // 7. Persist Project via Domain Service (handles slug uniqueness internally)
  const project = await createProject(actor, {
    title: rawTitle,
    slug,
    description: isAuthUser
      ? `Interactive HTML application published on Pagepod.`
      : `Public HTML application shared via Pagepod guest runner.`,
    category,
    visibility: "public",
    htmlContent,
    fileSize: payloadSize,
    tags,
  });

  return {
    success: true,
    slug: project.slug,
    claimToken,
    title: project.title,
    url: `/p/${project.slug}`,
    isDirectClaimed: isAuthUser,
  };
}

/**
 * Claims guest projects created on the client's browser to the authenticated user.
 */
export async function claimGuestProjects(
  user: CurrentUser,
  claims: Array<{ slug: string; claimToken: string }>
): Promise<ClaimGuestResult> {
  if (!user || !user.id || user.id.startsWith("guest:")) {
    throw new ProjectForbiddenError("Authenticated user required to claim projects");
  }

  let claimedCount = 0;
  const resolvedSlugs: string[] = [];
  const errors: string[] = [];

  for (const item of claims) {
    try {
      const project = await getProjectBySlug(item.slug);
      if (!project) {
        // Project no longer exists, safe to resolve
        resolvedSlugs.push(item.slug);
        continue;
      }

      // Already owned by this user
      if (project.userId === user.id) {
        resolvedSlugs.push(item.slug);
        continue;
      }

      const expectedHash = hashClaimToken(item.claimToken).slice(0, 24);
      const expectedGuestId = `guest:${expectedHash}`;

      // Verify ownership either via guest user ID or claim tag
      const isOwner =
        project.userId === expectedGuestId ||
        (Array.isArray(project.tags) && project.tags.includes(`claim:${expectedHash}`));

      if (isOwner) {
        const cleanedTags = (project.tags || []).filter(
          (t) => t !== "guest-upload" && !t.startsWith("claim:")
        );

        await updateProject(project.id, {
          userId: user.id,
          tags: cleanedTags,
        });

        claimedCount++;
        resolvedSlugs.push(item.slug);

        try {
          revalidatePath("/");
          revalidatePath("/workspace");
          revalidatePath(`/p/${project.slug}`);
        } catch {
          // Non-fatal outside Next.js request context
        }
      } else {
        // Project is owned by someone else or token mismatch; mark resolved so client doesn't keep retrying
        resolvedSlugs.push(item.slug);
        errors.push(`Invalid claim token for project ${item.slug}`);
      }
    } catch (err: any) {
      errors.push(`Failed to claim ${item.slug}: ${err?.message || "Unknown error"}`);
    }
  }

  return { claimedCount, resolvedSlugs, errors };
}
