import { notFound } from "next/navigation";
import { getProjectBySlugCached } from "@/lib/db-cache";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { slug } = await params;
  const project = await getProjectBySlugCached(slug);

  if (!project) {
    notFound();
  }

  return children;
}
