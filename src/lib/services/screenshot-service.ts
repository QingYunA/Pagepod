import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { getProjectBySlug, updateProject } from "@/db";
import { getStorage } from "@/lib/storage";
import { getJwtSecret } from "@/lib/secret-policy";
import { getSiteUrl } from "@/lib/site-url";

const execFileAsync = promisify(execFile);

// --- Ports & Adapters Architecture ---

/**
 * Pure rendering port interface for converting HTML content to a 1280x720 PNG buffer.
 */
export interface ScreenshotRenderer {
  render(htmlContent: string, options?: { publicUrl?: string }): Promise<Buffer | null>;
}

export function findChromePath(): string | null {
  if (process.env.CHROME_PATH && fsSync.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const macDefault = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fsSync.existsSync(macDefault)) {
    return macDefault;
  }

  const candidates = [
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];

  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }

  try {
    const whichChrome = execSync("which google-chrome || which chromium || which chrome", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (whichChrome && fsSync.existsSync(whichChrome)) return whichChrome;
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Local Headless Chrome / Chromium Adapter (Fast, High-Fidelity, Zero-Cost).
 */
export class HeadlessChromeRenderer implements ScreenshotRenderer {
  constructor(private readonly chromePath = findChromePath()) {}

  isAvailable(): boolean {
    return Boolean(this.chromePath);
  }

  async render(htmlContent: string): Promise<Buffer | null> {
    if (!this.chromePath) return null;

    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tempHtmlPath = path.join(tempDir, `pagepod_cap_${timestamp}.html`);
    const tempScreenshotPath = path.join(tempDir, `pagepod_cap_${timestamp}.png`);

    try {
      await fs.writeFile(tempHtmlPath, htmlContent, "utf-8");

      await execFileAsync(
        this.chromePath,
        [
          "--headless",
          "--hide-scrollbars",
          "--virtual-time-budget=1500",
          `--screenshot=${tempScreenshotPath}`,
          "--window-size=1280,720",
          `file://${tempHtmlPath}`,
        ],
        { timeout: 10000 }
      );

      if (fsSync.existsSync(tempScreenshotPath)) {
        return await fs.readFile(tempScreenshotPath);
      }
      return null;
    } catch (err) {
      console.warn("[HeadlessChromeRenderer] Capture failed:", err instanceof Error ? err.message : err);
      return null;
    } finally {
      try {
        await Promise.allSettled([
          fs.unlink(tempHtmlPath),
          fs.unlink(tempScreenshotPath),
        ]);
      } catch {
        // Ignore unlink error
      }
    }
  }
}

/**
 * Cloud Microlink Renderer Fallback for environments lacking Headless Chrome.
 */
export class CloudFallbackRenderer implements ScreenshotRenderer {
  async render(_htmlContent: string, options?: { publicUrl?: string }): Promise<Buffer | null> {
    const publicUrl = options?.publicUrl;
    if (!publicUrl) return null;

    try {
      const cloudApiUrl = `https://api.microlink.io?url=${encodeURIComponent(publicUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=720`;
      const res = await fetch(cloudApiUrl, {
        headers: { "user-agent": "Pagepod-AutoScreenshot/1.0" },
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuffer);
        if (imgBuffer.length > 1000) {
          return imgBuffer;
        }
      }
      return null;
    } catch (err) {
      console.warn("[CloudFallbackRenderer] Cloud capture failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }
}

/**
 * Composite Auto-Renderer: prefers local Headless Chrome; falls back to cloud for accessible URLs.
 */
export class AutoScreenshotRenderer implements ScreenshotRenderer {
  private local = new HeadlessChromeRenderer();
  private cloud = new CloudFallbackRenderer();

  async render(htmlContent: string, options?: { publicUrl?: string }): Promise<Buffer | null> {
    if (this.local.isAvailable()) {
      const buffer = await this.local.render(htmlContent);
      if (buffer) return buffer;
    }
    if (options?.publicUrl) {
      return await this.cloud.render(htmlContent, options);
    }
    return null;
  }
}

const defaultRenderer = new AutoScreenshotRenderer();

/**
 * Renders a 1280x720 screenshot buffer from raw HTML markup.
 * Pure rendering function with zero database or storage side-effects.
 */
export async function renderProjectScreenshot(
  htmlContent: string,
  publicUrl?: string
): Promise<Buffer | null> {
  return defaultRenderer.render(htmlContent, { publicUrl });
}

/**
 * Stores a screenshot PNG buffer under the project's storage directory.
 * Returns the public relative asset URL.
 */
export async function saveProjectScreenshotFile(
  storagePrefix: string,
  slug: string,
  imageBuffer: Buffer
): Promise<string> {
  const storage = getStorage();
  const screenshotStoragePath = `${storagePrefix}/screenshot.png`;
  await storage.uploadFile(screenshotStoragePath, imageBuffer, "image/png");
  return `/raw/${slug}/screenshot.png?v=${Date.now()}`;
}

// --- Legacy & Standalone Orchestration (For CLI scripts and direct endpoints) ---

function revalidateProjectViews(slug: string) {
  try {
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/workspace");
    revalidatePath(`/p/${slug}`);
  } catch {
    // Non-fatal if outside Next.js request context
  }
}

/**
 * Generates an HMAC-signed, time-limited internal token allowing authorized headless
 * screenshot services (e.g. cloud Microlink) to render public projects undergoing review.
 */
export function generateSnapshotToken(slug: string): string {
  const secret = getJwtSecret() || new TextEncoder().encode("internal-snapshot-token-salt");
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${slug}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${timestamp}.${hmac}`;
}

export function verifySnapshotToken(slug: string, token: string): boolean {
  try {
    const [timestampStr, hmac] = token.split(".");
    if (!timestampStr || !hmac) return false;
    if (hmac.length !== 64 || !/^[0-9a-f]{64}$/i.test(hmac)) return false;
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    // Valid for 10 minutes to allow cloud rendering roundtrip
    if (Math.abs(now - timestamp) > 600) return false;
    const secret = getJwtSecret() || new TextEncoder().encode("internal-snapshot-token-salt");
    const data = `${slug}:${timestamp}`;
    const expectedHmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
}

/**
 * Convenience orchestrator for capturing, committing, and returning image buffer.
 */
export async function captureProjectScreenshotWithBuffer(
  slug: string
): Promise<{ screenshotUrl: string; imageBuffer: Buffer } | null> {
  const project = await getProjectBySlug(slug);
  if (!project) {
    console.warn(`[ScreenshotService] Project not found for slug: ${slug}`);
    return null;
  }

  const storage = getStorage();
  const entryFilePath = `${project.storagePrefix}/${project.entryPath}`;
  const file = await storage.getFile(entryFilePath);
  if (!file) {
    console.warn(`[ScreenshotService] Entry HTML not found at: ${entryFilePath}`);
    return null;
  }

  const htmlContent = Buffer.isBuffer(file.data)
    ? file.data.toString("utf-8")
    : String(file.data);

  const siteUrl = getSiteUrl();
  let publicUrl: string | undefined;
  if (project.visibility === "public") {
    const snapshotToken = generateSnapshotToken(project.slug);
    publicUrl = `${siteUrl}/raw/${project.slug}?_snapshot_token=${encodeURIComponent(snapshotToken)}`;
  }

  const imageBuffer = await renderProjectScreenshot(htmlContent, publicUrl);
  if (!imageBuffer) return null;

  const newScreenshotUrl = await saveProjectScreenshotFile(
    project.storagePrefix,
    project.slug,
    imageBuffer
  );

  await updateProject(project.id, { screenshotUrl: newScreenshotUrl });
  revalidateProjectViews(project.slug);
  return { screenshotUrl: newScreenshotUrl, imageBuffer };
}

export async function captureProjectScreenshot(slug: string): Promise<string | null> {
  const result = await captureProjectScreenshotWithBuffer(slug);
  return result?.screenshotUrl ?? null;
}

/**
 * Saves a custom image upload as the project's screenshot poster.
 */
export async function saveCustomScreenshot(
  slug: string,
  imageBuffer: Buffer
): Promise<string | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;

  const newScreenshotUrl = await saveProjectScreenshotFile(
    project.storagePrefix,
    project.slug,
    imageBuffer
  );

  await updateProject(project.id, { screenshotUrl: newScreenshotUrl });
  revalidateProjectViews(project.slug);
  return newScreenshotUrl;
}
