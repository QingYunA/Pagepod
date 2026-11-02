import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { TopLoader } from "@/components/top-loader";
import { GuestClaimReconciler } from "@/components/guest-claim-reconciler";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pagepod - Free HTML Hosting: Preview & Share HTML Online",
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
    url: siteUrl,
    siteName: "Pagepod",
    title: "Pagepod - Free HTML Hosting: Preview & Share HTML Online",
    description:
      "Free zero-config HTML hosting. Upload HTML files to get a secure shareable link in 3 seconds. Run and share web apps safely in a hardened sandbox.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pagepod - Free HTML Hosting: Preview & Share HTML Online",
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
            data-performance="true"
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
