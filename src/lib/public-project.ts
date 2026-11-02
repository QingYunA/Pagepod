import type { Project } from "@/db/schema";

export type PublicProjectCard = Pick<
  Project,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "language"
  | "isGlobalPinned"
  | "globalPinnedAt"
  | "createdAt"
  | "viewCount"
  | "fileSize"
  | "screenshotUrl"
  | "assetType"
>;

export type PublicRunnerProject = Pick<
  Project,
  | "slug"
  | "title"
  | "description"
  | "category"
  | "language"
  | "viewCount"
  | "visibility"
  | "isWhiteLabel"
  | "entryPath"
>;

export function toPublicProjectCard(project: Project): PublicProjectCard {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    category: project.category,
    tags: project.tags,
    language: project.language,
    isGlobalPinned: project.isGlobalPinned,
    globalPinnedAt: project.globalPinnedAt,
    createdAt: project.createdAt,
    viewCount: project.viewCount,
    fileSize: project.fileSize,
    screenshotUrl: project.screenshotUrl,
    assetType: project.assetType,
  };
}

export function toPublicRunnerProject(project: Project): PublicRunnerProject {
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    category: project.category,
    language: project.language,
    viewCount: project.viewCount,
    visibility: project.visibility,
    isWhiteLabel: project.isWhiteLabel,
    entryPath: project.entryPath,
  };
}
