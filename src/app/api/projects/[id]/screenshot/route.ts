import { NextResponse } from "next/server";
import { getCurrentUser, assertCanManageProject } from "@/lib/auth";
import { getProjectById, getProjectBySlug } from "@/db";
import { captureProjectScreenshot, saveCustomScreenshot } from "@/lib/services/screenshot-service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized: Please log in" }, { status: 401 });
  }

  const project = (await getProjectById(id)) || (await getProjectBySlug(id));
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  try {
    assertCanManageProject(user, project);
  } catch {
    return NextResponse.json({ success: false, error: "Forbidden: You cannot modify this project" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    // 1. Multipart Form Data with image file uploaded
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file || file.size === 0) {
        return NextResponse.json({ success: false, error: "Missing image file" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: "Screenshot file exceeds 5MB limit" }, { status: 400 });
      }

      if (file.type && !file.type.startsWith("image/")) {
        return NextResponse.json({ success: false, error: "Invalid file type: file must be an image" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const newUrl = await saveCustomScreenshot(project.slug, buffer);
      if (!newUrl) {
        return NextResponse.json({ success: false, error: "Failed to save screenshot" }, { status: 500 });
      }

      return NextResponse.json({ success: true, screenshotUrl: newUrl });
    }

    // 2. JSON Trigger: Re-run automated capture
    const newUrl = await captureProjectScreenshot(project.slug);
    if (!newUrl) {
      return NextResponse.json({
        success: false,
        error: "Server-side screenshot capture is not available on this host (Headless Chrome not found)",
      }, { status: 503 });
    }

    return NextResponse.json({ success: true, screenshotUrl: newUrl });
  } catch (err) {
    console.error("[ScreenshotAPI] Error:", err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Internal error capturing screenshot",
    }, { status: 500 });
  }
}
