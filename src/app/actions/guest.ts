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

  try {
    return await handleGuestUpload({
      htmlContent,
      clientIp,
      title,
      slug,
      category,
      forcePublishWithSecret,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to process guest upload",
    };
  }
}

export async function claimUserGuestProjects(
  claims: Array<{ slug: string; claimToken: string }>
): Promise<{ success: boolean; claimedCount: number; errors?: string[] }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, claimedCount: 0, errors: ["Authentication required"] };
  }

  if (!claims || claims.length === 0) {
    return { success: true, claimedCount: 0 };
  }

  const result = await claimGuestProjects(user, claims);
  return {
    success: true,
    claimedCount: result.claimedCount,
    errors: result.errors.length > 0 ? result.errors : undefined,
  };
}
