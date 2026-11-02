import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { generateProjectMetadata, renderProjectPage } from "../project-page";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const metadata = await generateProjectMetadata({ params });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: `${getSiteUrl()}/p/${slug}`,
    },
    robots: { index: false, follow: false },
  };
}

export default async function LiveProjectRunnerPage({ params, searchParams }: PageProps) {
  const [{ slug }, { token }, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

  return renderProjectPage({ slug, token, currentUser });
}
