import { isCloudMode, isSelfHosted } from "../src/lib/supabase/server";
import { isClientCloudMode, isClientSelfHosted } from "../src/lib/supabase/client";
import { assertCanCreateProject, createCheckoutOrder, captureCheckoutOrder, MAX_SELFHOST_UPLOAD_BYTES } from "../src/lib/services/billing-service";
import { ProjectForbiddenError, ProjectPayloadTooLargeError } from "../src/lib/services/project-service";
import type { CurrentUser } from "../src/lib/auth";
import { POST as createOrderRoute } from "../src/app/api/payments/paypal/create-order/route";
import { POST as captureOrderRoute } from "../src/app/api/payments/paypal/capture-order/route";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function runTests() {
  console.log("\n=== 1. System Mode Resolution Tests (Default Self-Hosted) ===");

  // Save current env
  const origAppMode = process.env.APP_MODE;
  const origNextPublicAppMode = process.env.NEXT_PUBLIC_APP_MODE;
  const origSbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origSbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    // 1.1 Unset mode should default to selfhost
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    assert(isSelfHosted() === true, "Unconfigured environment defaults to isSelfHosted === true");
    assert(isCloudMode() === false, "Unconfigured environment defaults to isCloudMode === false");
    assert(isClientSelfHosted() === true, "Client unconfigured environment defaults to isClientSelfHosted === true");
    assert(isClientCloudMode() === false, "Client unconfigured environment defaults to isClientCloudMode === false");

    // 1.2 Presence of Supabase URL without explicit APP_MODE=cloud must NOT switch to cloud
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
    assert(isSelfHosted() === true, "Supabase credentials present without APP_MODE=cloud keeps isSelfHosted === true");
    assert(isCloudMode() === false, "Supabase credentials present without APP_MODE=cloud keeps isCloudMode === false");

    // 1.3 Explicit APP_MODE=cloud activates cloud mode
    process.env.APP_MODE = "cloud";
    process.env.NEXT_PUBLIC_APP_MODE = "cloud";
    assert(isCloudMode() === true, "Explicit APP_MODE=cloud with credentials activates isCloudMode === true");
    assert(isSelfHosted() === false, "Explicit APP_MODE=cloud sets isSelfHosted === false");
    assert(isClientCloudMode() === true, "Client activates isClientCloudMode === true when explicit");

    // 1.4 Explicit APP_MODE=cloud without credentials falls back to selfhost (safe fallback)
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert(isSelfHosted() === true, "APP_MODE=cloud without credentials safely falls back to isSelfHosted === true");
  } finally {
    // Restore env to default selfhost for remaining tests
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    if (origSbUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origSbUrl;
    if (origSbKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origSbKey;
  }

  console.log("\n=== 2. Sovereign Quotas & Unconstrained Limits Tests ===");

  const testUser: CurrentUser = {
    id: "user-test-1",
    email: "test@example.com",
    role: "user",
    planTier: "free",
  };

  // 2.1 File upload of 15MB in self-hosted mode (bypasses Free 2MB limit)
  let uploadErr: unknown = null;
  try {
    await assertCanCreateProject(testUser, 15 * 1024 * 1024);
  } catch (err) {
    uploadErr = err;
  }
  assert(uploadErr === null, "15MB upload allowed in self-hosted mode without Free 2MB ceiling");

  // 2.2 File upload exceeding maximum server limit (> 100MB) throws ProjectPayloadTooLargeError
  let oversizedErr: unknown = null;
  try {
    await assertCanCreateProject(testUser, (MAX_SELFHOST_UPLOAD_BYTES + 1024 * 1024));
  } catch (err) {
    oversizedErr = err;
  }
  assert(oversizedErr instanceof ProjectPayloadTooLargeError, "Uploads exceeding MAX_SELFHOST_UPLOAD_BYTES are gracefully guarded");

  console.log("\n=== 3. Commercial Decoupling & Payment Short-Circuit Tests ===");

  // 3.1 createCheckoutOrder throws Forbidden in self-hosted mode
  let checkoutErr: unknown = null;
  try {
    await createCheckoutOrder(testUser, "pro");
  } catch (err) {
    checkoutErr = err;
  }
  assert(checkoutErr instanceof ProjectForbiddenError, "createCheckoutOrder blocked in self-hosted mode");
  assert((checkoutErr as ProjectForbiddenError)?.message?.includes("Commercial payment is disabled"), "Appropriate error message for disabled payment");

  // 3.2 captureCheckoutOrder throws Forbidden in self-hosted mode
  let captureErr: unknown = null;
  try {
    await captureCheckoutOrder(testUser, "order-xyz");
  } catch (err) {
    captureErr = err;
  }
  assert(captureErr instanceof ProjectForbiddenError, "captureCheckoutOrder blocked in self-hosted mode");

  console.log("\n=== 4. HTTP Payment Endpoints Short-Circuit (404 Not Found) ===");

  // 4.1 create-order route returns 404 in self-hosted mode
  const dummyReq = new Request("http://localhost:3000/api/payments/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planTier: "pro" }),
  });
  const createRes = await createOrderRoute(dummyReq);
  assert(createRes.status === 404, "PayPal create-order HTTP endpoint returns 404 in self-hosted mode");

  // 4.2 capture-order route returns 404 in self-hosted mode
  const dummyCaptureReq = new Request("http://localhost:3000/api/payments/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: "dummy-123" }),
  });
  const captureRes = await captureOrderRoute(dummyCaptureReq);
  assert(captureRes.status === 404, "PayPal capture-order HTTP endpoint returns 404 in self-hosted mode");

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
