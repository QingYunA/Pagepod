import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import PrivacyClient from "./privacy-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Privacy Policy - Pagepod",
  description:
    "Privacy Policy for Pagepod. Learn how we handle your authentication, data storage, client-side encryption, and privacy rights.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Pagepod",
    description: "Learn how Pagepod protects your data with end-to-end zero-knowledge encryption.",
    url: `${siteUrl}/privacy`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function PrivacyPage() {
  return <PrivacyClient />;
}
