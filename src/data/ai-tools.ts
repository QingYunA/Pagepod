// Keyword landing pages for trending third-party AI tools, rendered at /ai-tools/[slug].
// Each page explains the tool, then shows how to share its outputs with Pagepod.
// Facts must be checked against the official site; record the date in `lastVerified`.

export interface AiToolPage {
  slug: string;
  name: string;
  /** <title> without the "| Pagepod" suffix, max 60 chars. */
  title: string;
  /** Meta description, 70-160 chars. */
  description: string;
  keywords: string[];
  officialUrl: string;
  /** ISO date when the facts below were last checked against the official site. */
  lastVerified: string;
  summary: string;
  features: { title: string; description: string }[];
  pricing: string;
  howToUse: string[];
  alternatives: { name: string; note: string }[];
  pagepodUseCase: { title: string; intro: string; steps: string[] };
  faqs: { question: string; answer: string }[];
}

export const AI_TOOL_PAGES: Record<string, AiToolPage> = {
  vidogrid: {
    slug: "vidogrid",
    name: "VidoGrid",
    title: "VidoGrid: Features, Pricing, Free Credits & Alternatives",
    description:
      "What VidoGrid is, which AI video and image models it offers, how its credits work, free alternatives, and how to share your VidoGrid videos as a web page.",
    keywords: [
      "VidoGrid",
      "VidoGrid AI",
      "VidoGrid pricing",
      "VidoGrid free",
      "VidoGrid alternatives",
      "AI video generator",
      "share AI video online",
    ],
    officialUrl: "https://vidogrid.ai",
    lastVerified: "2026-10-30",
    summary:
      "VidoGrid is a browser-based AI studio that puts several third-party generation models behind one account. It describes itself as a place to generate cinematic video, images, voice and music, and lets you switch between models such as Veo, Kling, Grok, Seedance and Imagen without signing up for each provider separately.",
    features: [
      {
        title: "Text and image to video",
        description:
          "Generate clips from a prompt or a reference image. Models listed on the site include Google Veo (2, 3 and 3.1, with Fast and Lite variants), Kling, Grok Imagine Video, Seedance and Sora 2. Model availability can change as providers update their APIs.",
      },
      {
        title: "AI image generation",
        description: "Create still images with models such as Imagen, Nano Banana, Grok Imagine and Flux from the same workspace.",
      },
      {
        title: "Voice and music",
        description: "Add text-to-speech voice-over and AI music, so a short video can be finished without leaving the studio.",
      },
      {
        title: "Video editing tools",
        description: "Kling-based options cover lip-sync, motion control and editing of existing clips, alongside extending Grok videos.",
      },
    ],
    pricing:
      "VidoGrid uses a credit system. New accounts get starting credits to try a limited set of models, then you can buy credit packs or model-specific passes (for example Veo or Grok plans with daily quotas). Prices and quotas change often, so check the official pricing page before buying.",
    howToUse: [
      "Create an account on vidogrid.ai and check your starting credits.",
      "Pick a mode (video, image, voice or music) and choose a model.",
      "Write a prompt or upload a reference image, then set duration, aspect ratio and resolution.",
      "Generate, review the result, and download the files you want to keep.",
    ],
    alternatives: [
      {
        name: "Google Flow",
        note: "Google's own filmmaking tool built on Veo. A direct option if you mainly use Veo models.",
      },
      {
        name: "Kling AI",
        note: "The official Kling app from Kuaishou, with its own credits and the newest Kling releases first.",
      },
      {
        name: "Runway",
        note: "A video generation and editing suite aimed at creators who need more manual editing control.",
      },
    ],
    pagepodUseCase: {
      title: "Share your VidoGrid creations as a web page",
      intro:
        "Downloaded MP4 files are hard to present: chat apps compress them and cloud drives ask viewers to download. A single HTML page with your clips, prompts and notes is easier to share, and Pagepod hosts it at a public link for free.",
      steps: [
        "Download your best clips and images from VidoGrid.",
        "Ask an AI assistant to build a one-page HTML gallery that embeds the clips, with the prompt and model under each one.",
        "Upload the HTML file to Pagepod. A single page up to 2 MB needs no sign-up; to bundle the video files themselves, sign in and upload a ZIP of up to 50 MB.",
        "Copy the link and share it with clients, teammates or your audience.",
      ],
    },
    faqs: [
      {
        question: "Is VidoGrid free?",
        answer:
          "VidoGrid gives new accounts starting credits to try a limited set of models. Longer clips, higher resolutions and premium models need paid credits or a plan.",
      },
      {
        question: "Which AI models does VidoGrid support?",
        answer:
          "The site lists Google Veo, Kling, Grok Imagine, Seedance, Sora 2, Imagen, Nano Banana and Flux, among others. Providers change their offers often, so check the model picker inside VidoGrid for what is available today.",
      },
      {
        question: "Is VidoGrid an official Google or OpenAI product?",
        answer:
          "No. VidoGrid is an independent studio that gives access to third-party models. Google and OpenAI offer their models through their own products and APIs.",
      },
      {
        question: "How can I share a VidoGrid video without sending a large file?",
        answer:
          "Put the clip in a simple HTML page and upload it to Pagepod. Viewers open the link in a browser and the video plays inline, with no download or account required.",
      },
    ],
  },
};
