import crypto from "node:crypto";
import { checkRateLimit } from "./rate-limiter";
import { scanForSecrets, type SecretFinding } from "@/lib/security/secret-guard";
import { detectPhishingHeuristics } from "@/lib/moderation/rules/phishing";
import { createProject, sanitizeSlug, ProjectValidationError, ProjectPayloadTooLargeError, ProjectForbiddenError } from "./project-service";
import { getProjectBySlug, updateProject } from "@/db";
import { categorySchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { CurrentUser } from "@/lib/auth";

export const MAX_GUEST_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB strict ceiling
export const GUEST_RATE_LIMIT_PER_HOUR = 10;

export interface GuestUploadInput {
  htmlContent: string;
  clientIp: string;
  title?: string;
  slug?: string;
  category?: string;
  visibility?: "public" | "unlisted";
  forcePublishWithSecret?: boolean;
}

export interface GuestUploadResult {
  success: boolean;
  slug?: string;
  claimToken?: string;
  accessToken?: string;
  visibility?: "public" | "unlisted";
  title?: string;
  url?: string;
  requiresConfirmation?: boolean;
  secretFinding?: SecretFinding;
  error?: string;
  rateLimitResetInSeconds?: number;
}

export function hashClaimToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateClaimToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateAccessToken(): string {
  return `sec_${crypto.randomBytes(8).toString("hex")}`;
}

export function extractProjectAccessToken(project: { tags?: string[] | null }): string | null {
  if (!Array.isArray(project.tags)) return null;
  const found = project.tags.find((t) => typeof t === "string" && t.startsWith("token:"));
  return found ? found.replace(/^token:/, "") : null;
}

export function verifyProjectAccessToken(
  project: { visibility?: string | null; tags?: string[] | null },
  token?: string | null,
  isCreator = false
): boolean {
  if (isCreator) return true;
  if (project.visibility === "public") return true;
  if (project.visibility === "private") return isCreator;

  // Unlisted project token verification
  const expected = extractProjectAccessToken(project);
  if (!expected) return true; // Legacy unlisted without token allows link-holders
  if (!token || typeof token !== "string") return false;

  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/**
 * Handles anonymous guest uploads with strict security, rate limiting, and claim token issuance.
 */
export async function handleGuestUpload(input: GuestUploadInput): Promise<GuestUploadResult> {
  const { htmlContent, clientIp, forcePublishWithSecret = false } = input;

  // 1. IP Rate Limiting
  const rateLimit = checkRateLimit(clientIp, GUEST_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Hourly upload limit reached (max ${GUEST_RATE_LIMIT_PER_HOUR}/hour). Please try again in ${rateLimit.resetInSeconds}s or sign in for unlimited uploads.`,
      rateLimitResetInSeconds: rateLimit.resetInSeconds,
    };
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

  // 5. Generate Claim Token & Guest Actor
  const claimToken = generateClaimToken();
  const tokenHash = hashClaimToken(claimToken);
  const guestUserId = `guest:${tokenHash.slice(0, 24)}`;

  const guestActor: CurrentUser = {
    id: guestUserId,
    email: `${guestUserId}@guest.local`,
    role: "user",
  };

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

  // 7. Persist Project via Domain Service (default: unlisted with secret access token)
  const visibility = input.visibility === "public" ? "public" : "unlisted";
  let accessToken: string | undefined;
  const projectTags: string[] = ["guest-upload", `claim:${tokenHash.slice(0, 24)}`];

  if (visibility === "unlisted") {
    accessToken = generateAccessToken();
    projectTags.push(`token:${accessToken}`);
  }

  const project = await createProject(guestActor, {
    title: rawTitle,
    slug,
    description: `HTML application shared via Pagepod guest runner.`,
    category,
    visibility,
    isGuestTransient: true,
    htmlContent,
    fileSize: payloadSize,
    tags: projectTags,
  });

  const url =
    visibility === "unlisted" && accessToken
      ? `/p/${project.slug}?token=${accessToken}`
      : `/p/${project.slug}`;

  return {
    success: true,
    slug: project.slug,
    claimToken,
    accessToken,
    visibility,
    title: project.title,
    url,
  };
}

/**
 * Claims guest projects created on the client's browser to the authenticated user.
 */
export async function claimGuestProjects(
  user: CurrentUser,
  claims: Array<{ slug: string; claimToken: string }>
): Promise<{ claimedCount: number; errors: string[] }> {
  if (!user || !user.id || user.id.startsWith("guest:")) {
    throw new ProjectForbiddenError("Authenticated user required to claim projects");
  }

  let claimedCount = 0;
  const errors: string[] = [];

  for (const item of claims) {
    try {
      const project = await getProjectBySlug(item.slug);
      if (!project) continue;

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
          isGuestTransient: false,
        });

        claimedCount++;

        try {
          revalidatePath("/");
          revalidatePath("/workspace");
          revalidatePath(`/p/${project.slug}`);
        } catch {
          // Non-fatal outside Next.js request context
        }
      } else {
        errors.push(`Invalid claim token for project ${item.slug}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Failed to claim ${item.slug}: ${msg}`);
    }
  }

  return { claimedCount, errors };
}
