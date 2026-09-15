import { getAllProjects } from "@/db";
import ShowcaseGallery from "@/components/showcase-gallery";
import { HeroSection } from "@/components/hero-section";
import { FaqSection } from "@/components/faq-section";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function HomePage() {
  const isPrivate = process.env.PRIVATE_INSTANCE === "true";
  if (isPrivate) {
    const user = await getCurrentUser();
    if (!user) {
      redirect("/login");
    }
  }

  const projects = await getAllProjects({ includePrivate: false });

  return (
    <>
      {/* Hero Header with multi-language text */}
      <HeroSection />

      {/* Main Showcase Gallery */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        <ShowcaseGallery initialProjects={projects} />
      </main>

      {/* Frequently Asked Questions & SEO Intent Section */}
      <FaqSection />
    </>
  );
}

