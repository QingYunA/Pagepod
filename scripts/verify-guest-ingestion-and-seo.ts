import { scanForSecrets, scanAllSecrets } from "../src/lib/security/secret-guard";
import { checkRateLimit, resetRateLimiter } from "../src/lib/services/rate-limiter";
import {
  handleGuestUpload,
  claimGuestProjects,
  MAX_GUEST_UPLOAD_BYTES,
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

  // Test successful clean guest upload
  const cleanPost = await handleGuestUpload({
    htmlContent: `<!DOCTYPE html><html><head><title>Guest Calculator</title></head><body><h1>Calc 1.0</h1></body></html>`,
    clientIp: "10.0.0.3",
    slug: `test-guest-calc-${Date.now()}`,
  });
  assert(cleanPost.success === true, "Clean guest upload succeeds");
  assert(Boolean(cleanPost.claimToken && cleanPost.claimToken.length >= 32), "Issues high-entropy claimToken");
  assert(Boolean(cleanPost.slug), "Returns unique project slug");

  // Verify created project in database
  const createdProject = cleanPost.slug ? await getProjectBySlug(cleanPost.slug) : null;
  assert(createdProject !== null, "Project persisted to database");
  assert(createdProject?.visibility === "public", "Guest project is public by default");
  assert(createdProject?.userId?.startsWith("guest:") === true, "Project tagged with guest userId");


  console.log("\n=== 4. Claim Token Ownership Transition Tests ===");

  if (cleanPost.slug && cleanPost.claimToken) {
    const mockUser = {
      id: "registered_user_alice",
      email: "alice@example.com",
      role: "user" as const,
    };

    // Attempt claim with wrong token
    const invalidClaim = await claimGuestProjects(mockUser, [
      { slug: cleanPost.slug, claimToken: "wrong_token_1234567890" },
    ]);
    assert(invalidClaim.claimedCount === 0, "Rejects claim with invalid token");

    // Successful claim
    const validClaim = await claimGuestProjects(mockUser, [
      { slug: cleanPost.slug, claimToken: cleanPost.claimToken },
    ]);
    assert(validClaim.claimedCount === 1, "Transfers ownership to authenticated user");

    const claimedProject = await getProjectBySlug(cleanPost.slug);
    assert(claimedProject?.userId === mockUser.id, "Database userId updated to Alice's account");

    // Cleanup test project
    if (createdProject) {
      await deleteProject(createdProject.id);
    }
  }

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
