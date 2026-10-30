import type { Metadata } from "next";
import { getAllProjects } from "@/db";
import ShowcaseGallery from "@/components/showcase-gallery";
import { HeroSection } from "@/components/hero-section";
import { FaqSection } from "@/components/faq-section";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { translations } from "@/lib/i18n/translations";
import { toPublicProjectCard } from "@/lib/public-project";

const siteUrl = getSiteUrl();
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Pagepod",
      url: siteUrl,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "All",
      description:
        "Free zero-config HTML hosting. Upload HTML files to get a secure shareable link in 3 seconds. Run and share web apps safely in a hardened sandbox.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      name: "Pagepod",
      url: siteUrl,
      logo: `${siteUrl}/brand/pagepod-logo-monochrome.png`,
      sameAs: ["https://github.com/QingYunA/Pagepod"],
    },
    {
      "@type": "WebSite",
      name: "Pagepod",
      url: siteUrl,
    },
    {
      "@type": "FAQPage",
      mainEntity: [1, 2, 3, 4].map((index) => ({
        "@type": "Question",
        name: translations.en.faq[`q${index}` as "q1" | "q2" | "q3" | "q4"],
        acceptedAnswer: {
          "@type": "Answer",
          text: translations.en.faq[`a${index}` as "a1" | "a2" | "a3" | "a4"],
        },
      })),
    },
  ],
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      {/* Hero Header with multi-language text */}
      <HeroSection />

      {/* Main Showcase Gallery */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        <ShowcaseGallery initialProjects={projects.map(toPublicProjectCard)} />
      </main>

      {/* Frequently Asked Questions & SEO Intent Section */}
      <FaqSection />
    </>
  );
}

