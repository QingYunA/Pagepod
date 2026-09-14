import { getAllProjects } from "@/db";
import ShowcaseGallery from "@/components/showcase-gallery";
import { HeroSection } from "@/components/hero-section";
import { getCurrentUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/server";
import { isSelfHosted } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function HomePage() {
  const isPrivate = process.env.PRIVATE_INSTANCE === "true";
  const [user, serverLocale] = await Promise.all([
    getCurrentUser(),
    getServerLocale(),
  ]);

  if (isPrivate && !user) {
    redirect("/login");
  }

  // Seamless jump to workspace for logged-in admin in self-hosted mode
  if (isSelfHosted() && user && (user.id === "selfhost-admin" || user.role === "admin")) {
    redirect("/workspace");
  }

  const projects = await getAllProjects({ includePrivate: false });

  return (
    <>
      {/* Hero Header with multi-language text */}
      <HeroSection initialLocale={serverLocale} />

      {/* Main Showcase Gallery */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        <ShowcaseGallery initialProjects={projects} />
      </main>
    </>
  );
}
