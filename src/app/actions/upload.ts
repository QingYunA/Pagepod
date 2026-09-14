"use server";

import { getCurrentUser } from "@/lib/auth";
import { createProject, ProjectDomainError } from "@/lib/services/project-service";
import { uploadPayloadSchema, MAX_UPLOAD_BYTES } from "@/lib/validation";

export interface UploadActionResult {
  success?: boolean;
  error?: string;
  slug?: string;
}

export async function handleUploadAction(
  prevState: UploadActionResult | null,
  formData: FormData
): Promise<UploadActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "无权限：请先登录管理员或用户账号" };
  }

  const str = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };

  const parseResult = uploadPayloadSchema.safeParse({
    title: str("title"),
    slug: str("slug"),
    description: str("description"),
    category: str("category"),
    language: str("language"),
    folderId: str("folderId") || null,
    tags: str("tags") ?? "",
    visibility: str("visibility") ?? "public",
    isPinned: formData.get("isPinned") === "true",
    isGlobalPinned: formData.get("isGlobalPinned") === "true",
    isWhiteLabel: formData.get("isWhiteLabel") === "true",
    customSubdomain: str("customSubdomain"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message || "表单参数不合法" };
  }

  const uploadType = str("uploadType"); // 'file' | 'paste'
  const {
    title,
    slug,
    description,
    category,
    language,
    folderId,
    tags,
    visibility,
    isPinned,
    isGlobalPinned,
    isWhiteLabel,
    customSubdomain,
  } = parseResult.data;

  try {
    if (uploadType === "paste") {
      const htmlContent = str("htmlContent");
      if (!htmlContent || !htmlContent.trim()) {
        return { error: "请输入或粘贴 HTML 代码" };
      }
      if (Buffer.byteLength(htmlContent, "utf-8") > MAX_UPLOAD_BYTES) {
        return { error: `HTML 内容过大：最大允许 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` };
      }

      const project = await createProject(user, {
        title,
        slug,
        description,
        category,
        language,
        folderId,
        tags,
        visibility,
        isPinned,
        isGlobalPinned,
        isWhiteLabel,
        customSubdomain,
        htmlContent,
      });

      return { success: true, slug: project.slug };
    } else {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return { error: "请选择要上传的 .html 或 .zip 文件" };
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return { error: `文件过大：最大允许 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` };
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const project = await createProject(user, {
        title,
        slug,
        description,
        category,
        language,
        folderId,
        tags,
        visibility,
        isPinned,
        isGlobalPinned,
        isWhiteLabel,
        customSubdomain,
        fileBuffer,
        fileName: file.name,
      });

      return { success: true, slug: project.slug };
    }
  } catch (err: unknown) {
    console.error("Upload error:", err);
    if (err instanceof ProjectDomainError) {
      return { error: err.message };
    }
    return { error: (err as Error)?.message || "上传失败，请检查文件或重试" };
  }
}
