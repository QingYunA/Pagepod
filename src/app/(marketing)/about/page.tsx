import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import AboutClient from "./about-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: { absolute: "About Pagepod: Host & Share HTML Files Instantly" },
  description:
    "Pagepod turns any HTML file into a shareable link in seconds. No signup, sandboxed runner, open source and self-hostable.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Pagepod: Host & Share HTML Files Instantly",
    description:
      "Pagepod turns any HTML file into a shareable link in seconds. No signup, sandboxed runner, open source and self-hostable.",
    url: `${siteUrl}/about`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function AboutPage() {
  return <AboutClient />;
}
