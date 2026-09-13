#!/usr/bin/env node

/**
 * Capture screenshots locally with Headless Chrome and upload to Pagepod.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ENDPOINT = process.env.PAGEPOD_ENDPOINT || "https://www.pagepod.dev";
const TOKEN = process.env.PAGEPOD_TOKEN || "pp_live_dfce69a60bed322da045b8bb6d689a814fb02d7dec6a5863";

const PROJECTS = [
  { id: "IyyJeNlNSs0w", slug: "chinese-copywriting-formatter", file: "examples/curated/chinese-copywriting-formatter.html" },
  { id: "R7pEfH1g2jvg", slug: "jwt-debugger-offline", file: "examples/curated/jwt-debugger-offline.html" },
  { id: "FFnWVavG3Pss", slug: "zen-gomoku-ai", file: "examples/curated/zen-gomoku-ai.html" },
  { id: "IDgekKZNXYtQ", slug: "synthwave-snake-arcade", file: "examples/curated/synthwave-snake-arcade.html" },
  { id: "tWhyxnvErI64", slug: "solar-terms-lunar-clock", file: "examples/curated/solar-terms-lunar-clock.html" },
  { id: "Hc0nKIuP0atA", slug: "webaudio-spectrum-visualizer", file: "examples/curated/webaudio-spectrum-visualizer.html" },
  { id: "kmqj7KqLtkMU", slug: "wechat-moment-mockup", file: "examples/curated/wechat-moment-mockup.html" },
  { id: "I64c2w1tN_qJ", slug: "dark-bento-saas-landing", file: "examples/curated/dark-bento-saas-landing.html" },
  { id: "bITuwKSAbvEL", slug: "ink-fluid-mountain", file: "examples/curated/ink-fluid-mountain.html" },
  { id: "h1N05hnc4w_V", slug: "hyperspace-warp-speed", file: "examples/curated/hyperspace-warp-speed.html" },
];

async function main() {
  console.log("==========================================");
  console.log("Capture & Upload Screenshots to Pagepod");
  console.log("==========================================\n");

  const screenshotsDir = path.resolve(process.cwd(), "public/screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    console.log(`[${i + 1}/${PROJECTS.length}] Processing '${p.slug}' (ID: ${p.id})...`);

    const htmlPath = path.resolve(process.cwd(), p.file);
    const pngPath = path.join(screenshotsDir, `${p.slug}.png`);

    // 1. Capture via Headless Chrome
    try {
      const cmd = `"${CHROME_PATH}" --headless --hide-scrollbars --virtual-time-budget=2000 --window-size=1280,720 --screenshot="${pngPath}" "file://${htmlPath}"`;
      execSync(cmd, { stdio: "ignore" });
      console.log(`    [OK] Captured screenshot: ${pngPath} (${fs.statSync(pngPath).size} bytes)`);
    } catch (err) {
      console.error(`    [ERROR] Chrome capture failed for ${p.slug}:`, err.message);
      continue;
    }

    // 2. Upload to Pagepod /api/projects/:id/screenshot
    try {
      const imgBuffer = fs.readFileSync(pngPath);
      const formData = new FormData();
      const blob = new Blob([imgBuffer], { type: "image/png" });
      formData.append("file", blob, `${p.slug}.png`);

      const targetUrl = `${ENDPOINT}/api/projects/${p.id}/screenshot`;
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error(`    [ERROR] Upload failed (${res.status}):`, data.error || data);
      } else {
        console.log(`    [OK] Uploaded to server: ${data.screenshotUrl}`);
      }
    } catch (err) {
      console.error(`    [ERROR] Network error uploading screenshot for ${p.slug}:`, err.message);
    }
  }

  console.log("\nFinished processing all screenshots!");
}

main().catch(console.error);
