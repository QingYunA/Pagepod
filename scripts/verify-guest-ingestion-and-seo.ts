import { scanForSecrets, scanAllSecrets } from "../src/lib/security/secret-guard";
import { checkRateLimit, resetRateLimiter } from "../src/lib/services/rate-limiter";
import {
  handleGuestUpload,
  claimGuestProjects,
  MAX_GUEST_UPLOAD_BYTES,
  extractProjectAccessToken,
  verifyProjectAccessToken,
} from "../src/lib/services/guest-upload";
import { getProjectBySlug, deleteProject } from "../src/db";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=== 1. Secret Leak Guard Heuristic Tests ===");

  const cleanHtml = `<!DOCTYPE html><html><head><title>My Clean App</title></head><body><h1>Hello World</h1></body></html>`;
  assert(scanForSecrets(cleanHtml) === null, "Clean HTML produces no secret findings");

  const openaiHtml = `const client = new OpenAI({ apiKey: "sk-proj-1234567890abcdef1234567890" });`;
  const finding1 = scanForSecrets(openaiHtml);
  assert(finding1 !== null && finding1.type === "openai", "Detects OpenAI API key format");
  assert(Boolean(finding1?.snippet.includes("••••••••")), "Masks detected secret in snippet");

  const anthropicHtml = `const anthropic = new Anthropic({ apiKey: "sk-ant-api03-abcdef1234567890abcdef" });`;
  const finding2 = scanForSecrets(anthropicHtml);
  assert(finding2 !== null && finding2.type === "anthropic", "Detects Anthropic API key format");

  const awsHtml = `const s3 = new AWS.S3({ accessKeyId: "AKIAIOSFODNN7EXAMPLE" });`;
  const finding3 = scanForSecrets(awsHtml);
  assert(finding3 !== null && finding3.type === "aws", "Detects AWS Access Key ID format");

  const privKeyHtml = `const cert = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...";`;
  const finding4 = scanForSecrets(privKeyHtml);
  assert(finding4 !== null && finding4.type === "private_key", "Detects Private Key Certificate");


  console.log("\n=== 2. Sliding Window Rate Limiter Tests ===");
  resetRateLimiter();

  const testIp = "192.168.1.100";
  for (let i = 1; i <= 10; i++) {
    const res = checkRateLimit(testIp, 10, 60000);
    assert(res.allowed === true, `Rate limit allowed request ${i}/10`);
  }

  const blockedRes = checkRateLimit(testIp, 10, 60000);
  assert(blockedRes.allowed === false, "11th request is blocked by rate limit");
  assert(blockedRes.resetInSeconds > 0, "Provides positive reset countdown");

  resetRateLimiter();
  const resetRes = checkRateLimit(testIp, 10, 60000);
  assert(resetRes.allowed === true, "Rate limit map resets cleanly");


  console.log("\n=== 3. Guest Ingestion & Payload Ceiling Tests ===");
  resetRateLimiter();

  // Test payload size ceiling
  const oversizedHtml = "x".repeat(MAX_GUEST_UPLOAD_BYTES + 1024);
  let oversizedThrown = false;
  try {
    await handleGuestUpload({
      htmlContent: oversizedHtml,
      clientIp: "10.0.0.1",
    });
  } catch (err: any) {
    oversizedThrown = err.statusCode === 413 || err.message.includes("exceeds 2MB");
  }
  assert(oversizedThrown, "Strictly rejects guest upload exceeding 2MB (413 Payload Too Large)");

  // Test secret confirmation soft-gate
  const secretPost = await handleGuestUpload({
    htmlContent: `<!DOCTYPE html><html><body><script>const key = "sk-proj-supersecretkey1234567890";</script></body></html>`,
    clientIp: "10.0.0.2",
    title: "Secret App",
  });
  assert(secretPost.success === false, "Unconfirmed secret payload is gated");
  assert(secretPost.requiresConfirmation === true, "Requires user confirmation before publishing secret");
  assert(secretPost.secretFinding?.type === "openai", "Returns matched secret type metadata");

  // Test successful default guest upload (unlisted with token)
  const unlistedPost = await handleGuestUpload({
    htmlContent: `<!DOCTYPE html><html><head><title>Guest Calculator</title></head><body><h1>Calc 1.0</h1></body></html>`,
    clientIp: "10.0.0.3",
    slug: `test-guest-calc-${Date.now()}`,
  });
  assert(unlistedPost.success === true, "Clean guest upload succeeds");
  assert(Boolean(unlistedPost.claimToken && unlistedPost.claimToken.length >= 32), "Issues high-entropy claimToken");
  assert(Boolean(unlistedPost.accessToken && unlistedPost.accessToken.startsWith("sec_")), "Issues secret accessToken for unlisted upload");
  assert(Boolean(unlistedPost.url && unlistedPost.url.includes(`?token=${unlistedPost.accessToken}`)), "URL contains accessToken param");
  assert(Boolean(unlistedPost.slug), "Returns unique project slug");

  // Verify created project in database
  const createdProject = unlistedPost.slug ? await getProjectBySlug(unlistedPost.slug) : null;
  assert(createdProject !== null, "Project persisted to database");
  assert(createdProject?.visibility === "unlisted", "Guest project is unlisted by default");
  assert(createdProject?.userId?.startsWith("guest:") === true, "Project tagged with guest userId");

  // Test access token extraction and verification
  if (createdProject && unlistedPost.accessToken) {
    const extractedToken = extractProjectAccessToken(createdProject);
    assert(extractedToken === unlistedPost.accessToken, "Extracted access token matches issued token");

    const validAccess = verifyProjectAccessToken(createdProject, unlistedPost.accessToken);
    assert(validAccess === true, "Grants access with valid token");

    const invalidAccess = verifyProjectAccessToken(createdProject, "sec_wrongtoken123");
    assert(invalidAccess === false, "Blocks access with incorrect token");

    const emptyAccess = verifyProjectAccessToken(createdProject, undefined);
    assert(emptyAccess === false, "Blocks access without token");

    const creatorAccess = verifyProjectAccessToken(createdProject, undefined, true);
    assert(creatorAccess === true, "Grants access to project creator even without token");
  }

  // Test explicit public upload
  const publicPost = await handleGuestUpload({
    htmlContent: `<!DOCTYPE html><html><head><title>Public Showcase Game</title></head><body><h1>Game 1.0</h1></body></html>`,
    clientIp: "10.0.0.4",
    visibility: "public",
    slug: `test-guest-pub-${Date.now()}`,
  });
  assert(publicPost.success === true, "Explicit public guest upload succeeds");
  assert(publicPost.visibility === "public", "Project is marked as public");
  assert(publicPost.accessToken === undefined, "Public project has no accessToken");
  assert(Boolean(publicPost.url && !publicPost.url.includes("?token=")), "Public URL does not require token query");

  if (publicPost.slug) {
    const pubProject = await getProjectBySlug(publicPost.slug);
    assert(pubProject?.visibility === "public", "Persisted project visibility is public");
    if (pubProject) {
      await deleteProject(pubProject.id);
    }
  }


  console.log("\n=== 4. Claim Token Ownership Transition Tests ===");

  if (unlistedPost.slug && unlistedPost.claimToken) {
    const mockUser = {
      id: "registered_user_alice",
      email: "alice@example.com",
      role: "user" as const,
    };

    // Attempt claim with wrong token
    const invalidClaim = await claimGuestProjects(mockUser, [
      { slug: unlistedPost.slug, claimToken: "wrong_token_1234567890" },
    ]);
    assert(invalidClaim.claimedCount === 0, "Rejects claim with invalid token");

    // Successful claim
    const validClaim = await claimGuestProjects(mockUser, [
      { slug: unlistedPost.slug, claimToken: unlistedPost.claimToken },
    ]);
    assert(validClaim.claimedCount === 1, "Transfers ownership to authenticated user");
    assert(validClaim.resolvedSlugs.includes(unlistedPost.slug), "Marks claimed slug in resolvedSlugs");

    const claimedProject = await getProjectBySlug(unlistedPost.slug);
    assert(claimedProject?.userId === mockUser.id, "Database userId updated to Alice's account");

    // Idempotent retry on already claimed project
    const duplicateClaim = await claimGuestProjects(mockUser, [
      { slug: unlistedPost.slug, claimToken: unlistedPost.claimToken },
    ]);
    assert(duplicateClaim.claimedCount === 0, "Idempotent: duplicate claim does not increment count");
    assert(duplicateClaim.resolvedSlugs.includes(unlistedPost.slug), "Resolved slugs safely purges already owned project");

    // Cleanup test project
    if (claimedProject) {
      await deleteProject(claimedProject.id);
    }
  }

  console.log("\n=== 5. Authenticated Direct Ingestion Tests ===");
  const authUser = {
    id: "registered_user_bob",
    email: "bob@example.com",
    role: "user" as const,
  };

  const directPost = await handleGuestUpload({
    htmlContent: `<!DOCTYPE html><html><head><title>Bob Direct App</title></head><body><h1>Bob</h1></body></html>`,
    clientIp: "10.0.0.4",
    slug: `test-bob-direct-${Date.now()}`,
    currentUser: authUser,
  });

  assert(directPost.success === true, "Direct authenticated upload succeeds");
  assert(directPost.isDirectClaimed === true, "Marks result as isDirectClaimed");
  assert(directPost.claimToken === undefined, "Does not issue ephemeral claimToken for logged-in user");

  if (directPost.slug) {
    const bobProject = await getProjectBySlug(directPost.slug);
    assert(bobProject !== null, "Direct project persisted to database");
    assert(bobProject?.userId === authUser.id, "Project directly belongs to Bob");
    assert(!bobProject?.tags?.includes("guest-upload"), "Does not tag with guest-upload");

    if (bobProject) {
      await deleteProject(bobProject.id);
    }
  }

  console.log("\n=== 6. Umami Custom Event Telemetry Tests ===");
  const { trackEvent } = await import("../src/lib/analytics");

  // 1. SSR / headless safety without window object
  let ssrThrows = false;
  try {
    trackEvent("test_ssr_event", { foo: "bar" });
  } catch {
    ssrThrows = true;
  }
  assert(!ssrThrows, "trackEvent safely executes without window in SSR context");

  // 2. Client-side window.umami dispatch
  const recordedEvents: Array<{ name: string; data?: any }> = [];
  (globalThis as any).window = {
    umami: {
      track: (name: string, data?: any) => {
        recordedEvents.push({ name, data });
      },
    },
  };

  trackEvent("drop_html_success", { visibility: "unlisted", file_size_kb: 32 });
  assert(recordedEvents.length === 1, "Dispatches event to window.umami.track");
  assert(recordedEvents[0].name === "drop_html_success", "Preserves exact event name");
  assert(recordedEvents[0].data?.visibility === "unlisted", "Preserves event payload");

  // 3. Resilient silent fail when umami throws
  (globalThis as any).window.umami.track = () => {
    throw new Error("Ad-blocker / network blocked script");
  };
  let errorCaught = false;
  try {
    trackEvent("drop_html_failed", { reason: "test" });
  } catch {
    errorCaught = true;
  }
  assert(!errorCaught, "trackEvent safely catches and silences analytics runtime exceptions");

  delete (globalThis as any).window;

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
