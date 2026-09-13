"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  updateProject as updateProjectDomain,
  ProjectForbiddenError,
} from "@/lib/services/project-service";
import { updateProjectInputSchema } from "@/lib/validation";

export async function updateProjectFullAction(
  id: string,
  data: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    visibility: "public" | "private";
    isPinned: boolean;
    htmlCode?: string;
  }
) {
  if (typeof id !== "string" || !id) {
    throw new Error("Invalid project id");
  }

  const parsed = updateProjectInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid project data");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new ProjectForbiddenError("Unauthorized: Please log in to edit this project");
  }

  const updated = await updateProjectDomain(user, id, parsed.data);
  return { success: true, project: updated };
}
