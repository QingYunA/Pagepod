import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import AboutClient from "./about-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "About Pagepod - Mission & Architecture",
  description:
    "Learn about Pagepod, an open-source, self-hostable showcase and hosting platform tailored for HTML web applications, interactive tools, and games.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Pagepod | Mission & Architecture",
    description:
      "Instant hosting platform tailored for HTML web applications, tools, and prototypes.",
    url: `${siteUrl}/about`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function AboutPage() {
  return <AboutClient />;
}
