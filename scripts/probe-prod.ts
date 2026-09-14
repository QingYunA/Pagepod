/**
 * Production Health & Data Integrity Probe
 * 
 * Executes fast, deterministic HTTP probes against production deployment:
 * 1. /api/projects API health and project count invariant (count >= 10)
 * 2. Homepage SSR rendering and showcase payload integrity
 * 3. Gateway /raw/[slug] security sandbox CSP headers invariant
 */

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
if (proxyUrl) {
  try {
    const { setGlobalDispatcher, ProxyAgent } = require("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch {
    // Non-fatal if undici is not available
  }
}

const targetOrigin = process.argv[2] || process.env.PROD_URL || "https://www.pagepod.dev";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
    if (detail) console.error(`    -> ${detail}`);
  }
}

async function probe() {
  console.log(`\n🔍 Launching Production Probes against: ${targetOrigin}\n`);

  let sampleSlug = "chinese-poetry-zen-card";

  // Probe 1: /api/projects metadata query and quantity invariant
  try {
    const t0 = Date.now();
    const res = await fetch(`${targetOrigin}/api/projects`, {
      headers: { "User-Agent": "Pagepod-Health-Probe/1.0" },
    });
    const duration = Date.now() - t0;
    assert(res.status === 200, `GET /api/projects returns 200 OK (${duration}ms)`, `Status was ${res.status}`);

    const json = (await res.json()) as any;
    assert(json.success === true, "Response JSON has success: true");
    assert(
      typeof json.count === "number" && json.count >= 10,
      `Showcase project count >= 10 (Actual: ${json.count})`,
      `Expected at least 10 projects, but got ${json.count}`
    );

    if (Array.isArray(json.projects) && json.projects.length > 0) {
      const first = json.projects[0];
      sampleSlug = first.slug || sampleSlug;
      assert(
        Boolean(first.id && first.title && first.slug && first.visibility === "public"),
        `First project has valid structure and visibility === 'public' (${first.slug})`
      );
    }
  } catch (err: any) {
    assert(false, "GET /api/projects probe threw error", err?.message);
  }

  // Probe 2: Homepage SSR rendering and showcase hydration payload
  try {
    const t0 = Date.now();
    const res = await fetch(`${targetOrigin}/`, {
      headers: { "User-Agent": "Pagepod-Health-Probe/1.0" },
    });
    const duration = Date.now() - t0;
    assert(res.status === 200, `GET / returns 200 OK (${duration}ms)`, `Status was ${res.status}`);

    const html = await res.text();
    assert(
      html.includes("initialProjects") || html.includes(sampleSlug),
      `Homepage SSR payload contains showcase project data (${sampleSlug})`
    );
    assert(
      html.includes("Pagepod") || html.includes("HTML"),
      "Homepage HTML contains primary branding metadata"
    );
  } catch (err: any) {
    assert(false, "GET / homepage probe threw error", err?.message);
  }

  // Probe 3: /raw/[slug] Security Sandbox CSP Headers Invariant
  try {
    const t0 = Date.now();
    const rawUrl = `${targetOrigin}/raw/${sampleSlug}/index.html`;
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "Pagepod-Health-Probe/1.0" },
    });
    const duration = Date.now() - t0;
    assert(
      res.status === 200 || res.status === 304,
      `GET /raw/${sampleSlug} returns valid status (${res.status} in ${duration}ms)`
    );

    const csp = res.headers.get("content-security-policy") || "";
    assert(
      csp.includes("sandbox") && csp.includes("allow-scripts"),
      "Raw endpoint enforces CSP sandbox directive",
      `Actual CSP: ${csp.slice(0, 80)}...`
    );

    const nosniff = res.headers.get("x-content-type-options") || "";
    assert(nosniff === "nosniff", "Raw endpoint enforces X-Content-Type-Options: nosniff");
  } catch (err: any) {
    assert(false, "GET /raw/[slug] security probe threw error", err?.message);
  }

  console.log(`\n========================================`);
  console.log(`Probe Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

probe();
