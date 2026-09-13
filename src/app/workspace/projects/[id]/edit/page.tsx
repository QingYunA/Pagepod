import { notFound } from "next/navigation";
import { getCurrentUser, canManageProject } from "@/lib/auth";
import { getProjectSource } from "@/lib/services/project-service";
import ProjectEditorClient from "./editor-client";

interface EditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({ params }: EditPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  try {
    const { project, html } = await getProjectSource(id, currentUser);
    if (!canManageProject(currentUser, project)) {
      notFound();
    }
    return (
      <ProjectEditorClient
        project={project}
        initialCode={project.assetType === "single_html" ? html : ""}
        isAdmin={currentUser?.role === "admin" || currentUser?.id === "selfhost-admin"}
      />
    );
  } catch {
    notFound();
  }
}
