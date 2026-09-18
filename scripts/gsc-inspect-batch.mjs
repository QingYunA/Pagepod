import fs from "node:fs";

const TARGET_URLS = [
  // 核心专题与分类
  "https://www.pagepod.dev/explore/games",
  "https://www.pagepod.dev/explore/visualization",
  "https://www.pagepod.dev/explore/prototypes",

  // 作品页 (首批重点与全量作品)
  "https://www.pagepod.dev/p/chinese-typesetting-pangu",
  "https://www.pagepod.dev/p/jwt-debugger-offline",
  "https://www.pagepod.dev/p/tic-tac-toe-ai",
  "https://www.pagepod.dev/p/sudoku-classic",
  "https://www.pagepod.dev/p/flappy-bird-canvas",
  "https://www.pagepod.dev/p/pixel-art-maker",
  "https://www.pagepod.dev/p/svg-wave-generator",
  "https://www.pagepod.dev/p/atari-breakout",
  "https://www.pagepod.dev/p/diff-viewer-offline",
  "https://www.pagepod.dev/p/box-shadow-generator",
  "https://www.pagepod.dev/p/zen-gomoku-ai",
  "https://www.pagepod.dev/p/solar-terms-lunar-clock",
  "https://www.pagepod.dev/p/matrix-digital-rain",
  "https://www.pagepod.dev/p/chinese-poetry-zen-card",
  "https://www.pagepod.dev/p/metronome-bpm-tapper",
  "https://www.pagepod.dev/p/synthwave-snake-arcade",
  "https://www.pagepod.dev/p/neon-2048",
  "https://www.pagepod.dev/p/color-palette-studio",
  "https://www.pagepod.dev/p/ink-fluid-mountain",
  "https://www.pagepod.dev/p/lorem-ipsum-generator",
  "https://www.pagepod.dev/p/css-gradient-generator",
  "https://www.pagepod.dev/p/markdown-editor-live",
  "https://www.pagepod.dev/p/reaction-time-test",
  "https://www.pagepod.dev/p/regex-playground",
  "https://www.pagepod.dev/p/focus-flow",
  "https://www.pagepod.dev/p/windows-95-minesweeper",
  "https://www.pagepod.dev/p/solar-system-orbit",
  "https://www.pagepod.dev/p/katex-math-studio",
  "https://www.pagepod.dev/p/threejs-solar-orrery",
  "https://www.pagepod.dev/p/webaudio-spectrum-visualizer",
  "https://www.pagepod.dev/p/ascii-art-converter",
  "https://www.pagepod.dev/p/json-formatter-validator",
  "https://www.pagepod.dev/p/hextris-arcade",
  "https://www.pagepod.dev/p/retro-dither-studio",
  "https://www.pagepod.dev/p/conways-game-of-life",
  "https://www.pagepod.dev/p/hyperspace-warp-speed",
  "https://www.pagepod.dev/p/2048-classic",
  "https://www.pagepod.dev/p/tearable-cloth-simulation",
  "https://www.pagepod.dev/p/harmonic-pendulum-waves",
  "https://www.pagepod.dev/p/url-encoder-decoder",
  "https://www.pagepod.dev/p/aspect-ratio-calculator",
  "https://www.pagepod.dev/p/base64-studio",
  "https://www.pagepod.dev/p/qr-code-generator",
  "https://www.pagepod.dev/p/webgl-fluid-simulation",
];

const resultsPath = "/tmp/gsc_batch_results.json";
let results = [];
if (fs.existsSync(resultsPath)) {
  try {
    results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  } catch {}
}

const task = await taskSpace(2);
const page = task.page("p1");

let quotaExceeded = false;

for (let i = 0; i < TARGET_URLS.length; i++) {
  const url = TARGET_URLS[i];
  console.log(`\n--------------------------------------------------`);
  console.log(`[${i + 1}/${TARGET_URLS.length}] Processing: ${url}`);

  const searchInput = 'input[aria-label="检查 pagepod.dev 中的任何网址"]';
  try {
    await page.waitForSelector(searchInput, { timeout: 10000 });
    await page.fill(searchInput, url);
    await page.press(searchInput, "Enter");
  } catch (err) {
    console.error(`Error entering URL:`, err.message);
    results.push({ url, status: "error", error: err.message, timestamp: new Date().toISOString() });
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    continue;
  }

  // Wait for inspection data
  await page.waitForTimeout(6000);
  const snapshot = await page.snapshot();

  if (snapshot.includes("网址已收录到 Google")) {
    console.log(`✓ 状态: 已收录到 Google`);
    results.push({ url, status: "already_indexed", timestamp: new Date().toISOString() });
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    await page.waitForTimeout(2000);
    continue;
  }

  if (snapshot.includes("网址尚未收录到 Google")) {
    console.log(`! 状态: 尚未收录`);
    if (quotaExceeded) {
      console.log(`- 配额已用尽，仅记录检查结果，跳过提交`);
      results.push({ url, status: "not_indexed_quota_skipped", timestamp: new Date().toISOString() });
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      await page.waitForTimeout(2000);
      continue;
    }

    try {
      console.log(`-> 点击“请求编入索引”...`);
      await page.click('loc=role:button[name*="请求编入索引"]', { timeout: 4000 });

      let requested = false;
      for (let w = 0; w < 10; w++) {
        await page.waitForTimeout(4000);
        const s = await page.snapshot();
        if (s.includes("已请求编入索引")) {
          requested = true;
          break;
        }
        if (s.includes("配额") || s.includes("超出") || s.includes("达到每日配额限制")) {
          quotaExceeded = true;
          break;
        }
      }

      if (requested) {
        console.log(`✓ 成功提交“已请求编入索引”`);
        results.push({ url, status: "indexing_requested", timestamp: new Date().toISOString() });
        try {
          await page.click('loc=role:button[name="关闭"]', { timeout: 3000 });
        } catch {}
      } else if (quotaExceeded) {
        console.log(`⚠ Google 提示达到每日配额限制`);
        results.push({ url, status: "quota_exceeded", timestamp: new Date().toISOString() });
        try {
          await page.click('loc=role:button[name="关闭"]', { timeout: 3000 });
        } catch {}
      } else {
        console.log(`? 提交超时或状态未变更`);
        results.push({ url, status: "timeout", timestamp: new Date().toISOString() });
      }
    } catch (btnErr) {
      console.log(`未找到请求按钮或点击异常:`, btnErr.message);
      results.push({ url, status: "button_error", error: btnErr.message, timestamp: new Date().toISOString() });
    }

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    await page.waitForTimeout(2500);
    continue;
  }

  console.log(`? 未识别页面状态`);
  results.push({ url, status: "unknown", timestamp: new Date().toISOString() });
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  await page.waitForTimeout(2000);
}

console.log(`\n==================================================`);
console.log(`Batch Inspection Complete! Results saved to ${resultsPath}`);
console.log(`==================================================`);
