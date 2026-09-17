import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PricingClient from "./pricing-client";
import { isSelfHosted } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Pricing & Lifetime Deals - Free HTML Hosting & Pro Cloud",
  description:
    "Explore transparent lifetime pricing for Pagepod. Free tier for hosting HTML projects, Lite Lifetime for 10GB storage, and Pro Lifetime with 50GB storage, white-label, and custom subdomains.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing & Lifetime Plans | Pagepod",
    description:
      "Simple, transparent lifetime pricing for developers and creators. Free hosting with private protection, Lite & Pro lifetime deals with generous storage and custom subdomains.",
    url: `${siteUrl}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing & Lifetime Plans | Pagepod",
    description:
      "Simple, transparent lifetime pricing for developers and creators. Free hosting with private protection, Lite & Pro lifetime deals with generous storage and custom subdomains.",
  },
};

export const revalidate = 3600;

export default function PricingPage() {
  if (isSelfHosted()) {
    redirect("/workspace");
  }
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does Lifetime Deal mean? Will I ever be charged again?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pay once, own forever! When you purchase Lite or Pro Lifetime, you lock in your storage quota and feature perks permanently with zero recurring monthly or annual fees.",
        },
      },
      {
        "@type": "Question",
        name: "How does private project protection work for Free users?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Privacy is a core standard for all users. When you mark a project as Private, our backend strictly enforces account-level access control. Unauthenticated visitors are blocked with 403 Forbidden.",
        },
      },
      {
        "@type": "Question",
        name: "How does the Pro Custom Subdomain feature work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every project has a unique slug. Pro users can share clean URLs like https://your-project.pagepod.dev. Our edge proxy routes directly to your project with the subdomain intact in the browser address bar.",
        },
      },
      {
        "@type": "Question",
        name: "How does Pagepod differ from traditional Vercel or GitHub Pages?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pagepod is purpose-built for HTML files, tools, and web applications. No git repositories or npm install required. Drag, drop or paste code for instant sandboxed execution with live gallery discovery.",
        },
      },
      {
        "@type": "Question",
        name: "What file formats and upload sizes are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pasted HTML code, .html files, and .zip archives containing CSS, JS, and image assets up to 50MB per upload. Relative references are automatically resolved.",
        },
      },
    ],
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Suspense fallback={null}>
        <PricingClient />
      </Suspense>
    </main>
  );
}
