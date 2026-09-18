import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import TermsClient from "./terms-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Terms of Service - Pagepod",
  description:
    "Terms of Service for using the Pagepod hosting platform, acceptable use policies, content ownership, and liability disclaimers.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Pagepod",
    description: "Acceptable use policy and platform rules for Pagepod.",
    url: `${siteUrl}/terms`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function TermsPage() {
  return <TermsClient />;
}
