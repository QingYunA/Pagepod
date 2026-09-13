import { nanoid } from "nanoid";
import {
  createProject as dbCreateProject,
  getProjectBySlug as dbGetProjectBySlug,
  getProjectById as dbGetProjectById,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
} from "@/db";
import { getProjectStorage, getStorageType } from "@/lib/storage";
import { extractMetadataFromHtml, unpackZipBundle, detectHtmlLanguage } from "@/lib/parser";
import { renderProjectScreenshot, captureProjectScreenshot } from "@/lib/services/screenshot-service";
import { assertCanCreateProject } from "@/lib/services/billing-service";
import { assertCanManageProject, type CurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Project } from "@/db/schema";
import type { Language } from "@/lib/validation";

// --- Domain Errors ---

export class ProjectDomainError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "ProjectDomainError";
  }
}

export class ProjectNotFoundError extends ProjectDomainError {
  constructor(message = "Project not found") {
    super(message, 404);
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectForbiddenError extends ProjectDomainError {
  constructor(message = "Forbidden: You do not have permission to access or modify this project") {
    super(message, 403);
    this.name = "ProjectForbiddenError";
  }
}

export class ProjectValidationError extends ProjectDomainError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ProjectValidationError";
  }
}

export class ProjectPayloadTooLargeError extends ProjectDomainError {
  constructor(message: string) {
    super(message, 413);
    this.name = "ProjectPayloadTooLargeError";
  }
}

// --- Interfaces & Types ---

export type ProjectVisibility = "public" | "unlisted" | "private";

export interface ProjectServiceOptions {
  skipRevalidate?: boolean;
}

export interface CreateProjectInput {
  userId?: string;
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  language?: Language;
  tags?: string[];
  visibility?: ProjectVisibility;
  isPinned?: boolean;
  isGlobalPinned?: boolean;
  screenshotUrl?: string;
  htmlContent?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  fileSize?: number;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  category?: string;
  language?: Language;
  tags?: string[];
  visibility?: ProjectVisibility;
  isPinned?: boolean;
  isGlobalPinned?: boolean;
  htmlCode?: string;
}

export function sanitizeSlug(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || nanoid(8).toLowerCase();
}

function revalidateProjectPaths(slug?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/workspace");
    revalidatePath("/admin");
    revalidatePath("/explore");
    if (slug) {
      revalidatePath(`/p/${slug}`);
    }
  } catch {
    // Non-fatal if invoked outside of Next.js request context
  }
}

// --- High-Leverage Lifecycle Methods ---

/**
 * Ingests a new project: validates plan quota entitlements, uploads assets to scoped storage,
 * generates poster screenshot, performs single atomic DB insertion, and invalidates cache.
 */
export async function createProject(
  actor: CurrentUser,
  input: CreateProjectInput,
  options?: ProjectServiceOptions
): Promise<Project> {
  if (!actor || !actor.id) {
    throw new ProjectForbiddenError("Unauthorized: Authentication required to create a project");
  }

  let title = input.title?.trim() || "";
  let description = input.description?.trim() || "";
  let initialHtml = "";
  let assetType: "single_html" | "zip_bundle" = "single_html";
  let entryPath = "index.html";
  const storageType = getStorageType();

  // 1. Calculate and verify payload size & project count limits against user tier
  const declaredSize =
    input.fileSize ||
    (input.fileBuffer
      ? input.fileBuffer.length
      : input.htmlContent
      ? Buffer.byteLength(input.htmlContent, "utf-8")
      : 0);

  await assertCanCreateProject(actor, declaredSize);

  // 2. Generate unique slug
  let slug = input.slug ? sanitizeSlug(input.slug) : "";
  if (!slug) {
    slug = title ? sanitizeSlug(title) : nanoid(8).toLowerCase();
  }

  // Ensure slug uniqueness
  const existing = await dbGetProjectBySlug(slug);
  if (existing) {
    slug = `${slug}-${nanoid(4).toLowerCase()}`;
  }

  const projectStorage = getProjectStorage(slug);

  // 3. Process & persist assets to scoped storage
  if (input.htmlContent) {
    assetType = "single_html";
    entryPath = "index.html";
    initialHtml = input.htmlContent;

    const extracted = extractMetadataFromHtml(initialHtml);
    if (!title) title = extracted.title;
    if (!description) description = extracted.description;

    await projectStorage.writeEntryFile(initialHtml, entryPath);
  } else if (input.fileBuffer && input.fileName) {
    const isZip = input.fileName.toLowerCase().endsWith(".zip");

    if (isZip) {
      assetType = "zip_bundle";
      const unpacked = await unpackZipBundle(input.fileBuffer);
      entryPath = unpacked.entryPath;
      initialHtml = unpacked.initialHtml || "";

      if (initialHtml) {
        const extracted = extractMetadataFromHtml(initialHtml);
        if (!title) title = extracted.title;
        if (!description) description = extracted.description;
      }

      await projectStorage.writeBundle(unpacked.files);
    } else {
      assetType = "single_html";
      entryPath = "index.html";
      initialHtml = input.fileBuffer.toString("utf-8");

      const extracted = extractMetadataFromHtml(initialHtml);
      if (!title) title = extracted.title;
      if (!description) description = extracted.description;

      await projectStorage.writeEntryFile(input.fileBuffer, entryPath);
    }
  } else {
    throw new ProjectValidationError("Must provide either htmlContent or valid fileBuffer");
  }

  if (!title) {
    title = "Untitled Project";
  }

  // 4. Generate poster screenshot directly before initial DB write (Single Atomic Commit)
  let screenshotUrl = input.screenshotUrl || null;
  if (!screenshotUrl && initialHtml) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
      const publicUrl = (input.visibility || "public") === "public" ? `${siteUrl}/raw/${slug}` : undefined;
      const imgBuffer = await renderProjectScreenshot(initialHtml, publicUrl);
      if (imgBuffer) {
        await projectStorage.writeAsset("screenshot.png", imgBuffer, "image/png");
        screenshotUrl = `/raw/${slug}/screenshot.png?v=${Date.now()}`;
      }
    } catch (screenshotErr) {
      console.warn(`[ProjectService] Auto screenshot capture skipped for ${slug}:`, screenshotErr);
    }
  }

  const projectUserId = actor.id === "selfhost-admin" ? null : actor.id;
  const declaredLanguage = input.language || (initialHtml ? detectHtmlLanguage(initialHtml) : "zh");
  const isGlobalPinned = (actor.role === "admin" || actor.id === "selfhost-admin") ? Boolean(input.isGlobalPinned) : false;
  const isPinned = Boolean(input.isPinned);

  const project = await dbCreateProject({
    id: nanoid(12),
    userId: projectUserId,
    title,
    slug,
    description,
    category: input.category || "tools",
    language: declaredLanguage,
    tags: input.tags || [],
    assetType,
    entryPath,
    storageType,
    storagePrefix: projectStorage.storagePrefix,
    visibility: input.visibility || "public",
    isPinned,
    pinnedAt: isPinned ? new Date() : null,
    isGlobalPinned,
    globalPinnedAt: isGlobalPinned ? new Date() : null,
    viewCount: 0,
    screenshotUrl,
    isEncrypted: false,
    encryptionIv: null,
    fileSize: declaredSize,
    planTier: actor.planTier || "free",
  });

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }

  // 5. Post-commit Asynchronous Poster Ingestion
  // If screenshot was not generated synchronously (e.g. headless Chrome absent in serverless runtime),
  // trigger background capture now that the project is committed and publicly accessible at /raw/:slug.
  // Wrap in Next.js after() to keep the serverless worker alive until capture completes.
  if (!screenshotUrl && project.visibility === "public") {
    try {
      after(async () => {
        await captureProjectScreenshot(project.slug).catch((err) => {
          console.warn(`[ProjectService] Post-commit cloud screenshot capture skipped for ${project.slug}:`, err);
        });
      });
    } catch {
      captureProjectScreenshot(project.slug).catch((err) => {
        console.warn(`[ProjectService] Post-commit cloud screenshot capture skipped for ${project.slug}:`, err);
      });
    }
  }

  return project;
}

/**
 * Updates project metadata and optionally its entry HTML content.
 * Enforces authorization invariants, updates storage if code changed,
 * generates poster screenshot, and executes atomic DB commit.
 */
export async function updateProject(
  actor: CurrentUser,
  id: string,
  input: UpdateProjectInput,
  options?: ProjectServiceOptions
): Promise<Project> {
  if (!id || typeof id !== "string") {
    throw new ProjectValidationError("Invalid project id");
  }

  const project = await dbGetProjectById(id);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  assertCanManageProject(actor, project);

  const projectStorage = getProjectStorage(project.slug);
  let newScreenshotUrl: string | undefined = undefined;

  // If HTML code is provided and it's single_html, update storage and re-capture screenshot
  if (input.htmlCode && project.assetType === "single_html") {
    await projectStorage.writeEntryFile(input.htmlCode, project.entryPath);

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
      const targetVisibility = input.visibility !== undefined ? input.visibility : project.visibility;
      const publicUrl = targetVisibility === "public" ? `${siteUrl}/raw/${project.slug}` : undefined;
      const imgBuffer = await renderProjectScreenshot(input.htmlCode, publicUrl);
      if (imgBuffer) {
        await projectStorage.writeAsset("screenshot.png", imgBuffer, "image/png");
        newScreenshotUrl = `/raw/${project.slug}/screenshot.png?v=${Date.now()}`;
      }
    } catch (screenshotErr) {
      console.warn(`[ProjectService] Re-capture screenshot skipped for ${project.slug}:`, screenshotErr);
    }
  }

  const patch: Partial<Project> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.language !== undefined) patch.language = input.language;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.isPinned !== undefined) {
    patch.isPinned = input.isPinned;
    patch.pinnedAt = input.isPinned ? new Date() : null;
  }
  if (input.isGlobalPinned !== undefined) {
    if (actor.role !== "admin" && actor.id !== "selfhost-admin") {
      throw new ProjectForbiddenError("Forbidden: Only administrators can toggle global showcase pin");
    }
    patch.isGlobalPinned = input.isGlobalPinned;
    patch.globalPinnedAt = input.isGlobalPinned ? new Date() : null;
  }
  if (newScreenshotUrl) patch.screenshotUrl = newScreenshotUrl;

  const updated = await dbUpdateProject(id, patch);
  const result = updated || project;

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }

  return result;
}

/**
 * Deletes a project, purges physical assets in scoped storage, and deletes DB record.
 */
export async function deleteProject(
  actor: CurrentUser,
  id: string,
  options?: ProjectServiceOptions
): Promise<void> {
  if (!id || typeof id !== "string") {
    throw new ProjectValidationError("Invalid project id");
  }

  const project = await dbGetProjectById(id);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  assertCanManageProject(actor, project);

  const projectStorage = getProjectStorage(project.slug);
  try {
    await projectStorage.deleteProjectFiles();
  } catch (err) {
    console.error(`[ProjectService] Failed to clean up storage for ${project.slug}:`, err);
  }

  await dbDeleteProject(id);

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }
}

/**
 * Toggles a project's workspace pinned status with proper authorization.
 */
export async function togglePin(
  actor: CurrentUser,
  id: string,
  options?: ProjectServiceOptions
): Promise<Project> {
  const project = await dbGetProjectById(id);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  assertCanManageProject(actor, project);

  const nextPinned = !project.isPinned;
  const updated = await dbUpdateProject(id, {
    isPinned: nextPinned,
    pinnedAt: nextPinned ? new Date() : null,
  });
  const result = updated || project;

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }

  return result;
}

/**
 * Toggles a project's global showcase pinned status (Admin only).
 */
export async function toggleGlobalPin(
  actor: CurrentUser,
  id: string,
  options?: ProjectServiceOptions
): Promise<Project> {
  if (actor.role !== "admin" && actor.id !== "selfhost-admin") {
    throw new ProjectForbiddenError("Forbidden: Only administrators can toggle global showcase pin");
  }

  const project = await dbGetProjectById(id);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  const nextGlobalPinned = !project.isGlobalPinned;
  const updated = await dbUpdateProject(id, {
    isGlobalPinned: nextGlobalPinned,
    globalPinnedAt: nextGlobalPinned ? new Date() : null,
  });
  const result = updated || project;

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }

  return result;
}

/**
 * Updates a project's visibility tier with proper authorization.
 */
export async function updateVisibility(
  actor: CurrentUser,
  id: string,
  visibility: ProjectVisibility,
  options?: ProjectServiceOptions
): Promise<Project> {
  const project = await dbGetProjectById(id);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  assertCanManageProject(actor, project);

  const updated = await dbUpdateProject(id, { visibility });
  const result = updated || project;

  if (!options?.skipRevalidate) {
    revalidateProjectPaths(project.slug);
  }

  return result;
}

/**
 * Reads project source HTML with strict creator privacy enforcement for private resources.
 */
export async function getProjectSource(
  idOrSlug: string,
  actor?: CurrentUser | null
): Promise<{ project: Project; html: string }> {
  let project = await dbGetProjectById(idOrSlug);
  if (!project) {
    project = await dbGetProjectBySlug(idOrSlug);
  }
  if (!project) {
    throw new ProjectNotFoundError();
  }

  if (project.visibility === "private") {
    const isExactCreator = Boolean(
      actor &&
        (project.userId
          ? actor.id === project.userId
          : actor.id === "selfhost-admin")
    );
    if (!isExactCreator) {
      throw new ProjectForbiddenError("403 Forbidden: Private Resource. Only the project owner can access this content.");
    }
  }

  const projectStorage = getProjectStorage(project.slug);
  const file = await projectStorage.readFile(project.entryPath);
  if (!file) {
    throw new ProjectNotFoundError(`Entry HTML not found: ${project.entryPath}`);
  }

  const html = Buffer.isBuffer(file.data)
    ? file.data.toString("utf-8")
    : String(file.data);

  return { project, html };
}

// --- Backward Compatibility Wrappers ---

/**
 * @deprecated Use createProject(actor, input) instead
 */
export async function processAndCreateProject(input: CreateProjectInput): Promise<Project> {
  const actor: CurrentUser = {
    id: input.userId || "selfhost-admin",
    role: input.userId ? "user" : "admin",
  };
  return createProject(actor, input);
}

/**
 * @deprecated Use updateProject(actor, id, { htmlCode: newHtml }) instead
 */
export async function updateProjectHtml(
  id: string,
  newHtml: string,
  expectedUser?: { id: string; role?: string }
): Promise<Project> {
  const actor: CurrentUser = expectedUser
    ? { id: expectedUser.id, role: expectedUser.role === "admin" ? "admin" : "user" }
    : { id: "selfhost-admin", role: "admin" };
  return updateProject(actor, id, { htmlCode: newHtml });
}
