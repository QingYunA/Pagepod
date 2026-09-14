"use server";

import { headers } from "next/headers";
import { handleGuestUpload, claimGuestProjects, type GuestUploadResult } from "@/lib/services/guest-upload";
import { getCurrentUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

export async function submitGuestUpload(
  formData: FormData,
  forcePublishWithSecret = false
): Promise<GuestUploadResult> {
  const reqHeaders = await headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : reqHeaders.get("x-real-ip") || "127.0.0.1";

  const file = formData.get("file");
  let htmlContent = "";

  if (file instanceof File) {
    if (file.size === 0) {
      return { success: false, error: "Uploaded file is empty." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    htmlContent = buffer.toString("utf-8");
  } else {
    const rawCode = formData.get("htmlContent");
    if (typeof rawCode === "string") {
      htmlContent = rawCode;
    }
  }

  if (!htmlContent.trim()) {
    return { success: false, error: "Please provide valid HTML code or a single .html file." };
  }

  const title = formData.get("title")?.toString();
  const slug = formData.get("slug")?.toString();
  const categoryRaw = formData.get("category")?.toString() || "tools";
  const catParsed = categorySchema.safeParse(categoryRaw);
  const category = catParsed.success ? catParsed.data : "tools";

  const currentUser = await getCurrentUser();

  try {
    return await handleGuestUpload({
      htmlContent,
      clientIp,
      title,
      slug,
      category,
      forcePublishWithSecret,
      currentUser,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to process guest upload",
    };
  }
}

export interface ReconcileClaimsResult {
  authenticated: boolean;
  success: boolean;
  claimedCount: number;
  resolvedSlugs: string[];
  errors?: string[];
}

/**
 * Reconciles and claims browser-persisted guest projects when an authenticated session exists.
 * Safely returns resolvedSlugs (both claimed and stale/unclaimable items) so the client can purge them.
 */
export async function reconcileGuestProjectsAction(
  claims: Array<{ slug: string; claimToken: string }>
): Promise<ReconcileClaimsResult> {
  const user = await getCurrentUser();
  if (!user || !user.id || user.id.startsWith("guest:")) {
    return {
      authenticated: false,
      success: true,
      claimedCount: 0,
      resolvedSlugs: [],
    };
  }

  if (!claims || claims.length === 0) {
    return {
      authenticated: true,
      success: true,
      claimedCount: 0,
      resolvedSlugs: [],
    };
  }

  const result = await claimGuestProjects(user, claims);
  return {
    authenticated: true,
    success: true,
    claimedCount: result.claimedCount,
    resolvedSlugs: result.resolvedSlugs,
    errors: result.errors.length > 0 ? result.errors : undefined,
  };
}

export async function claimUserGuestProjects(
  claims: Array<{ slug: string; claimToken: string }>
): Promise<{ success: boolean; claimedCount: number; resolvedSlugs?: string[]; errors?: string[] }> {
  const res = await reconcileGuestProjectsAction(claims);
  if (!res.authenticated) {
    return { success: false, claimedCount: 0, errors: ["Authentication required"] };
  }
  return {
    success: res.success,
    claimedCount: res.claimedCount,
    resolvedSlugs: res.resolvedSlugs,
    errors: res.errors,
  };
}
