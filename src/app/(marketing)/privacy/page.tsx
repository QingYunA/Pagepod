import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import PrivacyClient from "./privacy-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Privacy Policy - Pagepod",
  description:
    "Privacy Policy for Pagepod. Learn how we handle your authentication, data storage, project access control, and privacy rights.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Pagepod",
    description: "Learn how Pagepod handles your account, project data, and storage.",
    url: `${siteUrl}/privacy`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function PrivacyPage() {
  return <PrivacyClient />;
}
