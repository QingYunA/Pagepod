#!/usr/bin/env node

/**
 * Pagepod Ingestion Pipeline: Curated Open-Source Showcase
 * Ingests vetted standalone HTML applications into the live Pagepod catalog.
 *
 * Usage:
 *   node scripts/ingest-curated-projects.js --token <pp_live_...> [--endpoint <url>]
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  let endpoint = process.env.PAGEPOD_ENDPOINT || "https://www.pagepod.dev";
  let token = process.env.PAGEPOD_TOKEN || "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) {
      token = args[++i];
    } else if (args[i] === "--endpoint" && args[i + 1]) {
      endpoint = args[++i];
    }
  }

  return { endpoint, token };
}

const MANIFEST = [
  // 1. Tools (Chinese)
  {
    file: "examples/curated/chinese-copywriting-formatter.html",
    title: "中文文案排版美化器",
    slug: "chinese-copywriting-formatter",
    category: "tools",
    tags: ["tools", "chinese", "typesetting", "markdown", "opensource", "mit"],
    description: "依据《中文文案排版指北》自动在中英文之间添加盘古空格、规范全角半角标点、清理连续多余空行，并支持实时 Markdown 转换与一键复制。纯前端离线运行。(Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 2. Tools (English)
  {
    file: "examples/curated/jwt-debugger-offline.html",
    title: "Offline JWT Inspector & Security Debugger",
    slug: "jwt-debugger-offline",
    category: "tools",
    tags: ["tools", "jwt", "security", "developer", "offline", "opensource", "mit"],
    description: "Secure, 100% client-side JSON Web Token decoder and inspector. Color-coded Header/Payload/Signature breakdown, timestamp expiration detector, and structure validator without sending tokens to any remote server. (Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 3. Games (Chinese)
  {
    file: "examples/curated/zen-gomoku-ai.html",
    title: "水墨禅意五子棋",
    slug: "zen-gomoku-ai",
    category: "games",
    tags: ["games", "gomoku", "canvas", "ai", "chinese", "opensource", "mit"],
    description: "极简水墨东方美学五子棋。原生 HTML5 Canvas 渲染棋盘与墨晕落子微动效，内置 Minimax + 启发式评估的人机对战 AI，支持双人对弈、悔棋与落子历史记录。(Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 4. Games (English)
  {
    file: "examples/curated/synthwave-snake-arcade.html",
    title: "Synthwave Neon Arcade Snake",
    slug: "synthwave-snake-arcade",
    category: "games",
    tags: ["games", "arcade", "retro", "canvas", "synthwave", "opensource", "mit"],
    description: "80s Synthwave aesthetic retro arcade snake game. Features neon glowing trails, perspective grid horizon, particle explosions on food collection, dynamic combo multiplier, and synthesized 8-bit sound effects. (Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 5. Visualization (Chinese)
  {
    file: "examples/curated/solar-terms-lunar-clock.html",
    title: "二十四节气与农历日月运转罗盘",
    slug: "solar-terms-lunar-clock",
    category: "visualization",
    tags: ["visualization", "astronomy", "chinese", "calendar", "canvas", "opensource", "mit"],
    description: "融合中国古代历法与天体公转力学的动态罗盘。实时计算当前太阳黄经、二十四节气定位、月相盈亏阶段与农历干支纪日，支持拖拽旋转与时光穿梭预览。(Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 6. Visualization (English)
  {
    file: "examples/curated/webaudio-spectrum-visualizer.html",
    title: "WebAudio Realtime 3D Spectrum Analyzer",
    slug: "webaudio-spectrum-visualizer",
    category: "visualization",
    tags: ["visualization", "webaudio", "spectrum", "canvas", "interactive", "opensource", "mit"],
    description: "High-performance 60FPS audio frequency spectrum visualizer powered by the Web Audio API. Supports live microphone capture or built-in multi-oscillator polyphonic synth, with multiple rendering modes (3D Circular, Peak Bars, Oscilloscope Waveform). (Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 7. Prototypes (Chinese)
  {
    file: "examples/curated/wechat-moment-mockup.html",
    title: "社交动态与朋友圈排版原型设计器",
    slug: "wechat-moment-mockup",
    category: "prototypes",
    tags: ["prototypes", "ui", "mockup", "social", "chinese", "opensource", "mit"],
    description: "极速生成拟真社交动态与移动端信息流界面的高保真交互原型工具。支持自定义头像、昵称、正文、多图九宫格排版、点赞与评论互动，并可一键导出清晰无损图片。(Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 8. Prototypes (English)
  {
    file: "examples/curated/dark-bento-saas-landing.html",
    title: "Linear-Grade Dark Bento SaaS Showcase Landing",
    slug: "dark-bento-saas-landing",
    category: "prototypes",
    tags: ["prototypes", "landing-page", "bento-grid", "dark-mode", "linear", "opensource", "mit"],
    description: "A masterclass dark-mode SaaS product landing page prototype crafted with Linear and Vercel design aesthetics. Features a gapless responsive Bento Grid, interactive feature cards, micro-interactions, metrics counters, and responsive navigation. (Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 9. Animations (Chinese)
  {
    file: "examples/curated/ink-fluid-mountain.html",
    title: "水墨烟岚流体粒子动态山水",
    slug: "ink-fluid-mountain",
    category: "animations",
    tags: ["animations", "canvas", "particles", "chinese-ink", "art", "opensource", "mit"],
    description: "基于流体动力学与柏林噪声（Perlin Noise）算法的东方水墨动态山水长卷。上万颗粒子如烟如墨在群山层峦间流淌升腾，支持鼠标互动墨晕扰动、风力调控与意境画卷截图。(Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
  // 10. Animations (English)
  {
    file: "examples/curated/hyperspace-warp-speed.html",
    title: "3D Hyperspace Warp Speed Starfield",
    slug: "hyperspace-warp-speed",
    category: "animations",
    tags: ["animations", "canvas", "3d", "space", "starfield", "opensource", "mit"],
    description: "Hypnotic 3D warp speed starfield simulation. Thousands of hyper-accelerated stars streaking past the camera with perspective depth, chromatic aberration trails, interactive camera steering via pointer, and warp-drive activation trigger. (Provenance: Pagepod Open Source Initiative / License: MIT)",
  },
];

async function uploadProject(item, endpoint, token) {
  const filePath = path.resolve(process.cwd(), item.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Local file not found: ${filePath}`);
  }

  const htmlContent = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  const formData = new FormData();
  const blob = new Blob([htmlContent], { type: "text/html" });
  formData.append("file", blob, fileName);
  formData.append("title", item.title);
  formData.append("slug", item.slug);
  formData.append("category", item.category);
  formData.append("description", item.description);
  formData.append("visibility", "public");
  // Comma-separated tags string adhering to server validation schema
  formData.append("tags", item.tags.join(","));

  const targetUrl = new URL("/api/upload", endpoint).toString();

  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function verifyLiveUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status === 200 || res.status === 304;
  } catch {
    return false;
  }
}

async function main() {
  const { endpoint, token } = parseArgs();

  if (!token) {
    console.error("[ERROR] Missing API Token. Provide via --token <pp_live_...> or set PAGEPOD_TOKEN env variable.");
    process.exit(1);
  }

  console.log("=================================================");
  console.log("Pagepod Curated Ingestion Pipeline");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Token:    ${token.slice(0, 10)}...${token.slice(-4)}`);
  console.log(`Projects: ${MANIFEST.length} items queued`);
  console.log("=================================================\n");

  const results = [];

  for (let i = 0; i < MANIFEST.length; i++) {
    const item = MANIFEST[i];
    const indexStr = `[${i + 1}/${MANIFEST.length}]`;
    console.log(`${indexStr} Ingesting '${item.title}' (${item.slug})...`);

    try {
      const data = await uploadProject(item, endpoint, token);
      const isLive = await verifyLiveUrl(data.url);

      console.log(`    [OK] Ingested successfully`);
      console.log(`         ID:          ${data.id}`);
      console.log(`         Runner:      ${data.url}`);
      console.log(`         Sandbox:     ${data.rawUrl}`);
      console.log(`         Live Status: ${isLive ? "200 OK (Active)" : "Pending verification"}\n`);

      results.push({ item, success: true, data, isLive });
    } catch (err) {
      console.error(`    [ERROR] Failed to ingest '${item.slug}': ${err.message}\n`);
      results.push({ item, success: false, error: err.message });
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log("=================================================");
  console.log("Ingestion Pipeline Summary");
  console.log("=================================================");
  const successCount = results.filter((r) => r.success).length;
  console.log(`Total: ${results.length} | Succeeded: ${successCount} | Failed: ${results.length - successCount}\n`);

  results.forEach((r, idx) => {
    if (r.success) {
      console.log(`${idx + 1}. [${r.item.category.toUpperCase()}] ${r.item.title}`);
      console.log(`   Live URL: ${r.data.url}`);
    } else {
      console.log(`${idx + 1}. [FAILED] ${r.item.title}: ${r.error}`);
    }
  });

  if (successCount < results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal pipeline error:", err);
  process.exit(1);
});
