/**
 * Mainland China Direct Connectivity Probe
 * 
 * Bypasses local TUN/VPN proxies by binding directly to the physical network interface (e.g. en0).
 * Measures real-world TCP connect time, TLS handshake time, and TTFB from mainland China networks.
 * 
 * Usage:
 *   bun run scripts/probe-direct.ts
 *   npm run probe:direct
 */

import { execSync } from "node:child_process";

// Discover default physical network interface (e.g. en0)
function getPhysicalInterface(): string {
  try {
    const routeOut = execSync("route get default", { encoding: "utf-8" });
    const match = routeOut.match(/interface:\s+([a-zA-Z0-9]+)/);
    if (match && match[1] && !match[1].startsWith("utun") && !match[1].startsWith("bridge")) {
      return match[1];
    }
  } catch {}
  return "en0";
}

const iface = getPhysicalInterface();
console.log(`\n🌐 Launching Mainland Direct Connectivity Probes (Bound to: ${iface})\n`);

// 1. Check Public IP & Egress Location
try {
  const ipOut = execSync(`curl -s --interface ${iface} --max-time 5 https://myip.ipip.net 2>/dev/null || true`, {
    encoding: "utf-8",
  }).trim();
  if (ipOut) {
    console.log(`📍 Egress Route: ${ipOut}`);
  }
} catch {}

const targets = [
  { name: "Homepage SSR", url: "https://www.pagepod.dev/" },
  { name: "API Projects", url: "https://www.pagepod.dev/api/projects" },
  { name: "Raw Sandbox", url: "https://www.pagepod.dev/raw/chinese-typesetting-pangu/index.html" },
  { name: "Umami Telemetry", url: "https://umami.daydayup.lat/script.js" },
];

const formatStr = (
  "{"
  + '"http_code": %{http_code},'
  + '"remote_ip": "%{remote_ip}",'
  + '"time_connect": %{time_connect},'
  + '"time_appconnect": %{time_appconnect},'
  + '"time_starttransfer": %{time_starttransfer},'
  + '"time_total": %{time_total},'
  + '"size_download": %{size_download}'
  + "}"
);

console.log(`\n${"Target".padEnd(20)} | ${"Status".padEnd(6)} | ${"IP".padEnd(15)} | ${"TCP".padStart(7)} | ${"TLS".padStart(7)} | ${"TTFB".padStart(7)} | ${"Total".padStart(7)} | Colo / Notes`);
console.log("-".repeat(95));

let hasErrors = false;

for (const target of targets) {
  try {
    const curlCmd = `curl -s -L --max-redirs 3 --interface ${iface} --max-time 10 -w '${formatStr}' -o /dev/null -D - '${target.url}'`;
    const output = execSync(curlCmd, { encoding: "utf-8" });

    // Extract headers and JSON timing output
    const lastBrace = output.lastIndexOf("}");
    const firstBrace = output.lastIndexOf("{", lastBrace);
    const jsonStr = output.slice(firstBrace, lastBrace + 1);
    const headers = output.slice(0, firstBrace);

    const data = JSON.parse(jsonStr);

    let cfRay = "";
    for (const line of headers.split("\n")) {
      if (line.toLowerCase().startsWith("cf-ray:")) {
        cfRay = line.split(":").slice(1).join(":").trim();
      }
    }

    const tcpMs = `${(data.time_connect * 1000).toFixed(0)}ms`.padStart(7);
    const tlsMs = `${Math.max(0, (data.time_appconnect - data.time_connect) * 1000).toFixed(0)}ms`.padStart(7);
    const ttfbMs = `${(data.time_starttransfer * 1000).toFixed(0)}ms`.padStart(7);
    const totalMs = `${(data.time_total * 1000).toFixed(0)}ms`.padStart(7);

    const statusStr = data.http_code === 200 ? "200 OK" : `${data.http_code}`;
    console.log(
      `${target.name.padEnd(20)} | ${statusStr.padEnd(6)} | ${data.remote_ip.padEnd(15)} | ${tcpMs} | ${tlsMs} | ${ttfbMs} | ${totalMs} | ${cfRay || "-"}`
    );
  } catch (err: any) {
    hasErrors = true;
    console.log(`${target.name.padEnd(20)} | FAIL   | -               | -       | -       | -       | -       | ${err?.message?.split("\n")[0] || "Timeout/RST"}`);
  }
}

console.log("\n========================================================");
if (!hasErrors) {
  console.log("✓ All mainland direct targets are reachable and responsive.");
} else {
  console.log("⚠️ Some targets experienced connection issues or timeouts.");
}
console.log("========================================================\n");
