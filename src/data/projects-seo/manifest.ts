import { CATEGORIES_ENUM, type Category } from "@/lib/validation";
import type { ProjectSeoProfile } from "./types";
import { GAMES_SEO } from "./entries/games";
import { TOOLS_SEO } from "./entries/tools";
import { VISUALIZATION_SEO } from "./entries/visualization";

/**
 * Unified catalog of programmatic SEO profiles for Pagepod open-source assets.
 * 45 authentic open-source projects (Games, Developer Tools, Visualizations & Prototypes)
 * with dedicated high-intent target keywords, key capabilities, FAQs, and upstream provenance.
 */
export const PROJECT_SEO_MANIFEST: Record<string, ProjectSeoProfile> = {
  ...GAMES_SEO,
  ...TOOLS_SEO,
  ...VISUALIZATION_SEO,
};

/**
 * Safe fallback generator for user-uploaded or unmanifested projects
 */
export function getProjectSeoProfile(
  slug: string,
  fallbackProject?: {
    title?: string | null;
    description?: string | null;
    category?: string | null;
    language?: string | null;
  }
): ProjectSeoProfile {
  const profile = PROJECT_SEO_MANIFEST[slug];
  if (profile) {
    return profile;
  }

  const title = fallbackProject?.title || slug;
  const rawCategory = fallbackProject?.category;
  const category: Category =
    rawCategory && (CATEGORIES_ENUM as readonly string[]).includes(rawCategory)
      ? (rawCategory as Category)
      : "tools";
  const isZh = fallbackProject?.language === "zh";

  return {
    slug,
    targetKeyword: `${title} online`,
    secondaryKeywords: [
      `${title} web app`,
      `${title} interactive runner`,
      `${category} online`,
    ],
    headline: `${title} - Interactive ${category.toUpperCase()} on Pagepod`,
    summary:
      fallbackProject?.description ||
      (isZh
        ? `在 Pagepod 在线安全运行 ${title}。无需安装，即开即用，纯本地沙箱保护数据安全。`
        : `Run and preview ${title} online on Pagepod. Zero installation required, fully sandboxed in your browser.`),
    category,
    language: isZh ? "zh" : "en",
    useCases: isZh
      ? [
          {
            title: "即开即用零安装",
            description: "纯前端单文件应用，打开网页即可开始使用，无需注册账号或下载安装包。",
          },
          {
            title: "独立沙箱安全隔离",
            description: "运行于严格 CSP 保护的独立沙箱环境中，隔绝恶意脚本，全方位保障数据隐私。",
          },
          {
            title: "多端自适应运行台",
            description: "支持桌面、平板、手机等多种视口分辨率实时缩放与全屏独立运行。",
          },
        ]
      : [
          {
            title: "Instant Zero-Install Access",
            description: "Pure web application ready to run instantly in your browser without cumbersome installation or signup.",
          },
          {
            title: "Hardened Sandbox Isolation",
            description: "Executes inside an isolated iframe with strict CSP headers, protecting your system and privacy.",
          },
          {
            title: "Multi-Viewport Testbed",
            description: "Simulate and experience the application across desktop, tablet, and mobile displays with responsive precision.",
          },
        ],
    faqs: isZh
      ? [
          {
            question: "这个应用安全吗？",
            answer: "非常安全。Pagepod 采用严格的内容安全策略（CSP）与沙箱隔离技术，应用无法读取宿主环境的凭据与私密数据。",
          },
          {
            question: "如何将这个项目嵌入到我自己的网站中？",
            answer: "点击顶部的「嵌入」按钮，即可复制带有安全隔离属性的 iframe 代码，轻松嵌入到任何博客或网站。",
          },
        ]
      : [
          {
            question: "Is this application safe to run?",
            answer: "Yes. Pagepod executes all hosted projects within a strict sandbox container with hardened CSP headers, preventing unauthorized access.",
          },
          {
            question: "Can I embed this tool into my own blog or website?",
            answer: "Yes. Click the Embed button in the toolbar above to copy the ready-to-use iframe snippet.",
          },
        ],
    license: "Open Source / Community",
  };
}
