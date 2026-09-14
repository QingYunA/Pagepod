"use server";

import { getCurrentUser } from "@/lib/auth";
import { getFolders } from "@/db";
import {
  togglePin,
  toggleGlobalPin,
  updateVisibility,
  deleteProject,
  updateProject,
  createFolder,
  updateFolder,
  deleteFolder,
  batchMoveProjects,
  batchUpdateVisibility,
  batchDeleteProjects,
  ProjectForbiddenError,
} from "@/lib/services/project-service";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ProjectForbiddenError("Unauthorized: Authentication required");
  }
  return user;
}

export async function getUserFoldersAction() {
  const user = await requireUser();
  return await getFolders(user.id);
}

export async function togglePinAction(id: string, _currentPinned?: boolean) {
  const user = await requireUser();
  await togglePin(user, id);
}

export async function toggleGlobalPinAction(id: string, _currentPinned?: boolean) {
  const user = await requireUser();
  await toggleGlobalPin(user, id);
}

export async function updateVisibilityAction(id: string, visibility: "public" | "private") {
  const user = await requireUser();
  await updateVisibility(user, id, visibility);
}

export async function deleteProjectAction(id: string) {
  const user = await requireUser();
  await deleteProject(user, id);
}

export async function saveProjectHtmlAction(id: string, newHtml: string) {
  const user = await requireUser();
  await updateProject(user, id, { htmlCode: newHtml });
}

export async function createFolderAction(name: string, parentId?: string | null) {
  const user = await requireUser();
  return await createFolder(user, name, parentId);
}

export async function updateFolderAction(
  id: string,
  data: { name?: string; parentId?: string | null }
) {
  const user = await requireUser();
  return await updateFolder(user, id, data);
}

export async function deleteFolderAction(id: string) {
  const user = await requireUser();
  return await deleteFolder(user, id);
}

export async function batchMoveProjectsAction(projectIds: string[], folderId: string | null) {
  const user = await requireUser();
  return await batchMoveProjects(user, projectIds, folderId);
}

export async function batchUpdateVisibilityAction(
  projectIds: string[],
  visibility: "public" | "private"
) {
  const user = await requireUser();
  return await batchUpdateVisibility(user, projectIds, visibility);
}

export async function batchDeleteProjectsAction(projectIds: string[]) {
  const user = await requireUser();
  return await batchDeleteProjects(user, projectIds);
}

