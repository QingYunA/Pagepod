export interface SeoUseCase {
  title: string;
  description: string;
}

export interface SeoShortcut {
  key: string;
  action: string;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoAuthor {
  name: string;
  url?: string;
}

export interface ProjectSeoProfile {
  slug: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  headline: string;
  summary: string;
  detailedDescription?: string;
  category: string;
  language: "zh" | "en";
  useCases: SeoUseCase[];
  shortcuts?: SeoShortcut[];
  faqs: SeoFaqItem[];
  author?: SeoAuthor;
  license?: string;
  upstreamUrl?: string;
}
