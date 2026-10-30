import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { AI_TOOL_PAGES } from "@/data/ai-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ExternalLink, Upload } from "lucide-react";

interface AiToolPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(AI_TOOL_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: AiToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = AI_TOOL_PAGES[slug];

  if (!tool) {
    return {
      title: "Page Not Found",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = getSiteUrl();

  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: {
      canonical: `/ai-tools/${slug}`,
    },
    openGraph: {
      title: `${tool.title} | Pagepod`,
      description: tool.description,
      url: `${siteUrl}/ai-tools/${slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.title} | Pagepod`,
      description: tool.description,
    },
  };
}

const sectionTitle = "text-lg sm:text-xl font-semibold tracking-tight text-foreground mb-4";

export default async function AiToolDetailPage({ params }: AiToolPageProps) {
  const { slug } = await params;
  const tool = AI_TOOL_PAGES[slug];

  if (!tool) {
    notFound();
  }

  const siteUrl = getSiteUrl();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: tool.name, item: `${siteUrl}/ai-tools/${slug}` },
    ],
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-14 w-full">
      {/* No page-level FAQPage: the root layout already emits one site-wide, and two would be flagged as duplicates. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-foreground font-medium">{tool.name}</span>
      </nav>

      <header className="pb-8 mb-10 border-b border-border space-y-3">
        <Badge variant="outline" className="font-normal">
          AI Tool Guide
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{tool.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{tool.description}</p>
      </header>

      <section className="mb-12">
        <h2 className={sectionTitle}>What is {tool.name}?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-4">{tool.summary}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <a
            href={tool.officialUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            Official site
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          <span>Last verified {tool.lastVerified}</span>
        </div>
      </section>

      <section className="mb-12">
        <h2 className={sectionTitle}>Key features</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {tool.features.map((feature) => (
            <Card key={feature.title} className="shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className={sectionTitle}>{tool.name} pricing</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{tool.pricing}</p>
      </section>

      <section className="mb-12">
        <h2 className={sectionTitle}>How to use {tool.name}</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {tool.howToUse.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mb-12 p-5 sm:p-6 rounded-xl border border-border bg-muted/20">
        <h2 className={sectionTitle}>{tool.pagepodUseCase.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-4">{tool.pagepodUseCase.intro}</p>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground mb-6">
          {tool.pagepodUseCase.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="h-9 text-sm font-medium">
            <Link href="/">
              <Upload className="w-4 h-4 mr-1.5" />
              Upload your HTML page
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-9 text-sm font-medium">
            <Link href="/explore/creative">See creative examples</Link>
          </Button>
        </div>
      </section>

      <section className="mb-12">
        <h2 className={sectionTitle}>{tool.name} alternatives</h2>
        <ul className="divide-y divide-border border-y border-border">
          {tool.alternatives.map((alt) => (
            <li key={alt.name} className="py-3 text-sm">
              <span className="font-medium text-foreground">{alt.name}</span>
              <span className="text-muted-foreground"> — {alt.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={sectionTitle}>FAQ</h2>
        <div className="space-y-5">
          {tool.faqs.map((faq) => (
            <div key={faq.question} className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">{faq.question}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
