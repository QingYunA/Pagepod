import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

// Override the root layout's `index, follow`, which would otherwise contradict the `noindex` Next.js injects for 404s.
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return <NotFoundContent />;
}
