import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { TopLoader } from "@/components/top-loader";
import { GuestClaimReconciler } from "@/components/guest-claim-reconciler";
import { Analytics } from "@vercel/analytics/next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pagepod - Host HTML Files Free | Upload HTML & Get Link",
    template: "%s | Pagepod",
  },
  description:
    "Free zero-config HTML hosting. Upload HTML files to get a secure shareable link in 3 seconds. Run and share web apps safely in a hardened sandbox.",
  keywords: [
    "host html file free",
    "upload html get link",
    "share html online",
    "free html hosting",
    "HTML sandbox",
    "Pagepod",
  ],
  authors: [{ name: "Pagepod Team" }],
  creator: "Pagepod",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "zh-CN": "/",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/pagepod-logo-monochrome.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    url: siteUrl,
    siteName: "Pagepod",
    title: "Pagepod - Host HTML Files Free | Upload HTML & Get Link",
    description:
      "Free zero-config HTML hosting. Upload HTML files to get a secure shareable link in 3 seconds. Run and share web apps safely in a hardened sandbox.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pagepod - Host HTML Files Free | Upload HTML & Get Link",
    description:
      "Free zero-config HTML hosting. Upload HTML files to get a secure shareable link in 3 seconds. Run and share web apps safely in a hardened sandbox.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const rootJsonLd = {
  "@context": "https://schema.org",
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
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I host and share an HTML file for free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Simply drag and drop your single .html file or zip bundle into Pagepod. No registration or server configuration is required. You will receive an instant, sandboxed shareable link in 3 seconds.",
      },
    },
    {
      "@type": "Question",
      name: "Can I get a shareable link without server setup or registration?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Pagepod provides an instant zero-config guest ingestion pipeline. You get a live link immediately. If you sign up later, you can seamlessly claim your uploaded projects into your personal workspace.",
      },
    },
    {
      "@type": "Question",
      name: "Is running untrusted HTML and JavaScript files safe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All hosted files run in an isolated /raw/[slug]/ runner under strict Content Security Policy (CSP) headers without allow-same-origin, preventing untrusted scripts from accessing host cookies, storage, or admin sessions.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Public and Unlisted visibility?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Public projects are indexed in the showcase feed and topic collections for discovery. Unlisted projects require a secret access token in the URL, preventing search engine indexing and gallery visibility.",
      },
    },
  ],
};

const umamiScriptUrl =
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
  "https://umami.daydayup.lat/script.js";
const umamiWebsiteId =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ||
  "c7ee55df-938f-4800-b6cb-18622970fe64";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased overflow-x-hidden w-full max-w-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        {/* Instant synchronous script to sync html lang and locale before body renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)html_manager_locale=([^;]+)/);var l=c?decodeURIComponent(c[1]):((navigator.language||'').toLowerCase().indexOf('zh')===0?'zh':'en');document.documentElement.lang=l==='zh'?'zh-CN':'en';window.__INITIAL_LOCALE__=l;}catch(e){}})()`,
          }}
        />
        {umamiWebsiteId && (
          <script
            defer
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans overflow-x-hidden w-full max-w-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopLoader />
          <LanguageProvider>
            {children}
            <GuestClaimReconciler />
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
