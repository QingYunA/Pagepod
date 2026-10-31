import type { Metadata } from "next";
import { generateProjectMetadata, renderProjectPage } from "./project-page";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateProjectMetadata(props);
}

export default async function ProjectRunnerPage({ params }: PageProps) {
  const { slug } = await params;
  return renderProjectPage({ slug, token: undefined, currentUser: null });
}
