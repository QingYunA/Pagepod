import { NextResponse } from "next/server";
import { getCurrentUser, assertCanManageProject } from "@/lib/auth";
import { getProjectById, getProjectBySlug } from "@/db";
import { deleteProject, updateProject } from "@/lib/services/project-service";
import { updateProjectInputSchema } from "@/lib/validation";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const project = (await getProjectById(id)) || (await getProjectBySlug(id));
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      title: project.title,
      slug: project.slug,
      category: project.category,
      tags: project.tags,
      visibility: project.visibility,
      screenshotUrl: project.screenshotUrl,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid authentication token" },
      { status: 401 }
    );
  }

  const project = (await getProjectById(id)) || (await getProjectBySlug(id));
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  try {
    assertCanManageProject(user, project);
  } catch {
    return NextResponse.json(
      { success: false, error: "Forbidden: You do not have permission to delete this project" },
      { status: 403 }
    );
  }

  try {
    await deleteProject(user, project.id);
    return NextResponse.json({ success: true, message: `Project ${project.slug} deleted successfully` });
  } catch (err) {
    console.error("[DeleteProjectAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error deleting project" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid authentication token" },
      { status: 401 }
    );
  }

  const project = (await getProjectById(id)) || (await getProjectBySlug(id));
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  try {
    assertCanManageProject(user, project);
  } catch {
    return NextResponse.json(
      { success: false, error: "Forbidden: You do not have permission to update this project" },
      { status: 403 }
    );
  }

  try {
    const rawJson = await request.json();
    const parseResult = updateProjectInputSchema.safeParse(rawJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const updated = await updateProject(user, project.id, parseResult.data);
    return NextResponse.json({
      success: true,
      project: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        category: updated.category,
        tags: updated.tags,
        visibility: updated.visibility,
        screenshotUrl: updated.screenshotUrl,
      },
    });
  } catch (err) {
    console.error("[UpdateProjectAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error updating project" },
      { status: 500 }
    );
  }
}
