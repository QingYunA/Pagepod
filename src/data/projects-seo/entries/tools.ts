import type { ProjectSeoProfile } from "../types";

export const TOOLS_SEO: Record<string, ProjectSeoProfile> = {
  // 1. KaTeX Math Studio
  "katex-math-studio": {
    slug: "katex-math-studio",
    targetKeyword: "katex live math editor",
    secondaryKeywords: ["latex equation previewer", "math formula renderer web", "fast katex studio"],
    headline: "KaTeX Live Mathematical Typography Studio",
    summary: "High-speed real-time LaTeX math formula editor and renderer powered by KaTeX. Type complex equations and get instantaneous typography previews with zero server latency.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Academic & Scientific Writing",
        description: "Draft, test, and verify complex mathematical formulations before embedding them into papers, slides, or Markdown.",
      },
      {
        title: "Instant Formula Rendering",
        description: "Zero wait time. KaTeX renders without reflow delays, outperforming MathJax by up to 100x in speed.",
      },
      {
        title: "Snippet & Symbol Palette",
        description: "Quick-insert common matrix templates, integrals, summations, and Greek symbols with one click.",
      },
    ],
    shortcuts: [
      { key: "Ctrl / Cmd + C", action: "Copy LaTeX source code" },
      { key: "Tab", action: "Indent / autocomplete math blocks" },
    ],
    faqs: [
      {
        question: "Why use KaTeX instead of MathJax?",
        answer: "KaTeX is engineered specifically for blistering rendering speeds and synchronous layout, eliminating jarring visual flashes during typing.",
      },
      {
        question: "Does it support AMS-LaTeX syntax?",
        answer: "Yes. Standard LaTeX math environments, matrices, align blocks, and extensive math symbols are fully supported.",
      },
    ],
    author: { name: "Khan Academy & KaTeX Contributors", url: "https://katex.org" },
    license: "MIT",
    upstreamUrl: "https://github.com/KaTeX/KaTeX",
  },

  // 2. Color Palette Studio
  "color-palette-studio": {
    slug: "color-palette-studio",
    targetKeyword: "color palette generator",
    secondaryKeywords: ["wcag contrast checker web", "accessible color designer", "palette contrast tester"],
    headline: "Color Palette Studio & WCAG Contrast Checker",
    summary: "Professional design color palette generator with integrated WCAG 2.1 AA/AAA accessibility contrast auditing. Generate harmonious color schemes and verify legibility instantly.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Design System Color Harmony",
        description: "Create monochromatic, analogous, and complementary color ramps for web apps and brand design kits.",
      },
      {
        title: "WCAG Accessibility Compliance",
        description: "Instant contrast ratio calculation ensuring your text and background pairings pass WCAG 2.1 AA and AAA standards.",
      },
      {
        title: "One-Click Hex & CSS Export",
        description: "Copy hex codes, HSL variables, and Tailwind CSS configuration tokens with a single click.",
      },
    ],
    shortcuts: [
      { key: "Spacebar", action: "Randomize harmonious color palette" },
      { key: "Click Color", action: "Copy Hex code to clipboard" },
    ],
    faqs: [
      {
        question: "What is the WCAG 2.1 AA standard for contrast?",
        answer: "Normal text requires a contrast ratio of at least 4.5:1 against its background, while large text (18pt+ or bold 14pt+) requires at least 3:1.",
      },
      {
        question: "Can I export colors directly to Tailwind CSS?",
        answer: "Yes. The studio provides one-click export formats for Tailwind CSS variables, CSS custom properties, and raw JSON.",
      },
    ],
    author: { name: "Design Engineering Guild", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/color-palette",
  },

  // 3. Focus Flow (Pomodoro)
  "focus-flow": {
    slug: "focus-flow",
    targetKeyword: "pomodoro timer web",
    secondaryKeywords: ["focus timer with soundscape", "minimalist pomodoro online", "ambient white noise productivity"],
    headline: "Focus Flow - Minimalist Pomodoro & Soundscape Studio",
    summary: "Distraction-free Pomodoro productivity timer paired with synthesized ambient soundscapes (rain, cafe, white noise). Stay in deep flow state with zero tracking or clutter.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Deep Work Sessions",
        description: "Structure work into 25-minute focus sprints followed by restorative 5-minute intervals to avoid cognitive fatigue.",
      },
      {
        title: "Masking Background Distractions",
        description: "Blend soothing ambient rain, forest rustle, and pink noise synthesized natively via the Web Audio API.",
      },
      {
        title: "Zero Account Privacy",
        description: "Session counts and timer settings remain private in your browser; zero tracking cookies or ads.",
      },
    ],
    shortcuts: [
      { key: "Spacebar", action: "Start / pause active timer" },
      { key: "R", action: "Reset timer interval" },
    ],
    faqs: [
      {
        question: "What is the Pomodoro Technique?",
        answer: "A time-management method that alternates 25 minutes of focused work with 5 minutes of rest, boosting concentration and preventing burnout.",
      },
      {
        question: "Do the ambient sounds require an internet connection?",
        answer: "No. Sound generators are synthesized directly in real time using the browser Web Audio API, requiring zero audio streaming bandwidth.",
      },
    ],
    author: { name: "Productivity Tools Lab", url: "https://github.com/topics/pomodoro-timer" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/pomodoro-timer",
  },

  // 4. Regex Playground
  "regex-playground": {
    slug: "regex-playground",
    targetKeyword: "regex tester online",
    secondaryKeywords: ["regular expression visualizer", "javascript regex debugger", "client-side regex validator"],
    headline: "Regex Playground & Live Pattern Visualizer",
    summary: "Fast, 100% client-side regular expression tester and syntax highlighter. Test complex regex patterns with live capture group inspection and zero data transmission.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Safe Sensitive Log Debugging",
        description: "Test patterns against real-world production logs, API tokens, and user records with zero risk of server data leaks.",
      },
      {
        title: "Real-Time Group Breakdown",
        description: "Inspect named capture groups, non-capturing matches, and lookaheads with distinct color-coded highlighting.",
      },
      {
        title: "Instant Flag Toggling",
        description: "Easily switch Global (g), Case-Insensitive (i), Multiline (m), and DotAll (s) regex flags on the fly.",
      },
    ],
    shortcuts: [
      { key: "Ctrl / Cmd + Enter", action: "Format and test regex expression" },
      { key: "Esc", action: "Clear sample test string" },
    ],
    faqs: [
      {
        question: "Is it safe to test sensitive data here?",
        answer: "Yes, 100%. The regex engine runs entirely in your local browser JavaScript VM. Nothing is ever sent to a server.",
      },
      {
        question: "What regex flavor is supported?",
        answer: "It uses modern ECMAScript (JavaScript) regular expression standard, including unicode properties, lookbehinds, and named groups.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/regex-tester" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/regex-tester",
  },

  // 5. Chinese Typesetting Pangu (Chinese)
  "chinese-typesetting-pangu": {
    slug: "chinese-typesetting-pangu",
    targetKeyword: "中英文排版加空格",
    secondaryKeywords: ["中英文之间加空格", "盘古之白在线版", "文案排版工具", "中文英文空格工具"],
    headline: "中英文排版自动加空格工具 - 盘古之白 (pangu.js)",
    summary: "依据《中文文案排版指北》规范，自动在中文汉字与英文、数字之间添加空格（盘古之白），纠正全角半角标点混用，支持 Markdown 实时排版转换与一键复制。纯本地离线运行。",
    category: "tools",
    language: "zh",
    useCases: [
      {
        title: "公众号与文章文案排版",
        description: "一键消除汉字与英文字母、数字挤在一起的不适感，让文字版面疏密得当、更加易读。",
      },
      {
        title: "技术文档与 README 格式化",
        description: "自动规范 Markdown 中的中英文间距与标点符号，智能避开代码块和内联反引号。",
      },
      {
        title: "纯本地运行保障隐私安全",
        description: "所有文本排版均在浏览器本地内存中完成，任何文稿内容均不会上传到服务器。",
      },
    ],
    shortcuts: [
      { key: "Ctrl / Cmd + Enter", action: "立即执行中英文自动排版" },
      { key: "Ctrl / Cmd + C", action: "一键复制排版完成的正文" },
    ],
    faqs: [
      {
        question: "什么是「盘古之白」？",
        answer: "「盘古之白」是指在中文汉字与西文字符（英文字母、数字、半角符号）之间留出一个空格的间隙，使混排更清晰舒展、避免视觉粘连。",
      },
      {
        question: "排版时会弄乱代码块或链接吗？",
        answer: "不会。排版引擎会自动识别并保留 Markdown 代码块（```）、行内代码（`code`）以及 URL 链接不受影响。",
      },
    ],
    author: { name: "vinta & pangu.js contributors", url: "https://github.com/vinta/pangu.js" },
    license: "MIT",
    upstreamUrl: "https://github.com/vinta/pangu.js",
  },

  // 6. SVG Wave Generator
  "svg-wave-generator": {
    slug: "svg-wave-generator",
    targetKeyword: "svg wave generator",
    secondaryKeywords: ["svg shape divider", "wave generator web design", "smooth wave svg code"],
    headline: "SVG Wave & Curve Divider Generator",
    summary: "Design organic, smooth SVG wave dividers for modern landing pages. Customize wave complexity, amplitude, crest crests, and color fills with instant one-click SVG export.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Landing Page Section Transitions",
        description: "Create fluid, organic transitions between sections instead of flat rectangular dividers.",
      },
      {
        title: "Zero Heavy Assets",
        description: "Generates ultra-lightweight SVG vector paths (<1KB) instead of heavy PNG banner graphics.",
      },
      {
        title: "Dynamic Layering",
        description: "Adjust wave frequencies and amplitudes in real time to match brand aesthetic guidelines.",
      },
    ],
    shortcuts: [
      { key: "Randomize Button", action: "Generate unique wave geometry" },
    ],
    faqs: [
      {
        question: "How do I use the generated wave in my website?",
        answer: "Copy the SVG markup directly into your HTML, or paste it as an inline SVG background in your CSS section container.",
      },
      {
        question: "Is the generated SVG responsive?",
        answer: "Yes. All SVGs are generated with responsive viewBox attributes and 100% width scaling, fitting all screen sizes.",
      },
    ],
    author: { name: "SVG Design Tools Community", url: "https://github.com/topics/svg-generator" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/svg-generator",
  },

  // 7. JWT Debugger Offline
  "jwt-debugger-offline": {
    slug: "jwt-debugger-offline",
    targetKeyword: "offline jwt debugger",
    secondaryKeywords: ["jwt token inspector", "client side jwt decoder", "json web token claims viewer"],
    headline: "Offline JWT Inspector & Security Debugger",
    summary: "Secure 100% client-side JSON Web Token decoder and inspector. Color-coded Header, Payload, and Signature breakdown with expiration countdown without sending tokens to any server.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Sensitive Production Token Inspection",
        description: "Safely debug customer tokens and internal Bearer headers without violating data compliance or leaking credentials.",
      },
      {
        title: "Token Expiration & Timestamp Parsing",
        description: "Instantly converts Unix epoch timestamps (iat, exp, nbf) into human-readable local calendar dates and remaining minutes.",
      },
      {
        title: "Cryptographic Algorithm Audit",
        description: "Inspect algorithm headers (RS256, HS256, EdDSA) and identify insecure none-algorithm tokens.",
      },
    ],
    shortcuts: [
      { key: "Paste", action: "Instant automatic decoding" },
    ],
    faqs: [
      {
        question: "Is it safe to paste real customer JWT tokens here?",
        answer: "Yes. This tool is completely sandboxed on Pagepod and runs 100% in your local browser JavaScript engine. No HTTP requests or logs are ever made.",
      },
      {
        question: "Does it verify signatures?",
        answer: "It parses and validates structure and token expiration. Signature verification requires supplying your public key locally.",
      },
    ],
    author: { name: "Security Engineering Guild", url: "https://jwt.io" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/jwt",
  },

  // 8. Chinese Copywriting Formatter (Chinese)
  "chinese-copywriting-formatter": {
    slug: "chinese-copywriting-formatter",
    targetKeyword: "中文文案排版格式化",
    secondaryKeywords: ["中文文案排版指北", "中英文空格格式化", "文案排版工具", "标点符号规范工具"],
    headline: "中文文案排版格式化工具 - 遵循中文排版规范",
    summary: "依据《中文文案排版指北》规范，自动处理汉字与英文字母、数字之间的空格，智能纠正全角半角标点符号混用，支持多余空行清理与一键复制。",
    category: "tools",
    language: "zh",
    useCases: [
      {
        title: "文章与文案快速规范",
        description: "消除中英文、数字混排的拥挤感，让文段在手机与电脑屏幕上阅读更加舒适顺畅。",
      },
      {
        title: "标点与多余空行清理",
        description: "一键规范全角半角标点符号，清理文段中多余连续空行，保持文面整洁规范。",
      },
    ],
    shortcuts: [
      { key: "一键排版", action: "格式化输入框内全部文本" },
      { key: "一键复制", action: "将排版好的文本复制到剪贴板" },
    ],
    faqs: [
      {
        question: "排版规范依据是什么？",
        answer: "遵循开源规范《中文文案排版指北》，包括中英文之间空一格、全角中文标点与英文半角标点的正确用法。",
      },
      {
        question: "排版过程会上传我的文稿内容吗？",
        answer: "不会。整个排版过程完全在浏览器本地 JavaScript 运行，断网也可正常使用，不上传任何数据。",
      },
    ],
    author: { name: "sparanoid & chinese-copywriting-guidelines", url: "https://github.com/sparanoid/chinese-copywriting-guidelines" },
    license: "MIT",
    upstreamUrl: "https://github.com/sparanoid/chinese-copywriting-guidelines",
  },

  // 9. JSON Formatter & Validator
  "json-formatter-validator": {
    slug: "json-formatter-validator",
    targetKeyword: "json formatter online",
    secondaryKeywords: ["json validator", "json prettifier web", "offline json parser"],
    headline: "JSON Formatter & Tree Validator",
    summary: "Fast, 100% client-side JSON formatting, indentation, and syntax validation studio. Pretty-print messy JSON, minify payloads, and inspect nested structures with zero latency.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "API Payload Debugging",
        description: "Cleanly indent minified REST API responses and GraphQL queries for effortless readability.",
      },
      {
        title: "Data Payload Minification",
        description: "Strip unnecessary whitespace and indentation before deploying JSON config files or storing payloads.",
      },
      {
        title: "Syntax Error Pinpointing",
        description: "Identify missing commas, trailing commas, unquoted keys, and mismatched brackets with exact error feedback.",
      },
    ],
    shortcuts: [
      { key: "Paste", action: "Automatic instant validation and prettify" },
    ],
    faqs: [
      {
        question: "Is there any payload size limit?",
        answer: "It handles JSON payloads up to several megabytes smoothly within your browser memory.",
      },
      {
        question: "Are my JSON payloads logged or stored?",
        answer: "No. The entire formatting and parsing pipeline executes in client-side JavaScript. Zero network egress.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/json-formatter" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/json-formatter",
  },

  // 10. Markdown Editor Live
  "markdown-editor-live": {
    slug: "markdown-editor-live",
    targetKeyword: "markdown editor online",
    secondaryKeywords: ["markdown live previewer", "markdown word counter", "markdown to html converter"],
    headline: "Markdown Live Studio & Word Counter",
    summary: "Distraction-free split-pane Markdown writing environment with real-time HTML preview and reading statistics. Write documentation, articles, and notes with zero server latency.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Technical Writing & Documentation",
        description: "Draft GitHub READMEs, technical specifications, and release notes with instant side-by-side preview.",
      },
      {
        title: "Article Drafting with Word Count",
        description: "Track live word counts, character lengths, and estimated reading time as you type.",
      },
      {
        title: "One-Click HTML Export",
        description: "Copy rendered HTML directly into web CMS platforms, Notion, or email newsletters.",
      },
    ],
    shortcuts: [
      { key: "Copy HTML", action: "Copy converted HTML snippet" },
      { key: "Copy Markdown", action: "Copy raw Markdown text" },
    ],
    faqs: [
      {
        question: "Does it support tables and code blocks?",
        answer: "Yes, standard GitHub Flavored Markdown (GFM) elements including code blocks, blockquotes, lists, and headings are supported.",
      },
      {
        question: "Can I use it offline?",
        answer: "Yes. Once loaded, the editor functions completely offline without an internet connection.",
      },
    ],
    author: { name: "Open Source Markdown Lab", url: "https://github.com/topics/markdown-editor" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/markdown-editor",
  },

  // 11. CSS Gradient Generator
  "css-gradient-generator": {
    slug: "css-gradient-generator",
    targetKeyword: "css gradient generator",
    secondaryKeywords: ["gradient maker online", "linear gradient css", "radial gradient generator"],
    headline: "CSS Gradient Studio - Multi-Stop Gradient Maker",
    summary: "Visual design studio for creating modern linear and radial CSS gradients. Fine-tune angles, color stops, and opacity with instant CSS code generation.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Modern UI Background Design",
        description: "Craft subtle pastel backdrops, bold cyber accents, and rich dark-mode gradients for web hero sections.",
      },
      {
        title: "Multi-Stop Color Transitions",
        description: "Mix up to 3 harmonious color stops with precise angle adjustments and live canvas preview.",
      },
      {
        title: "Instant Production CSS Code",
        description: "Get production-ready CSS background declarations ready to paste into Tailwind CSS, CSS modules, or inline styles.",
      },
    ],
    shortcuts: [
      { key: "Angle Slider", action: "Rotate linear gradient direction" },
    ],
    faqs: [
      {
        question: "Are these gradients supported across all browsers?",
        answer: "Yes, standard CSS linear-gradient and radial-gradient syntax is supported across 100% of modern web browsers.",
      },
      {
        question: "Can I generate radial or angled gradients?",
        answer: "Yes, you can freely switch between radial mode and linear mode, rotating the angle slider from 0 to 360 degrees in real time.",
      },
    ],
    author: { name: "Web Design Engineering Guild", url: "https://github.com/topics/css-gradient" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/css-gradient",
  },

  // 12. Box Shadow Generator
  "box-shadow-generator": {
    slug: "box-shadow-generator",
    targetKeyword: "css box shadow generator",
    secondaryKeywords: ["box shadow preview", "css drop shadow tool", "elevation shadow generator"],
    headline: "CSS Box Shadow Studio & Elevation Generator",
    summary: "Interactive CSS box-shadow generator with real-time blur, spread, offset, and opacity controls. Design refined, modern elevation layers for cards and dialogs.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Subtle Card Elevation Design",
        description: "Replace harsh, muddy default shadows with soft, layered modern elevations inspired by Linear and Vercel design systems.",
      },
      {
        title: "Negative Spread Tight Shadows",
        description: "Experiment with negative spread values to create clean, grounded shadows without visual fuzz.",
      },
      {
        title: "One-Click Code Copy",
        description: "Copy exact box-shadow CSS parameters ready for UI component stylesheets.",
      },
    ],
    shortcuts: [
      { key: "Range Sliders", action: "Adjust X, Y, Blur, Spread and Opacity" },
    ],
    faqs: [
      {
        question: "What is the benefit of negative spread in box shadows?",
        answer: "Negative spread reduces the shadow size relative to the element, creating soft ambient grounding without sprawling outward.",
      },
      {
        question: "Can I use multiple shadow layers for softer diffusion?",
        answer: "Yes, the generated shadow uses balanced blur and spread values to create natural physical depth without harsh edges.",
      },
    ],
    author: { name: "Frontend Design Systems Collective", url: "https://github.com/topics/box-shadow" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/box-shadow",
  },

  // 13. Metronome & BPM Tap
  "metronome-bpm-tapper": {
    slug: "metronome-bpm-tapper",
    targetKeyword: "online metronome",
    secondaryKeywords: ["bpm tapper online", "tap tempo web", "musician metronome browser"],
    headline: "Online Metronome & Tap Tempo BPM Finder",
    summary: "Precision audio metronome and rhythm tap tempo calculator powered by the Web Audio API. Keep steady time from 40 to 240 BPM with visual beat indicators.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Instrument Practice & Timing",
        description: "Maintain steady tempo for guitar, piano, drums, and vocal scales with sample-accurate Web Audio clicks.",
      },
      {
        title: "Tap Tempo BPM Discovery",
        description: "Tap along to any song or beat to instantly calculate its exact musical beats per minute.",
      },
      {
        title: "Zero Distraction & Offline",
        description: "Runs purely in your browser without streaming audio delay or advertising interruptions.",
      },
    ],
    shortcuts: [
      { key: "Tap Button", action: "Tap tempo to determine song BPM" },
      { key: "Start / Stop", action: "Toggle continuous click track" },
    ],
    faqs: [
      {
        question: "How accurate is this web metronome?",
        answer: "It uses the high-precision Web Audio API hardware clock, ensuring microsecond accuracy without JavaScript thread timing jitter.",
      },
      {
        question: "Can I change the time signature or accent beat?",
        answer: "Yes, standard time signatures (4/4, 3/4, 2/4, 6/8) are supported with accented high-pitch clicks on the downbeat.",
      },
    ],
    author: { name: "Web Audio Community", url: "https://github.com/topics/metronome" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/metronome",
  },

  // 14. Diff Viewer Offline
  "diff-viewer-offline": {
    slug: "diff-viewer-offline",
    targetKeyword: "text diff checker online",
    secondaryKeywords: ["offline diff viewer", "code diff comparator", "side by side text comparison"],
    headline: "Offline Text Diff Checker & Code Comparator",
    summary: "Compare two text snippets or code blocks side-by-side with color-coded line diffing. 100% client-side privacy ensures your proprietary source code never leaves your device.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Code Review & Refactoring Comparison",
        description: "Quickly spot additions and removals between two versions of a function, config, or script.",
      },
      {
        title: "Legal & Contract Text Comparison",
        description: "Detect minute clause changes and edits between document revisions with complete confidential privacy.",
      },
      {
        title: "Zero Data Upload",
        description: "All LCS diffing math executes locally in your browser memory.",
      },
    ],
    shortcuts: [
      { key: "Compute Diff", action: "Calculate added and removed lines" },
    ],
    faqs: [
      {
        question: "Is it safe to compare confidential source code here?",
        answer: "Yes, absolutely. The diff algorithm executes entirely in your browser. Nothing is ever transmitted over the network.",
      },
      {
        question: "Does it highlight inline character differences or whole lines?",
        answer: "It displays color-coded line additions and deletions, making large diffs fast and easy to navigate.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/diff-viewer" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/diff-viewer",
  },

  // 15. QR Code Generator
  "qr-code-generator": {
    slug: "qr-code-generator",
    targetKeyword: "qr code generator online free",
    secondaryKeywords: ["offline qr code maker", "qr code png download", "client side qr generator"],
    headline: "Offline QR Code Generator with PNG Export",
    summary: "Generate clean, high-density QR codes for URLs, text, and contact information. 100% client-side rendering with instant lossless PNG download.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Website URL & Social Sharing",
        description: "Create quick scannable QR codes for marketing materials, posters, business cards, and slide decks.",
      },
      {
        title: "Wi-Fi & Network Credentials",
        description: "Encode Wi-Fi connection strings securely without exposing your passwords to third-party tracking generators.",
      },
      {
        title: "High Error-Correction Level",
        description: "Generates Level H (30% redundancy) QR codes that scan reliably even with partial smudges or tears.",
      },
    ],
    shortcuts: [
      { key: "Input Text", action: "Real-time QR regeneration" },
      { key: "Download Button", action: "Save crisp PNG image" },
    ],
    faqs: [
      {
        question: "Do these QR codes ever expire?",
        answer: "No. These are direct, static QR codes encoding the raw URL or text itself. They work permanently and independently of any server.",
      },
      {
        question: "What image resolution does the PNG export provide?",
        answer: "The PNG is exported at high resolution with crisp vector-like edges, suitable for print materials and digital displays.",
      },
    ],
    author: { name: "davidshimjs & Open Source Contributors", url: "https://github.com/davidshimjs/qrcodejs" },
    license: "MIT",
    upstreamUrl: "https://github.com/davidshimjs/qrcodejs",
  },

  // 16. Base64 Studio
  "base64-studio": {
    slug: "base64-studio",
    targetKeyword: "base64 encode decode online",
    secondaryKeywords: ["base64 converter web", "client side base64 tool", "offline base64 decoder"],
    headline: "Base64 Studio - Encode & Decode Online",
    summary: "Instant, bi-directional Base64 encoder and decoder with UTF-8 character support. Convert text and strings to and from Base64 with zero server roundtrips.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Web Development Data URIs",
        description: "Encode SVGs, small icons, and configuration values into Base64 strings ready for HTML/CSS embedding.",
      },
      {
        title: "API Authentication Header Decoding",
        description: "Inspect and decode Basic Auth credentials and encoded payload headers safely.",
      },
      {
        title: "Full UTF-8 Multi-Byte Support",
        description: "Correctly handles international characters, Chinese glyphs, and emojis without encoding corruption.",
      },
    ],
    shortcuts: [
      { key: "Segment Toggle", action: "Switch between Encode and Decode modes" },
      { key: "Copy Output", action: "Copy converted text to clipboard" },
    ],
    faqs: [
      {
        question: "Does it support Chinese characters and emojis?",
        answer: "Yes. It utilizes standard UTF-8 encoding wrappers around window.btoa and atob, guaranteeing flawless multi-byte character preservation.",
      },
      {
        question: "Can I encode large files or images into Base64?",
        answer: "Yes, you can paste text or small image data URIs directly to encode or decode them immediately in your browser.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/base64" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/base64",
  },

  // 17. Aspect Ratio Calculator
  "aspect-ratio-calculator": {
    slug: "aspect-ratio-calculator",
    targetKeyword: "aspect ratio calculator",
    secondaryKeywords: ["16:9 ratio calculator", "screen resolution aspect ratio", "video dimension calculator"],
    headline: "Aspect Ratio Calculator & Dimension Resizer",
    summary: "Calculate proportional width and height dimensions across standard aspect ratios (16:9, 4:3, 1:1, 21:9). Simplify custom pixel resolutions with Euclidean reduction.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Video Production & Thumbnail Sizing",
        description: "Quickly find exact 16:9 video resolutions (1080p, 1440p, 4K) when scaling custom project canvases.",
      },
      {
        title: "Responsive Web Image Proportions",
        description: "Calculate matching height dimensions when setting CSS aspect-ratio constraints to prevent layout shift (CLS).",
      },
      {
        title: "Custom Ratio Simplification",
        description: "Automatically compute greatest common divisors (GCD) to discover the true geometric ratio of arbitrary images.",
      },
    ],
    shortcuts: [
      { key: "Preset Buttons", action: "Apply 16:9, 4:3, 1:1, or 21:9 ratio" },
    ],
    faqs: [
      {
        question: "What is the aspect ratio of 1920x1080?",
        answer: "1920x1080 simplifies directly to 16:9, the universal standard for widescreen displays, YouTube videos, and modern monitors.",
      },
      {
        question: "How do I calculate responsive CSS aspect-ratio values?",
        answer: "Input your original width and height, and the calculator provides the reduced whole-number ratio (e.g. 16 / 9) for your CSS stylesheets.",
      },
    ],
    author: { name: "Video & Design Tools Collective", url: "https://github.com/topics/aspect-ratio" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/aspect-ratio",
  },

  // 18. URL Encoder Decoder
  "url-encoder-decoder": {
    slug: "url-encoder-decoder",
    targetKeyword: "url encoder decoder online",
    secondaryKeywords: ["percent encoding tool", "url query string decoder", "url encode characters"],
    headline: "URL Percent Encoder & Query Parser",
    summary: "Percent-encode special characters in URLs or decode obfuscated query parameters. Ensure URLs conform to RFC 3986 with instant client-side conversion.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Safe URL Parameter Construction",
        description: "Encode query string values containing spaces, ampersands, slashes, and symbols to prevent routing corruption.",
      },
      {
        title: "Debugging Tracking & Webhook URLs",
        description: "Decode complex nested redirect chains, UTM parameters, and OAuth callback URLs into legible strings.",
      },
      {
        title: "Zero Network Exposure",
        description: "Test sensitive query strings without logging them into third-party server proxies.",
      },
    ],
    shortcuts: [
      { key: "Mode Switch", action: "Toggle between Encode and Decode" },
    ],
    faqs: [
      {
        question: "Why do URLs need percent encoding?",
        answer: "Certain characters (like spaces, #, ?, &, =) have reserved structural meanings in the URI specification. Encoding them as %XX ensures they are parsed as literal data.",
      },
      {
        question: "Does it use encodeURI or encodeURIComponent?",
        answer: "It utilizes strict encodeURIComponent by default, safely encoding special query delimiters like &, =, and ? for URI parameters.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/url-encoder" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/url-encoder",
  },

  // 19. Lorem Ipsum Generator
  "lorem-ipsum-generator": {
    slug: "lorem-ipsum-generator",
    targetKeyword: "lorem ipsum generator online",
    secondaryKeywords: ["dummy text generator", "placeholder text maker", "latin text generator"],
    headline: "Lorem Ipsum Dummy Text Generator",
    summary: "Generate clean, randomized Latin placeholder text for UI mockups, wireframes, and typesetting. Select paragraph counts with one-click clipboard copying.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "UI & Layout Prototyping",
        description: "Fill cards, modals, and landing pages with natural-flowing dummy text to test visual hierarchy without distraction.",
      },
      {
        title: "Typography & Font Testing",
        description: "Inspect font legibility, line spacing, and paragraph wrap characteristics with balanced word lengths.",
      },
      {
        title: "Fast One-Click Copying",
        description: "Generate 1 to 10 paragraphs with instant clipboard copying.",
      },
    ],
    shortcuts: [
      { key: "Paragraph Selector", action: "Choose 1 to 10 paragraphs" },
      { key: "Copy Text", action: "Copy to clipboard" },
    ],
    faqs: [
      {
        question: "Where does Lorem Ipsum come from?",
        answer: "It originates from a 45 BC treatise on the theory of ethics by Cicero, titled 'de Finibus Bonorum et Malorum'.",
      },
      {
        question: "Can I choose between paragraphs, sentences, or words?",
        answer: "Yes, select the desired paragraph count and generate clean, standardized dummy text formatted for immediate pasting.",
      },
    ],
    author: { name: "Developer Tools Open Initiative", url: "https://github.com/topics/lorem-ipsum" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/lorem-ipsum",
  },

  // 20. Pixel Art Maker
  "pixel-art-maker": {
    slug: "pixel-art-maker",
    targetKeyword: "pixel art maker online",
    secondaryKeywords: ["sprite designer web", "16x16 pixel editor", "retro pixel art canvas"],
    headline: "Retro Pixel Art Studio (16x16)",
    summary: "Minimalist in-browser sprite editor for creating 16x16 retro pixel graphics. Choose from authentic 8-bit color swatches and export crisp PNG sprites with one click.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Game Dev Favicon & Sprite Prototyping",
        description: "Design game avatars, items, and site favicons on a clean 16x16 grid with zero bloat.",
      },
      {
        title: "Pixel Art Practice",
        description: "Relax and create retro pixel characters using calibrated 8-bit color palettes.",
      },
      {
        title: "Lossless PNG Export",
        description: "Download upscale-ready PNG graphics with transparent or solid background fills.",
      },
    ],
    shortcuts: [
      { key: "Click & Drag", action: "Paint grid pixels" },
      { key: "Color Swatch", action: "Select active paint color" },
    ],
    faqs: [
      {
        question: "Can I export the pixel art with transparent background?",
        answer: "Yes, unpainted pixels remain crisp and transparent, ready for game engines and web applications.",
      },
      {
        question: "Can I upscale the exported sprite without blur?",
        answer: "Yes, the exported PNG can be scaled with nearest-neighbor interpolation in any graphic editor or game engine without blurring pixel edges.",
      },
    ],
    author: { name: "Creative Coding Open Community", url: "https://github.com/topics/pixel-art" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/pixel-art",
  },

  // 21. ASCII Art Converter
  "ascii-art-converter": {
    slug: "ascii-art-converter",
    targetKeyword: "image to ascii art converter",
    secondaryKeywords: ["ascii text art generator", "photo to ascii web", "terminal ascii art"],
    headline: "Image to ASCII Art Converter",
    summary: "Convert photos and graphics into text-based ASCII character art in real time. 100% client-side canvas luminance mapping with instant copyable text output.",
    category: "tools",
    language: "en",
    useCases: [
      {
        title: "Terminal & CLI Banners",
        description: "Create striking ASCII logo banners for CLI developer tools, npm packages, and terminal splash screens.",
      },
      {
        title: "Code Comments & README Art",
        description: "Embed eye-catching text artwork into code docstrings, git commit headers, and GitHub READMEs.",
      },
      {
        title: "Zero Upload Privacy",
        description: "Your photos are processed entirely inside browser canvas memory without touching any external server.",
      },
    ],
    shortcuts: [
      { key: "Upload Image", action: "Load custom photo from disk" },
      { key: "Copy ASCII", action: "Copy ASCII characters to clipboard" },
    ],
    faqs: [
      {
        question: "How does image to ASCII conversion work?",
        answer: "The tool analyzes pixel brightness across a normalized grid and maps grayscale luminance to characters of corresponding visual density.",
      },
      {
        question: "Can I adjust the output character width or density?",
        answer: "Yes, the converter formats ASCII text output to standard terminal widths so it fits neatly into 80-column or 120-column viewports.",
      },
    ],
    author: { name: "Creative Coding Open Community", url: "https://github.com/topics/ascii-art" },
    license: "MIT",
    upstreamUrl: "https://github.com/topics/ascii-art",
  },
};
