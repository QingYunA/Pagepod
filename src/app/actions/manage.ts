"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  togglePin,
  updateVisibility,
  deleteProject,
  updateProject,
  ProjectForbiddenError,
} from "@/lib/services/project-service";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ProjectForbiddenError("Unauthorized: Authentication required");
  }
  return user;
}

export async function togglePinAction(id: string, _currentPinned?: boolean) {
  const user = await requireUser();
  await togglePin(user, id);
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
